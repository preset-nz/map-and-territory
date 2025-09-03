"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { shallow } from 'zustand/shallow';

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
  const aspect = active?.paper?.aspect ?? '16:10';
  const paperColor = active?.paper?.color ?? '#ffffff';
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

  // Window resize (avoid continuous ResizeObserver churn on portal animations)
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const nw = Math.floor(rect.width);
      const nh = Math.floor(rect.height);
      setSize((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
    };
    compute();
    const onResize = () => requestAnimationFrame(compute);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    // Defer heavy drawing to next animation frame to keep INP low
    const raf = requestAnimationFrame(() => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const cw = Math.max(1, size.w);
      const ch = Math.max(1, size.h);
      // Only touch canvas bitmap when dimensions actually change
      const last = lastCanvasDimsRef.current;
      if (last.dpr !== dpr || last.w !== cw || last.h !== ch) {
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
        canvas.width = Math.floor(cw * dpr);
        canvas.height = Math.floor(ch * dpr);
        lastCanvasDimsRef.current = { dpr, w: cw, h: ch };
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear
      ctx.clearRect(0, 0, cw, ch);

      // Compute paper rect to fit within container (top-aligned, centered horizontally)
      const paddingX = Math.max(12, cw * 0.05);
      const paddingY = 12;
      const availableW = cw - paddingX * 2;
      const availableH = ch - paddingY * 2;
      const { aw, ah } = parseAspect(aspect as any);
      const scale = Math.min(availableW / aw, availableH / ah);
      const paperW = aw * scale;
      const paperH = ah * scale;
      const paperX = paddingX + Math.max(0, (availableW - paperW) / 2);
      const paperY = paddingY; // top-aligned

      // Paper fill (screen space)
      const color = paperColor;
      ctx.save();
      ctx.fillStyle = color;
      ctx.fillRect(paperX, paperY, paperW, paperH);
      ctx.restore();

      // Clip to paper
      ctx.save();
      ctx.beginPath();
      ctx.rect(paperX, paperY, paperW, paperH);
      ctx.clip();
      // Transform origin to paper top-left (no camera yet)
      ctx.translate(paperX, paperY);

      const env: RenderEnv = {
        zoom: 1,
        pixelRatio: dpr,
        size: { w: paperW, h: paperH },
        paperRect: { x: paperX, y: paperY, w: paperW, h: paperH },
        camera: { x: 0, y: 0, zoom: 1 },
      };

      // Draw non-paper layers
      if (layers && layers.length) {
        for (const l of layers as any[]) {
          if (!l.visible || l.type === 'paper') continue;
          const def = getLayerType(l.type);
          def?.adapter.drawMain?.(ctx, l.state, env);
        }
      }

      ctx.restore();
    });
    return () => cancelAnimationFrame(raf);
  }, [aspect, paperColor, layersKey, size.w, size.h]);

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="pt-4 px-6" ref={containerRef}>
        {!active ? (
          <div className="p-8 text-sm text-muted-foreground">No active map.</div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default CanvasViewport;
