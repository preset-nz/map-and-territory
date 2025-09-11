"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCampaignStore } from "@/stores/campaign";
import { getLayerType } from "@/layers/registry";
import type { LayerAdapter } from "@/layers/types";
// import type { RenderEnv } from '@/layers/types';
import RenderService from "@/render/service";
import type { SceneFrame } from "@/render/types";
import { useLayoutStore } from "@/stores/layout";
import { useSelectionStore } from "@/stores/selection";
import { axialKey } from "@/layers/hex-utils";
import { AppAPI } from "@/appapi";
import { getCursorForTool } from "@/plugin/loader";
// import { createPerlinNoise } from "@/lib/noise";
import { resolvePalette } from "@/stores/selectors/palette";
import { debugEnabled } from "@/lib/debug";

function parseAspect(aspect: "square" | "4:3" | "16:10"): {
  aw: number;
  ah: number;
} {
  switch (aspect) {
    case "square":
      return { aw: 1, ah: 1 };
    case "4:3":
      return { aw: 4, ah: 3 };
    case "16:10":
    default:
      return { aw: 16, ah: 10 };
  }
}

export const CanvasViewport: React.FC = () => {
  // Select minimal store state without constructing new objects to keep SSR snapshot stable
  const current = useCampaignStore((s) => s.current);
  const campaignId = useCampaignStore((s) => s.current?.id ?? null);
  const activeId = current?.activeMapId ?? null;
  const maps = current?.maps;

  const active = useMemo(() => {
    const list = maps ?? [];
    return activeId ? (list.find((m) => m.id === activeId) ?? null) : null;
  }, [activeId, maps]);
  // Derive paper aspect/color from Paper layer state if present; fallback to map.paper
  const paperLayer = useMemo(
    () =>
      active
        ? ((active.layers ?? []).find((l) => l.type === "paper") ?? null)
        : null,
    [active],
  );
  type Aspect = "square" | "4:3" | "16:10";
  const aspect: Aspect =
    (paperLayer?.state as { aspect?: Aspect } | undefined)?.aspect ??
    active?.paper?.aspect ??
    "16:10";
  const paperColor =
    (paperLayer?.state as { color?: string } | undefined)?.color ??
    active?.paper?.color ??
    "#ffffff";
  const layers = useMemo(() => active?.layers ?? [], [active]);
  const palette = useMemo(
    () => resolvePalette(current ?? null, activeId),
    [current, activeId],
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
  }, [campaignId, activeId, dbg]); // React to campaign and active map changes

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
  const selection = useSelectionStore((s) => s.selection);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const lastPaintKeyRef = useRef<string | null>(null);

  const paintOrEraseAt = (mx: number, my: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (selection.kind !== "layer") return;
    const layerId = selection.id;
    const rect = canvas.getBoundingClientRect();
    const cx = mx - rect.left;
    const cy = my - rect.top;
    // Recompute paper rect and layout (mirror routing block)
    const cw = rect.width;
    const ch = rect.height;
    const paddingX = Math.max(12, cw * 0.05);
    const paddingY = 12;
    const availW = cw - paddingX * 2;
    const availH = ch - paddingY * 2;
    const { aw, ah } = parseAspect(aspect);
    let paperW = availW;
    let paperH = (paperW * ah) / aw;
    if (paperH > availH) {
      paperH = availH;
      paperW = (paperH * aw) / ah;
    }
    const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
    const paperY = paddingY;
    const px = cx - paperX;
    const py = cy - paperY;
    if (px < 0 || py < 0 || px > paperW || py > paperH) return;
    const gridLayer = layers.find((l) => l.type === "hexgrid" && l.visible);
    if (!gridLayer) return;
    const st = (gridLayer.state ?? {}) as Record<string, unknown>;
    const layout = {
      orientation: st.orientation === "flat" ? "flat" : "pointy",
      size: Math.max(4, Number(st.size ?? 16)),
      origin: { x: paperW / 2, y: paperH / 2 },
    } as const;
    const h = AppAPI.hex.fromPoint({ x: px, y: py }, layout);
    const key = axialKey(h.q, h.r);
    if (lastPaintKeyRef.current === key) return;
    lastPaintKeyRef.current = key;
    // Read target layer to decide brush
    const active = useCampaignStore.getState().current;
    const map = active?.maps.find((m) => m.id === active?.activeMapId);
    const layer = map?.layers?.find((l) => l.id === layerId);
    if (!layer || layer.type !== "freeform") return;
    const lstate = (layer.state ?? {}) as Record<string, unknown>;
    if (activeTool === "paint") {
      const brushColor =
        (lstate["brushColor"] as string | undefined) ?? undefined;
      const brushTerrainId =
        (lstate["brushTerrainId"] as string | undefined) ?? undefined;
      if (!brushColor && !brushTerrainId) return; // nothing to paint with
      const cells = { ...((lstate["cells"] as Record<string, unknown>) || {}) };
      cells[key] = {
        terrainId: brushTerrainId,
        color: brushColor,
      } as unknown as Record<string, unknown>;
      updateLayerState(layerId, { cells });
    } else if (activeTool === "erase") {
      const cells = { ...((lstate["cells"] as Record<string, unknown>) || {}) };
      if (key in cells) {
        delete cells[key];
        updateLayerState(layerId, { cells });
      }
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
    const paddingX = Math.max(12, cw * 0.05);
    const paddingY = 12;
    const availW = cw - paddingX * 2;
    const availH = ch - paddingY * 2;
    const parseAspect = (a: "square" | "4:3" | "16:10") =>
      a === "square"
        ? { aw: 1, ah: 1 }
        : a === "4:3"
          ? { aw: 4, ah: 3 }
          : { aw: 16, ah: 10 };
    const { aw, ah } = parseAspect(aspect);
    let paperW = availW;
    let paperH = (paperW * ah) / aw;
    if (paperH > availH) {
      paperH = availH;
      paperW = (paperH * aw) / ah;
    }
    const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
    const paperY = paddingY;
    const px = mx - paperX;
    const py = my - paperY;
    // Default: outside or no grid
    let hex: { q: number; r: number } | null = null;
    if (px >= 0 && py >= 0 && px <= paperW && py <= paperH) {
      const layer = layers.find((l) => l.type === "hexgrid" && l.visible);
      if (layer) {
        const st = (layer.state ?? {}) as Record<string, unknown>;
        const layout = {
          orientation: st.orientation === "flat" ? "flat" : "pointy",
          size: Math.max(4, Number(st.size ?? 16)),
          origin: { x: paperW / 2, y: paperH / 2 },
        } as const;
        const h = AppAPI.hex.fromPoint({ x: px, y: py }, layout);
        hex = h;
      }
    }
    setMousePosition(Math.round(mx), Math.round(my), hex);
    // Paint/erase when dragging with proper tool and selection
    if (
      isPointerDown &&
      (activeTool === "paint" || activeTool === "erase") &&
      selection.kind === "layer"
    ) {
      const activeLayer = (
        current?.maps.find((m) => m.id === current?.activeMapId)?.layers || []
      ).find((l) => l.id === selection.id);
      if (activeLayer && activeLayer.type === "freeform") {
        paintOrEraseAt(e.clientX, e.clientY);
      }
    }
  };

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    setIsPointerDown(true);
    lastPaintKeyRef.current = null;
    if (activeTool === "paint" || activeTool === "erase") {
      paintOrEraseAt(e.clientX, e.clientY);
    }
  };

  const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = () => {
    setIsPointerDown(false);
    lastPaintKeyRef.current = null;
  };

  const rendererTag = useMemo(
    () => (useWorker ? "worker" : "error"),
    [useWorker],
  );
  const showDebugOverlay = debugEnabled("renderer");

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        className="pt-4 px-6 h-full min-h-[60vh] relative"
        ref={containerRef}
      >
        {!active ? (
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
              key={`${campaignId || "none"}:${activeId || "none"}`}
              ref={canvasRef}
              className="w-full h-full"
              id="map-canvas"
              data-renderer={rendererTag}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              style={{ cursor: getCursorForTool(activeTool) || "default" }}
            />
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
