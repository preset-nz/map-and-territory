import { useMirror } from '@preset.nz/pom';
import { useEffect, useRef } from 'react';
import RenderService from '@/render/service';
import type { SceneFrame } from '@/render/types';
import { createFrameBuilder, type FrameBuilder } from './scene/frame';
import { hitTest, type PointerHit } from './scene/pointer';
import { activeMapId, selection } from './selection';
import { outlineDraft } from './tools/outline';
import { pointerHex } from './tools/tools';

export type PointerKind = 'down' | 'move' | 'up' | 'cancel';

/** A pointer event on the paper, for the active tool: the hit and the frame it was tested on. */
export type OnPointer = (
  kind: PointerKind,
  hit: PointerHit | null,
  frame: SceneFrame,
  e: PointerEvent,
) => void;

/**
 * Mounts a canvas, hands it to the render worker, and draws the active map from the document
 * mirror whenever the mirror, the selection or the canvas size changes.
 */
export function CanvasHost({ onPointer }: { onPointer?: OnPointer }) {
  const mirror = useMirror();
  const wrapRef = useRef<HTMLDivElement>(null);
  // the latest handler, so a new one doesn't remount the canvas
  const pointerRef = useRef(onPointer);
  pointerRef.current = onPointer;

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
    let lastSize = { w: 0, h: 0, dpr: 0 };
    let lastFrame: SceneFrame | null = null;

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
      lastFrame = builder.build(
        mirror,
        activeMapId(selection.get(), mirror),
        size,
        dpr,
        outlineDraft.get(),
      );
      svc.render(lastFrame);
    };
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    const unsubscribe = mirror.subscribe(draw);
    const unselect = selection.subscribe(draw);
    const undraft = outlineDraft.subscribe(draw);
    draw();

    const pointer = (kind: PointerKind) => (e: PointerEvent) => {
      if (!lastFrame) return;
      const box = wrap.getBoundingClientRect();
      const hit = hitTest(lastFrame, e.clientX - box.left, e.clientY - box.top);
      pointerHex.set(hit?.hex ?? null);
      if (kind === 'down') wrap.setPointerCapture(e.pointerId);
      pointerRef.current?.(kind, hit, lastFrame, e);
    };
    const handlers: [string, (e: PointerEvent) => void][] = [
      ['pointerdown', pointer('down')],
      ['pointermove', pointer('move')],
      ['pointerup', pointer('up')],
      ['pointercancel', pointer('cancel')],
      ['lostpointercapture', pointer('cancel')],
    ];
    for (const [type, f] of handlers) wrap.addEventListener(type, f as EventListener);
    const leave = () => pointerHex.set(null);
    wrap.addEventListener('pointerleave', leave);

    return () => {
      for (const [type, f] of handlers) wrap.removeEventListener(type, f as EventListener);
      wrap.removeEventListener('pointerleave', leave);
      unsubscribe();
      unselect();
      undraft();
      observer.disconnect();
      svc.destroy();
      canvas.remove();
    };
  }, [mirror]);

  return <div ref={wrapRef} className="relative h-full w-full overflow-hidden" />;
}
