"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { shallow } from 'zustand/shallow';
import RenderService from '@/render/service';
import type { SceneFrame } from '@/render/types';

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
      return `hx:${l.visible?'1':'0'}:${st.size}:${st.rotation}:${st.color}:${st.alpha ?? 0.2}`;
    }
    return `${l.type}:${l.visible?'1':'0'}`;
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
      const scale = Math.min(availW / aw, availH / ah);
      const paperW = aw * scale;
      const paperH = ah * scale;
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
        const r = Math.max(6, st.size || 24);
        const color = st.color || '#000000';
        const alpha = st.alpha ?? 0.2;
        const rot = st.rotation || 0;
        const off = document.createElement('canvas');
        const vx = r * 1.5; const vy = Math.sin(Math.PI / 3) * r;
        off.width = Math.max(1, Math.floor(vx * dpr * 2));
        off.height = Math.max(1, Math.floor(vy * dpr * 2));
        const octx = off.getContext('2d');
        if (octx) {
          octx.setTransform(dpr, 0, 0, dpr, 0, 0);
          octx.strokeStyle = color; octx.globalAlpha = alpha; octx.lineWidth = 1;
          const drawHexAt = (x: number, y: number) => {
            octx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = Math.PI / 6 + i * (Math.PI / 3);
              const px = x + Math.cos(a) * r; const py = y + Math.sin(a) * r;
              if (i === 0) octx.moveTo(px, py); else octx.lineTo(px, py);
            }
            octx.closePath(); octx.stroke();
          };
          drawHexAt(vx * 0.5, vy); drawHexAt(0, 0); drawHexAt(vx, vy * 2);
          const pattern = ctx.createPattern(off, 'repeat');
          if (pattern) {
            ctx.translate(paperW / 2, paperH / 2); ctx.rotate(rot); ctx.translate(-paperW / 2, -paperH / 2);
            ctx.fillStyle = pattern; ctx.fillRect(0, 0, paperW, paperH);
          }
        }
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

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="pt-4 px-6 min-h-[60vh]" ref={containerRef}>
        {!active ? (
          <div className="p-8 text-sm text-muted-foreground">No active map.</div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-[60vh]" />
        )}
      </div>
    </div>
  );
};

export default CanvasViewport;
