"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';

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
  const project = useProjectStore((s) => s.current);
  const active = useMemo(() => {
    if (!project) return null;
    return project.maps.find((m) => m.id === project.activeMapId) ?? null;
  }, [project]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Resize observer
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        const nw = Math.floor(cr.width);
        const nh = Math.floor(cr.height);
        setSize((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
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
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear
      ctx.clearRect(0, 0, cw, ch);

      // Compute paper rect (90% width, top-aligned)
      const paddingX = cw * 0.05;
      const availableW = cw * 0.9;
      const { aw, ah } = parseAspect(active?.paper?.aspect ?? '16:10');
      const paperW = availableW;
      const paperH = (paperW * ah) / aw;
      const paperX = paddingX;
      const paperY = 16; // small top padding

      // Paper fill (screen space)
      const paperColor = active?.paper?.color ?? '#ffffff';
      ctx.save();
      ctx.fillStyle = paperColor;
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
      if (active?.layers) {
        for (const l of active.layers) {
          if (!l.visible || l.type === 'paper' || l.type === 'hexgrid') continue; // temporarily disable hexgrid draw for INP diagnostics
          const def = getLayerType(l.type);
          def?.adapter.drawMain?.(ctx, l.state, env);
        }
      }

      ctx.restore();
    });
    return () => cancelAnimationFrame(raf);
  }, [project, active, size.w, size.h]);

  return (
    <div className="h-full w-full overflow-auto">
      <div className="pt-6 px-6 pb-24" ref={containerRef}>
        {!project || !active ? (
          <div className="p-8 text-sm text-muted-foreground">No active map.</div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-[60vh] border rounded-md shadow-sm" />
        )}
        {/* Small spacer to maintain scrollability without heavy paint */}
        <div className="h-64" aria-hidden="true" />
      </div>
    </div>
  );
};

export default CanvasViewport;
