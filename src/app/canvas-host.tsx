// Smoke frame: replaced by the POM mirror in epic 15.
import { useEffect, useRef } from 'react';
import RenderService from '@/render/service';
import { smokeFrame } from './smoke-frame';

/** Mounts a canvas, hands it to the render worker and draws the smoke frame at the window's size. */
export function CanvasHost() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const svc = new RenderService();
    if (!svc.init(canvas, window.devicePixelRatio || 1)) return;

    const draw = () => {
      const size = { w: wrap.clientWidth, h: wrap.clientHeight };
      if (size.w < 1 || size.h < 1) return;
      const dpr = window.devicePixelRatio || 1;
      svc.resize(size, dpr);
      svc.render(smokeFrame(size, dpr));
    };
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    draw();
    return () => {
      observer.disconnect();
      svc.destroy();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
