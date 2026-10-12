import { useMirror } from '@preset.nz/pom';
import { useEffect, useRef } from 'react';
import RenderService from '@/render/service';
import { nextActiveMap } from './scene/active-map';
import { createFrameBuilder, type FrameBuilder, MAPS_PATH } from './scene/frame';

/**
 * Mounts a canvas, hands it to the render worker, and draws the active map from the document
 * mirror whenever the mirror or the window size changes.
 */
export function CanvasHost() {
  const mirror = useMirror();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    // A canvas transfers to a worker once. StrictMode runs this effect twice in
    // development, so each run makes its own canvas rather than reusing a JSX one.
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 h-full w-full';
    wrap.appendChild(canvas);
    const svc = new RenderService();
    if (!svc.init(canvas, window.devicePixelRatio || 1)) {
      canvas.remove();
      return;
    }

    // The builder's memo is per schema: a new document brings a new one.
    let schema = mirror.schema;
    let builder: FrameBuilder = createFrameBuilder(schema);
    let active: string | null = null;
    let known: readonly string[] = [];
    let lastSize = { w: 0, h: 0, dpr: 0 };

    const draw = () => {
      const size = { w: wrap.clientWidth, h: wrap.clientHeight };
      if (size.w < 1 || size.h < 1) return;
      const dpr = window.devicePixelRatio || 1;
      if (size.w !== lastSize.w || size.h !== lastSize.h || dpr !== lastSize.dpr) {
        svc.resize(size, dpr);
        lastSize = { ...size, dpr };
      }
      if (mirror.schema !== schema) {
        schema = mirror.schema;
        builder = createFrameBuilder(schema);
      }
      const maps = mirror.nodeAt(MAPS_PATH)?.orders?.maps ?? [];
      active = nextActiveMap(active, known, maps);
      known = maps;
      svc.render(builder.build(mirror, active, size, dpr));
    };
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    const unsubscribe = mirror.subscribe(draw);
    draw();
    return () => {
      unsubscribe();
      observer.disconnect();
      svc.destroy();
      canvas.remove();
    };
  }, [mirror]);

  return <div ref={wrapRef} className="relative h-full w-full overflow-hidden" />;
}
