"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCampaignStore } from "@/stores/campaign";
import { getLayerType } from "@/layers/registry";
import type { LayerAdapter } from "@/layers/types";
// import type { RenderEnv } from '@/layers/types';
import RenderService from "@/render/service";
import type { SceneFrame } from "@/render/types";
import { useLayoutStore } from "@/stores/layout";
import { useSelectionStore } from "@/stores/selection";
// import { axialKey } from "@/layers/hex-utils";
import { AppAPI } from "@/appapi";
import {
  getCursorForTool,
  getSceneAdapter,
  composeEnv,
  getTool,
} from "@/plugin/loader";
import type { ToolContext } from "@/plugin/types";
import { findNearestCorner } from "@/lib/outline/geometry";
import { cornersEqual } from "@/lib/outline/types";
import type { OutlineState } from "@/lib/outline/types";
import type { Layout } from "@/lib/hex";
// import { createPerlinNoise } from "@/lib/noise";
import { resolvePalette } from "@/stores/selectors/palette";
import { debugEnabled } from "@/lib/debug";
import { useCampaignStore as campaignStoreRaw } from "@/stores/campaign";
import { computePaperRect, PaperAspect } from "@/app/scene/geometry";
import ScaleBar from "@/components/map/scale-bar";
import type { HexgridState } from "@/layers/adapters/hexgrid";
import { useActiveScaleConfig } from "@/stores/selectors/scale";

