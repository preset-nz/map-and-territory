"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { shallow } from 'zustand/shallow';
import RenderService from '@/render/service';
import type { SceneFrame } from '@/render/types';
import { useLayoutStore } from '@/stores/layout';
import { fromPoint as hexFromPoint } from '@/lib/hex';

function parseAspect(aspect: 'square' | '4:3' | '16:10'): { aw: number; ah: number } {
  switch (aspect) {
    case 'square':
      return { aw: 1, ah: 1 };
    case '4:3':
      return { aw: 4, ah: 3 };
    case '16:10':
    default:
      return { aw: 16, ah: 10 };
  }
}

export const CanvasViewport: React.FC = () => {
  // Select minimal store state without constructing new objects to keep SSR snapshot stable
  const current = useProjectStore((s) => s.current);
  const activeId = current?.activeMapId ?? null;
  const maps = current?.maps ?? [];

  const active = useMemo(() => (activeId ? maps.find((m) => m.id === activeId) ?? null : null), [activeId, maps]);
  // Derive paper aspect/color from Paper layer state if present; fallback to map.paper
  const paperLayer = useMemo(() => (active ? (active.layers ?? []).find((l) => l.type === 'paper') ?? null : null), [active]);
  const aspect = (paperLayer?.state as any)?.aspect ?? active?.paper?.aspect ?? '16:10';
  const paperColor = (paperLayer?.state as any)?.color ?? active?.paper?.color ?? '#ffffff';
  const layers = active?.layers ?? [];
  const layersKey = useMemo(() => layers.map((l) => {
    if (l.type === 'hexgrid') {
      const st = l.state as any;
      return `hx:${l.visible ? '1' : '0'}:${st.size}:${st.orientation}:${st.color}:${st.alpha ?? 1}:${st.lineWidth ?? 1}`;
    }
    if (l.type === 'paper') {
      const st = l.state as any;
      return `paper:${st.aspect}:${st.color}`;
    }
    return `${l.type}:${l.visible ? '1' : '0'}`;
  }).join('|'), [layers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const lastCanvasDimsRef = useRef<{ dpr: number; w: number; h: number }>({ dpr: 0, w: 0, h: 0 });
  const renderSvcRef = useRef<RenderService | null>(null);
  const [useWorker, setUseWorker] = useState<boolean>(false);

  // Observe container size precisely
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const rect = e.contentRect;
        const nw = Math.floor(rect.width);
        const nh = Math.floor(rect.height);
        setSize((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
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
    const canvas = canvasRef.current; if (!canvas) return;
    const svc = new RenderService();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const ok = svc.init(canvas, dpr);
    if (ok) {
      renderSvcRef.current = svc;
      setUseWorker(true);
      return () => { svc.destroy(); renderSvcRef.current = null; };
    } else {
      renderSvcRef.current = null;
      setUseWorker(false);
      return () => {};
    }
  }, []);

  // Push size and frame updates
  useEffect(() => {
    const svc = renderSvcRef.current; const canvas = canvasRef.current; if (!svc || !canvas) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
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
      paper: { aspect: aspect as any, color: paperColor },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: layers.map((l) => ({ id: l.id, type: l.type, visible: l.visible, state: l.state })),
    };
    svc.render(frame);
  }, [aspect, paperColor, layersKey, size.w, size.h]);

  // Fallback main-thread draw when worker unavailable
  useEffect(() => {
    if (useWorker) return; // worker handles rendering
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf = 0;
    const draw = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
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
      const { aw, ah } = parseAspect(aspect as any);
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
      // Clip & draw hexgrid fast pattern
      ctx.save();
      ctx.beginPath(); ctx.rect(paperX, paperY, paperW, paperH); ctx.clip();
      ctx.translate(paperX, paperY);
      const layer = layers.find((l: any) => l.type === 'hexgrid' && l.visible) as any;
      if (layer) {
        const st = layer.state || {};
        const r = Math.max(4, st.size || 16);
        const color = st.color || '#000000';
        const alpha = st.alpha ?? 1;
        const orientation = st.orientation === 'flat' ? 'flat' : 'pointy';
        const sqrt3 = Math.sqrt(3);
        ctx.save();
        ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, st.lineWidth ?? 1); // CSS px
        const drawHex = (cx: number, cy: number, startAngle: number) => {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = startAngle + i * (Math.PI / 3);
            const px = cx + Math.cos(ang) * r;
            const py = cy + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        };
        if (orientation === 'flat') {
          const colStep = 1.5 * r;
          const rowStep = sqrt3 * r;
          const cols = Math.ceil(paperW / colStep) + 2;
          const rows = Math.ceil(paperH / rowStep) + 2;
          const centerX = paperW / 2;
          const centerY = paperH / 2;
          const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
          const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
          for (let c = cmin; c <= cmax; c++) {
            const yOffset = (c & 1) ? (rowStep / 2) : 0;
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
          const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
          const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
          for (let ri = rmin; ri <= rmax; ri++) {
            const xOffset = (ri & 1) ? (colStep / 2) : 0;
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
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 / dpr;
      ctx.strokeRect(
        paperX + ctx.lineWidth / 2,
        paperY + ctx.lineWidth / 2,
        paperW - ctx.lineWidth,
        paperH - ctx.lineWidth
      );
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [useWorker, aspect, paperColor, layersKey, size.w, size.h]);

  // Pointer → hex routing (main thread)
  const setMousePosition = useLayoutStore((s) => s.setMousePosition);
  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Recompute paper rect (same as draw)
    const cw = rect.width; const ch = rect.height;
    const paddingX = Math.max(12, cw * 0.05);
    const paddingY = 12;
    const availW = cw - paddingX * 2;
    const availH = ch - paddingY * 2;
    const parseAspect = (aspect: 'square'|'4:3'|'16:10') => aspect === 'square' ? { aw:1, ah:1 } : aspect === '4:3' ? { aw:4, ah:3 } : { aw:16, ah:10 };
    const { aw, ah } = parseAspect(aspect as any);
    let paperW = availW; let paperH = (paperW * ah) / aw;
    if (paperH > availH) { paperH = availH; paperW = (paperH * aw) / ah; }
    const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
    const paperY = paddingY;
    const px = mx - paperX; const py = my - paperY;
    // Default: outside or no grid
    let hex: { q: number; r: number } | null = null;
    if (px >= 0 && py >= 0 && px <= paperW && py <= paperH) {
      const layer = layers.find((l: any) => l.type === 'hexgrid' && l.visible) as any;
      if (layer) {
        const st = layer.state || {};
        const layout = { orientation: st.orientation === 'flat' ? 'flat' : 'pointy', size: Math.max(4, st.size || 16), origin: { x: paperW / 2, y: paperH / 2 } } as const;
        const h = hexFromPoint({ x: px, y: py }, layout);
        hex = h;
      }
    }
    setMousePosition(Math.round(mx), Math.round(my), hex);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="pt-4 px-6 h-full min-h-[60vh]" ref={containerRef}>
        {!active ? (
          <div className="p-8 text-sm text-muted-foreground">No active map.</div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" onPointerMove={onPointerMove} />
        )}
      </div>
    </div>
  );
};

export default CanvasViewport;
