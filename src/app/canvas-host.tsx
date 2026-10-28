import { useMirror } from '@preset.nz/pom';
import { useEffect, useRef } from 'react';
import { type PaperAspect, paperView } from '@/render/geometry';
import RenderService from '@/render/service';
import type { SceneFrame } from '@/render/types';
import { exportFrame, type MapExporter, mapExporter, setMapExporter } from './export/render';
import { createFrameBuilder, type FrameBuilder } from './scene/frame';
import { hitTest, type PointerHit } from './scene/pointer';
import { tauriTextureLoader } from './scene/textures';
import { activeMapId, selection } from './selection';
import { outlineDraft } from './tools/outline';
import { pointerHex } from './tools/tools';
import { camera } from './view/camera';

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
    const textures = tauriTextureLoader((path, bitmap) => svc.texture(path, bitmap));
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
        camera.get(),
      );
      // the camera is clamped to the paper, in paper px: its size follows the aspect alone
      camera.setPaper(paperView(size, lastFrame.paper.aspect as PaperAspect).size);
      textures.want(lastFrame);
      svc.render(lastFrame);
    };
    // The export draws the active map at Fit: the same frame without the camera or the tool
    // preview, on the map's paper size, whatever the window (epic 07 stories 3 and 6).
    // Any map of the campaign can be drawn the same way, for the campaign's PDF (epic 32).
    const exporter: MapExporter = {
      target: svc,
      current() {
        const mapId = activeMapId(selection.get(), mirror);
        return mapId ? exporter.of(mapId) : null;
      },
      of(mapId) {
        if (lastSize.w < 1 || lastSize.h < 1) return null;
        const size = { w: lastSize.w, h: lastSize.h };
        const frame = builder.build(mirror, mapId, size, lastSize.dpr);
        if (frame.layers.length === 0) return null;
        return exportFrame(frame);
      },
      prepare: (frame) => textures.ready(frame),
    };
    setMapExporter(exporter);

    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    const unsubscribe = mirror.subscribe(draw);
    const unselect = selection.subscribe(draw);
    const undraft = outlineDraft.subscribe(draw);
    const uncamera = camera.subscribe(draw);
    draw();

    // A texture file that was missing is tried again when the window regains focus, so putting
    // it back brings the texture without a reopen (epic 18 story 3).
    const refocus = () => {
      if (textures.retryMissing()) draw();
    };
    window.addEventListener('focus', refocus);

    // Space held pans by dragging: the one held-gesture key (CLAUDE.md), so a stroke can pan
    let spaceHeld = false;
    let panFrom: { x: number; y: number } | null = null;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e.target)) return;
      spaceHeld = down;
      wrap.style.cursor = down ? 'grab' : '';
      if (!down) panFrom = null;
    };
    const keydown = onKey(true);
    const keyup = onKey(false);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    const viewOf = (f: SceneFrame) => paperView(f.size, f.paper.aspect as PaperAspect);
    const pointer = (kind: PointerKind) => (e: PointerEvent) => {
      if (!lastFrame) return;
      const box = wrap.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (kind === 'down' && spaceHeld) {
        panFrom = { x, y };
        wrap.setPointerCapture(e.pointerId);
        return;
      }
      if (panFrom) {
        if (kind === 'move') {
          camera.pan(viewOf(lastFrame), panFrom.x - x, panFrom.y - y);
          panFrom = { x, y };
        } else if (kind === 'up' || kind === 'cancel') panFrom = null;
        return;
      }
      const hit = hitTest(lastFrame, x, y);
      pointerHex.set(hit?.hex ?? null);
      if (kind === 'down') wrap.setPointerCapture(e.pointerId);
      pointerRef.current?.(kind, hit, lastFrame, e);
    };
    // Scroll pans; pinch or Cmd+scroll zooms about the cursor
    const wheel = (e: WheelEvent) => {
      if (!lastFrame) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const box = wrap.getBoundingClientRect();
        camera.zoomAt(
          Math.exp(-e.deltaY * 0.01),
          viewOf(lastFrame),
          e.clientX - box.left,
          e.clientY - box.top,
        );
      } else {
        camera.pan(viewOf(lastFrame), e.deltaX, e.deltaY);
      }
    };
    wrap.addEventListener('wheel', wheel, { passive: false });
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
      wrap.removeEventListener('wheel', wheel);
      window.removeEventListener('focus', refocus);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      unsubscribe();
      unselect();
      undraft();
      uncamera();
      observer.disconnect();
      if (mapExporter() === exporter) setMapExporter(null);
      svc.destroy();
      canvas.remove();
    };
  }, [mirror]);

  return <div ref={wrapRef} className="relative h-full w-full overflow-hidden" />;
}
