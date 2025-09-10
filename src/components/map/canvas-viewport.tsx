"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "@/stores/project";
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
import { createPerlinNoise } from "@/lib/noise";
import {
  resolveGridLine,
  resolvePalette,
  resolveTerrainFill,
} from "@/stores/selectors/palette";

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
  const current = useProjectStore((s) => s.current);
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
  const layersKey = useMemo(
    () =>
      layers
        .map((l) => {
          const t = getLayerType(l.type);
          if (
            !t ||
            !t.adapter ||
            typeof t.adapter.getInvalidationKey !== "function"
          ) {
            throw new Error(
              `Layer type '${l.type}' missing required getInvalidationKey()`,
            );
          }
          const adapter = t.adapter as LayerAdapter<unknown>;
          const key = adapter.getInvalidationKey(l.state);
          return `${l.type}:${l.visible ? "1" : "0"}:${key}`;
        })
        .join("|"),
    [layers],
  );

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

  // Init worker-based renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const svc = new RenderService();
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const ok = svc.init(canvas, dpr);
    if (ok) {
      renderSvcRef.current = svc;
      setUseWorker(true);
      return () => {
        svc.destroy();
        renderSvcRef.current = null;
      };
    } else {
      renderSvcRef.current = null;
      setUseWorker(false);
      return () => {};
    }
  }, []);

  // Push size and frame updates
  useEffect(() => {
    const svc = renderSvcRef.current;
    const canvas = canvasRef.current;
    if (!svc || !canvas) return;
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const cw = Math.max(1, size.w);
    const ch = Math.max(1, size.h);
    // Resize host canvas CSS size; worker backend uses resize message
    const last = lastCanvasDimsRef.current;
    if (last.dpr !== dpr || last.w !== cw || last.h !== ch) {
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      // Bitmap size is controlled inside worker backend; we send resize info
      lastCanvasDimsRef.current = { dpr, w: cw, h: ch };
      svc.resize({ w: cw, h: ch }, dpr);
    }
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
  }, [aspect, paperColor, layersKey, size.w, size.h, layers, palette]);

  // Fallback main-thread draw when worker unavailable
  useEffect(() => {
    if (useWorker) return; // worker handles rendering
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cw = Math.max(1, size.w);
      const ch = Math.max(1, size.h);
      const last = lastCanvasDimsRef.current;
      if (last.dpr !== dpr || last.w !== cw || last.h !== ch) {
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
        canvas.width = Math.floor(cw * dpr);
        canvas.height = Math.floor(ch * dpr);
        lastCanvasDimsRef.current = { dpr, w: cw, h: ch };
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const paddingX = Math.max(12, cw * 0.05);
      const paddingY = 12;
      const availW = cw - paddingX * 2;
      const availH = ch - paddingY * 2;
      const { aw, ah } = parseAspect(aspect);
      // Width-first sizing: use available width, then cap by available height if needed
      let paperW = availW;
      let paperH = (paperW * ah) / aw;
      if (paperH > availH) {
        paperH = availH;
        paperW = (paperH * aw) / ah;
      }
      const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
      const paperY = paddingY;
      // Paper
      ctx.save();
      ctx.fillStyle = paperColor;
      ctx.fillRect(paperX, paperY, paperW, paperH);
      ctx.restore();
      // Clip & draw layers (hex noise, then hexgrid)
      ctx.save();
      ctx.beginPath();
      ctx.rect(paperX, paperY, paperW, paperH);
      ctx.clip();
      ctx.translate(paperX, paperY);
      // Draw all non-grid visible layers in array order (bottom -> top)
      for (const l of layers) {
        if (!l.visible || l.type === "hexgrid") continue;
        // Hex Noise layer
        if (l.type === "hexnoise") {
          const gridLayer = layers.find(
            (g) => g.type === "hexgrid" && g.visible,
          );
          const st = (l.state ?? {}) as Record<string, unknown>;
          const orientation =
            (gridLayer?.state as Record<string, unknown> | undefined)
              ?.orientation === "flat"
              ? "flat"
              : "pointy";
          const r = Math.max(
            4,
            Number(
              (gridLayer?.state as Record<string, unknown> | undefined)?.size ??
                16,
            ),
          );
          const sqrt3 = Math.sqrt(3);
          const perlin = createPerlinNoise(String(st.seed ?? "seed"));
          const freq = Number(st.frequency ?? 0.15);
          const ox = Number(st.offsetX ?? 0);
          const oy = Number(st.offsetY ?? 0);
          const intensity = Math.max(0, Math.min(1, Number(st.intensity ?? 1)));
          const gamma = Math.max(0.0001, Number(st.gamma ?? 1));
          const clampMin = Math.max(0, Math.min(1, Number(st.min ?? 0)));
          const clampMax = Math.max(0, Math.min(1, Number(st.max ?? 1)));
          const drawHexFill = (
            cx: number,
            cy: number,
            startAngle: number,
            aq: number,
            ar: number,
          ) => {
            let v = perlin.normalized2D(aq * freq + ox, ar * freq + oy);
            v = Math.pow(v, gamma);
            if (v < clampMin || v > clampMax) return;
            const mode = (st.mode as "shape" | "paint" | undefined) ?? "shape";
            if (mode === "shape") {
              const g = Math.floor(v * 255 * intensity);
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const ang = startAngle + i * (Math.PI / 3);
                const px = cx + Math.cos(ang) * r;
                const py = cy + Math.sin(ang) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fillStyle = `rgb(${g},${g},${g})`;
              ctx.fill();
              return;
            }
            const fill =
              (st.paintColor as string | undefined) ??
              resolveTerrainFill(
                palette,
                (st.terrain as string | undefined) ?? "plains",
              );
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const ang = startAngle + i * (Math.PI / 3);
              const px = cx + Math.cos(ang) * r;
              const py = cy + Math.sin(ang) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
          };
          if (orientation === "flat") {
            const colStep = 1.5 * r;
            const rowStep = sqrt3 * r;
            const cols = Math.ceil(paperW / colStep) + 2;
            const rows = Math.ceil(paperH / rowStep) + 2;
            const centerX = paperW / 2;
            const centerY = paperH / 2;
            const cmin = -Math.ceil(cols / 2),
              cmax = Math.ceil(cols / 2);
            const rmin = -Math.ceil(rows / 2),
              rmax = Math.ceil(rows / 2);
            for (let c = cmin; c <= cmax; c++) {
              const yOffset = c & 1 ? rowStep / 2 : 0;
              for (let ri = rmin; ri <= rmax; ri++) {
                const x = c * colStep + centerX;
                const y = ri * rowStep + yOffset + centerY;
                drawHexFill(x, y, 0, c, ri);
              }
            }
          } else {
            const colStep = sqrt3 * r;
            const rowStep = 1.5 * r;
            const cols = Math.ceil(paperW / colStep) + 2;
            const rows = Math.ceil(paperH / rowStep) + 2;
            const centerX = paperW / 2;
            const centerY = paperH / 2;
            const rmin = -Math.ceil(rows / 2),
              rmax = Math.ceil(rows / 2);
            const cmin = -Math.ceil(cols / 2),
              cmax = Math.ceil(cols / 2);
            for (let ri = rmin; ri <= rmax; ri++) {
              const xOffset = ri & 1 ? colStep / 2 : 0;
              for (let c = cmin; c <= cmax; c++) {
                const x = c * colStep + xOffset + centerX;
                const y = ri * rowStep + centerY;
                drawHexFill(x, y, -Math.PI / 6, c, ri);
              }
            }
          }
          continue;
        }
        // Freeform layer
        if (l.type === "freeform") {
          const st = (l.state ?? {}) as Record<string, unknown>;
          const cells =
            (st["cells"] as Record<
              string,
              { terrainId?: string; color?: string }
            >) || {};
          const gridLayer = layers.find(
            (g) => g.type === "hexgrid" && g.visible,
          );
          if (!gridLayer) continue;
          const gst = (gridLayer.state ?? {}) as Record<string, unknown>;
          const r = Math.max(4, Number(gst.size ?? 16));
          const orientation = gst.orientation === "flat" ? "flat" : "pointy";
          const originX = paperW / 2;
          const originY = paperH / 2;
          ctx.save();
          const opacity = Math.max(0, Math.min(1, Number(st["opacity"] ?? 1)));
          ctx.globalAlpha = opacity;
          for (const [k, cell] of Object.entries(cells)) {
            const [qs, rs] = k.split(",");
            const q = Number(qs),
              rAx = Number(rs);
            if (!Number.isFinite(q) || !Number.isFinite(rAx)) continue;
            const cx =
              originX +
              (orientation === "pointy"
                ? Math.sqrt(3) * r * (q + rAx / 2)
                : 1.5 * r * q);
            const cy =
              originY +
              (orientation === "pointy"
                ? 1.5 * r * rAx
                : Math.sqrt(3) * r * (rAx + q / 2));
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const start = orientation === "pointy" ? -Math.PI / 6 : 0;
              const ang = start + i * (Math.PI / 3);
              const px = cx + Math.cos(ang) * r;
              const py = cy + Math.sin(ang) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            const fill =
              (cell.color as string | undefined) ??
              resolveTerrainFill(
                palette,
                (cell.terrainId as string | undefined) ?? "plains",
              );
            ctx.fillStyle = fill;
            ctx.fill();
          }
          ctx.restore();
          continue;
        }
      }

      const layer = layers.find((l) => l.type === "hexgrid" && l.visible);
      if (layer) {
        const st = (layer.state ?? {}) as Record<string, unknown>;
        const r = Math.max(4, Number(st.size ?? 16));
        const color = resolveGridLine(current ?? null, activeId, {
          color: st.color as string | undefined,
        });
        const alpha = Number(st.alpha ?? 1);
        const orientation = st.orientation === "flat" ? "flat" : "pointy";
        const sqrt3 = Math.sqrt(3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, Number(st.lineWidth ?? 1)); // CSS px
        const drawHex = (cx: number, cy: number, startAngle: number) => {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = startAngle + i * (Math.PI / 3);
            const px = cx + Math.cos(ang) * r;
            const py = cy + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        };
        if (orientation === "flat") {
          const colStep = 1.5 * r;
          const rowStep = sqrt3 * r;
          const cols = Math.ceil(paperW / colStep) + 2;
          const rows = Math.ceil(paperH / rowStep) + 2;
          const centerX = paperW / 2;
          const centerY = paperH / 2;
          const cmin = -Math.ceil(cols / 2),
            cmax = Math.ceil(cols / 2);
          const rmin = -Math.ceil(rows / 2),
            rmax = Math.ceil(rows / 2);
          for (let c = cmin; c <= cmax; c++) {
            const yOffset = c & 1 ? rowStep / 2 : 0;
            for (let ri = rmin; ri <= rmax; ri++) {
              const x = c * colStep + centerX;
              const y = ri * rowStep + yOffset + centerY;
              drawHex(x, y, 0);
            }
          }
        } else {
          const colStep = sqrt3 * r;
          const rowStep = 1.5 * r;
          const cols = Math.ceil(paperW / colStep) + 2;
          const rows = Math.ceil(paperH / rowStep) + 2;
          const centerX = paperW / 2;
          const centerY = paperH / 2;
          const rmin = -Math.ceil(rows / 2),
            rmax = Math.ceil(rows / 2);
          const cmin = -Math.ceil(cols / 2),
            cmax = Math.ceil(cols / 2);
          for (let ri = rmin; ri <= rmax; ri++) {
            const xOffset = ri & 1 ? colStep / 2 : 0;
            for (let c = cmin; c <= cmax; c++) {
              const x = c * colStep + xOffset + centerX;
              const y = ri * rowStep + centerY;
              drawHex(x, y, -Math.PI / 6);
            }
          }
        }
        ctx.restore();
      }
      ctx.restore();

      // Draw paper outline on top (outside clip)
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3 / dpr;
      ctx.strokeRect(
        paperX + ctx.lineWidth / 2,
        paperY + ctx.lineWidth / 2,
        paperW - ctx.lineWidth,
        paperH - ctx.lineWidth,
      );
      ctx.restore();

      // No overlay drawing — cursor is handled via CSS on the canvas element
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    useWorker,
    aspect,
    paperColor,
    layersKey,
    size.w,
    size.h,
    layers,
    palette,
    current,
    activeId,
  ]);

  // Pointer → hex routing (main thread)
  const setMousePosition = useLayoutStore((s) => s.setMousePosition);
  const activeTool = useLayoutStore((s) => s.activeTool);
  const updateLayerState = useProjectStore((s) => s.updateLayerState);
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
    const active = useProjectStore.getState().current;
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

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="pt-4 px-6 h-full min-h-[60vh]" ref={containerRef}>
        {!active ? (
          <div className="p-8 text-sm text-muted-foreground">
            No active map.
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            style={{ cursor: getCursorForTool(activeTool) || "default" }}
          />
        )}
      </div>
    </div>
  );
};

export default CanvasViewport;