export const CanvasViewport: React.FC = () => {
  const campaignSnapshot = useCampaignStore((s) => s.current);
  const campaignId = campaignSnapshot?.id ?? null;
  const activeMapId = campaignSnapshot?.activeMapId ?? null;
  const activeMap = useMemo(() => {
    const maps = campaignSnapshot?.maps ?? [];
    return activeMapId
      ? (maps.find((m) => m.id === activeMapId) ?? null)
      : null;
  }, [campaignSnapshot, activeMapId]);
  const hasActiveMap = Boolean(activeMap);
  const layers = useMemo(() => activeMap?.layers ?? [], [activeMap]);
  const paperLayer = useMemo(
    () =>
      (layers.find((l) => l.type === "paper") ?? null) as {
        state?: { aspect?: PaperAspect; color?: string };
      } | null,
    [layers],
  );
  const aspect: PaperAspect =
    (paperLayer?.state?.aspect as PaperAspect | undefined) ??
    (activeMap?.paper?.aspect as PaperAspect | undefined) ??
    "16:10";
  const paperColor =
    (paperLayer?.state?.color as string | undefined) ??
    (activeMap?.paper?.color as string | undefined) ??
    "#ffffff";
  const palette = useMemo(
    () => resolvePalette(campaignSnapshot ?? null, activeMapId),
    [campaignSnapshot, activeMapId],
  );
  const layersKey = useMemo(() => {
    return layers
      .map((l) => {
        const t = getLayerType(l.type);
        if (!t || !t.adapter) {
          return `${l.type}:${l.visible ? "1" : "0"}:unknown`;
        }
        const getKey = (t.adapter as LayerAdapter<unknown>).getInvalidationKey;
        if (typeof getKey !== "function") {
          throw new Error(
            `Layer adapter for type "${l.type}" is missing required getInvalidationKey`,
          );
        }
        const key = getKey(l.state as unknown);
        return `${l.type}:${l.visible ? "1" : "0"}:${key}`;
      })
      .join("|");
  }, [layers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastCanvasDimsRef = useRef<{ dpr: number; w: number; h: number }>({
    dpr: 0,
    w: 0,
    h: 0,
  });
  const renderSvcRef = useRef<RenderService | null>(null);
  const [useWorker, setUseWorker] = useState<boolean>(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  type DebugWindow = Window & {
    __renderWorkerStatus?: Record<string, unknown>;
    __renderLog?: Array<Record<string, unknown>>;
  };
  const dbg =
    typeof window !== "undefined"
      ? (window as unknown as DebugWindow)
      : (undefined as unknown as DebugWindow);

  const paperRect = useMemo(
    () =>
      computePaperRect({
        canvasSize: { w: size.w, h: size.h },
        paper: { aspect },
      }),
    [size.w, size.h, aspect],
  );

  const scaleConfig = useActiveScaleConfig();
  const hexLayer = useMemo(
    () => layers.find((l) => l.type === "hexgrid") ?? null,
    [layers],
  );
  const hexState = (hexLayer?.state ?? null) as HexgridState | null;
  const hexSize = Math.max(1, Number(hexState?.size ?? 24));
  const hexOrientation = hexState?.orientation === "flat" ? "flat" : "pointy";

  const canRenderScale =
    scaleConfig.enabled &&
    scaleConfig.unitsPerHex > 0 &&
    Number.isFinite(scaleConfig.unitsPerHex) &&
    paperRect.w > 0 &&
    hexSize > 0;

  const overlayMargin = 18;
  const estimatedScaleHeight = 64;
  const scaleLeft = Math.max(overlayMargin, paperRect.x + overlayMargin);
  const overlayTop = Math.max(
    overlayMargin,
    Math.min(
      size.h - estimatedScaleHeight - overlayMargin,
      paperRect.y + paperRect.h - estimatedScaleHeight - overlayMargin,
    ),
  );
  const belowTop = Math.max(
    overlayMargin,
    Math.min(
      size.h - estimatedScaleHeight - overlayMargin,
      paperRect.y + paperRect.h + overlayMargin,
    ),
  );

  // Observe container size precisely
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const rect = e.contentRect;
        const nw = Math.floor(rect.width);
        const nh = Math.floor(rect.height);
        setSize((prev) =>
          prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh },
        );
      }
    });
    obs.observe(el);
    // initial measure
    const rect = el.getBoundingClientRect();
    setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    return () => obs.disconnect();
  }, []);

  // Init worker-based renderer - recreate completely when campaign changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Force destroy any existing service first
    if (renderSvcRef.current) {
      try {
        console.info("[CanvasViewport] destroying previous RenderService");
        dbg.__renderLog = [
          ...(dbg.__renderLog || []),
          { t: Date.now(), where: "CanvasViewport", msg: "destroy-previous" },
        ];
      } catch {}
      renderSvcRef.current.destroy();
      renderSvcRef.current = null;
      setUseWorker(false);
    }

    // Mark attempt to initialize worker on the element for easier debugging
    try {
      canvas.dataset.workerInit = "start";
    } catch {}
    const svc = new RenderService();
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    try {
      console.info("[CanvasViewport] init RenderService", {
        hasTCTOS:
          typeof HTMLCanvasElement !== "undefined" &&
          typeof (
            HTMLCanvasElement.prototype as unknown as Record<string, unknown>
          )["transferControlToOffscreen"] === "function",
        hasOffscreen:
          typeof (window as typeof window & { OffscreenCanvas?: unknown })
            .OffscreenCanvas !== "undefined",
        dpr,
      });
      dbg.__renderLog = [
        ...(dbg.__renderLog || []),
        { t: Date.now(), where: "CanvasViewport", msg: "init", dpr },
      ];
    } catch {}
    let ok = false;
    try {
      ok = svc.init(canvas, dpr);
    } catch (e) {
      // Hard error: show inline details
      const msg = e instanceof Error ? e.message : String(e);
      setWorkerError(msg);
      try {
        canvas.dataset.workerInit = "error";
      } catch {}
      console.error("[CanvasViewport] worker init threw:", e);
      ok = false;
    }
    if (ok) {
      try {
        canvas.dataset.workerInit = "ok";
      } catch {}
      try {
        console.info("[CanvasViewport] RenderService initialized with worker");
        dbg.__renderLog = [
          ...(dbg.__renderLog || []),
          { t: Date.now(), where: "CanvasViewport", msg: "worker-ok" },
        ];
      } catch {}
      renderSvcRef.current = svc;
      setUseWorker(true);
      setWorkerError(null);
      return () => {
        try {
          console.info("[CanvasViewport] tearing down worker RenderService");
          dbg.__renderLog = [
            ...(dbg.__renderLog || []),
            { t: Date.now(), where: "CanvasViewport", msg: "worker-destroy" },
          ];
        } catch {}
        svc.destroy();
        renderSvcRef.current = null;
      };
    } else {
      try {
        canvas.dataset.workerInit = "error";
      } catch {}
      const status = dbg?.__renderWorkerStatus as
        | { stage?: string; error?: string }
        | undefined;
      const msg = status?.error || status?.stage || "init failed";
      setWorkerError(String(msg));
      renderSvcRef.current = null;
      setUseWorker(false);
      return () => {};
    }
  }, [campaignId, activeMapId, dbg]); // React to campaign and active map changes

  // Note: We avoid re-calling transferControlToOffscreen on the same canvas.
  // Instead, the <canvas> below is keyed by campaignId to force a remount when
  // the campaign changes. The mount/unmount effect above handles init/teardown.

  // Push size and frame updates
  useEffect(() => {
    const svc = renderSvcRef.current;
    const canvas = canvasRef.current;
    if (!svc || !canvas) return;
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cw = Math.max(1, size.w);
    const ch = Math.max(1, size.h);
    // Always set CSS presentation size.
    // IMPORTANT: When using OffscreenCanvas, do NOT set the canvas width/height
    // attributes after transferControlToOffscreen(); it throws InvalidStateError.
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    // Leave intrinsic size management to the worker; fallback path handles it locally.
    lastCanvasDimsRef.current = { dpr, w: cw, h: ch };
    svc.resize({ w: cw, h: ch }, dpr);
    const frame: SceneFrame = {
      size: { w: cw, h: ch },
      pixelRatio: dpr,
      paper: { aspect, color: paperColor },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: layers.map((l) => ({
        id: l.id,
        type: l.type,
        visible: l.visible,
        state: l.state,
      })),
      palette,
    };
    svc.render(frame);
    // Schedule a follow-up render on the next animation frame to catch any
    // late resize/bitmap updates inside the worker (belt and suspenders).
    requestAnimationFrame(() => svc.render(frame));
  }, [
    useWorker,
    aspect,
    paperColor,
    layersKey,
    size.w,
    size.h,
    layers,
    palette,
  ]);

  // No fallback renderer: worker is required. WorkerSupportGate handles UX when unsupported.

  // Pointer → hex routing (main thread)
  const setMousePosition = useLayoutStore((s) => s.setMousePosition);
  const activeTool = useLayoutStore((s) => s.activeTool);
  const updateLayerState = useCampaignStore((s) => s.updateLayerState);
  const applyLayerState = useCampaignStore((s) => s.applyLayerState);
  const applyCellsDelta = useCampaignStore((s) => s.applyCellsDelta);
  const applyLayerStateBatch = useCampaignStore((s) => s.applyLayerStateBatch);
  const selection = useSelectionStore((s) => s.selection);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const buildToolContext = useCallback(
    (scene: ReturnType<typeof getSceneAdapter> | null): ToolContext | null => {
      if (selection.kind !== "layer") return null;
      return {
        app: AppAPI,
        updateLayerState,
        applyLayerState,
        getActiveLayerState: <T = unknown,>(id?: string): T | null => {
          try {
            const cur = campaignStoreRaw.getState().current;
            const activeMapId = cur?.activeMapId ?? null;
            const map = cur?.maps.find((m) => m.id === activeMapId);
            const layerId =
              id ?? (selection.kind === "layer" ? selection.id : undefined);
            if (!map || !layerId) return null;
            const layer = (map.layers ?? []).find((l) => l.id === layerId);
            return (layer?.state as T) ?? null;
          } catch {
            return null;
          }
        },
        selection,
        sceneAdapter: scene ?? null,
        applyCellsDelta,
        applyLayerStateBatch,
      };
    },
    [
      selection,
      updateLayerState,
      applyLayerState,
      applyCellsDelta,
      applyLayerStateBatch,
    ],
  );

  const dispatchToolEvent = (
    kind: "down" | "move" | "up",
    e: React.PointerEvent,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = getTool(activeTool);
    if (!handler) return;
    if (selection.kind !== "layer") return;
    // Compute paper rect (mirror render math)
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const scene = getSceneAdapter();
    const paperRect =
      scene?.computePaperRect?.({
        canvasSize: { w: cw, h: ch },
        paper: { aspect, color: paperColor },
      }) ??
      computePaperRect({
        canvasSize: { w: cw, h: ch },
        paper: { aspect },
      });

    // Translate pointer to paper coordinates and guard bounds
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const px = mx - paperRect.x;
    const py = my - paperRect.y;
    if (px < 0 || py < 0 || px > paperRect.w || py > paperRect.h) return;

    // Build a minimal frame for env composition
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const frame: SceneFrame = {
      size: { w: cw, h: ch },
      pixelRatio: dpr,
      paper: { aspect, color: paperColor },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: layers.map((l) => ({
        id: l.id,
        type: l.type,
        visible: l.visible,
        state: l.state,
      })),
      palette,
    };
    // Compose RenderEnv for tools using plugin providers; ensure precise typing.
    const envBase: import("@/layers/types").RenderEnv = {
      zoom: 1,
      pixelRatio: dpr,
      size: { w: paperRect.w, h: paperRect.h },
      paperRect,
      camera: frame.camera,
      palette: frame.palette,
    };
    const envWithGrid: import("@/layers/types").RenderEnv = {
      ...envBase,
      ...(composeEnv(frame) as Partial<import("@/layers/types").RenderEnv>),
    };
    const ctx = buildToolContext(scene);
    if (!ctx) return;
    const pt = { x: px, y: py } as const;
    try {
      if (kind === "down") handler.onPointerDown?.(pt, envWithGrid, ctx);
      else if (kind === "move") handler.onPointerMove?.(pt, envWithGrid, ctx);
      else handler.onPointerUp?.(pt, envWithGrid, ctx);
    } catch (err) {
      console.warn("[CanvasViewport] tool handler threw", err);
    }
  };
  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Recompute paper rect (same as draw)
    const cw = rect.width;
    const ch = rect.height;
    const scene = getSceneAdapter();
    const paperRect =
      scene?.computePaperRect?.({
        canvasSize: { w: cw, h: ch },
        paper: { aspect, color: paperColor },
      }) ??
      computePaperRect({
        canvasSize: { w: cw, h: ch },
        paper: { aspect },
      });
    const px = mx - paperRect.x;
    const py = my - paperRect.y;
    // Default: outside or no grid
    let hex: { q: number; r: number } | null = null;
    let gridLayout: Layout | null = null;
    if (px >= 0 && py >= 0 && px <= paperRect.w && py <= paperRect.h) {
      const layer = layers.find((l) => l.type === "hexgrid" && l.visible);
      if (layer) {
        const st = (layer.state ?? {}) as Record<string, unknown>;
        gridLayout = {
          orientation: st.orientation === "flat" ? "flat" : "pointy",
          size: Math.max(4, Number(st.size ?? 16)),
          origin: { x: paperRect.w / 2, y: paperRect.h / 2 },
        };
        hex = AppAPI.hex.fromPoint({ x: px, y: py }, gridLayout);
      }
    }
    setMousePosition(Math.round(mx), Math.round(my), hex);

    const selectionLayer =
      selection.kind === "layer"
        ? layers.find((l) => l.id === selection.id)
        : null;
    if (
      selection.kind === "layer" &&
      selectionLayer?.type === "outline" &&
      gridLayout
    ) {
      const nearest = findNearestCorner({ x: px, y: py }, gridLayout);
      if (nearest) {
        applyLayerState(selection.id, (draft: OutlineState) => {
          if (!cornersEqual(draft.hoverCorner ?? null, nearest)) {
            draft.hoverCorner = nearest;
          }
        });
      } else {
        applyLayerState(selection.id, (draft: OutlineState) => {
          if (draft.hoverCorner) draft.hoverCorner = null;
        });
      }
    }

    if (isPointerDown) dispatchToolEvent("move", e);
  };

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    setIsPointerDown(true);
    dispatchToolEvent("down", e);
  };

  const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = () => {
    setIsPointerDown(false);
    try {
      const fake = { clientX: 0, clientY: 0 } as unknown as React.PointerEvent;
      dispatchToolEvent("up", fake);
    } catch {}
  };

  const rendererTag = useMemo(
    () => (useWorker ? "worker" : "error"),
    [useWorker],
  );
  const showDebugOverlay = debugEnabled("renderer");

  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      const handler = getTool(activeTool);
      if (!handler?.onKeyDown) return;
      const ctx = buildToolContext(getSceneAdapter());
      if (!ctx) return;
      handler.onKeyDown(ev.key, ctx);
      ev.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, buildToolContext]);

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        className="pt-4 px-6 h-full min-h-[60vh] relative"
        ref={containerRef}
      >
        {!hasActiveMap ? (
          <div className="p-8 text-sm text-muted-foreground">
            No active map.
          </div>
        ) : (
          <>
            {!useWorker ? (
              <div className="p-4 text-sm text-red-600">
                Rendering worker failed to initialize.
                {workerError ? <> - {workerError}</> : null}
              </div>
            ) : null}
            <canvas
              key={`${campaignId || "none"}:${activeMapId || "none"}`}
              ref={canvasRef}
              className="w-full h-full"
              id="map-canvas"
              data-renderer={rendererTag}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              style={{ cursor: getCursorForTool(activeTool) || "default" }}
            />
            {canRenderScale && scaleConfig.placement === "overlay" ? (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${scaleLeft}px`,
                  top: `${overlayTop}px`,
                }}
              >
                <ScaleBar
                  placement="overlay"
                  unitLabel={scaleConfig.label}
                  unitShortLabel={scaleConfig.shortLabel}
                  unitsPerHex={scaleConfig.unitsPerHex}
                  hexSize={hexSize}
                  orientation={hexOrientation}
                  paperWidth={paperRect.w}
                />
              </div>
            ) : null}
            {canRenderScale && scaleConfig.placement === "below" ? (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${scaleLeft}px`,
                  top: `${belowTop}px`,
                }}
              >
                <ScaleBar
                  placement="below"
                  unitLabel={scaleConfig.label}
                  unitShortLabel={scaleConfig.shortLabel}
                  unitsPerHex={scaleConfig.unitsPerHex}
                  hexSize={hexSize}
                  orientation={hexOrientation}
                  paperWidth={paperRect.w}
                />
              </div>
            ) : null}
            {showDebugOverlay ? (
              <div
                className="pointer-events-none absolute top-2 left-2 text-[10px] bg-black/40 text-white px-2 py-1 rounded"
                aria-hidden
              >
                <span>renderer: {rendererTag}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default CanvasViewport;
