// The one camera (epic 04, architecture §2): where the paper is looked at and how closely.
// `x`, `y` are the paper-space point at the paper's top-left corner of the view, `zoom` scales
// it; the renderer draws `(p - camera) * zoom` and hit-testing undoes exactly that. View state,
// never in the document. Zoom 1 shows the whole paper, and the camera can't leave it.
import { createStore, useStore } from '@preset.nz/app-kit/core';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const FIT: Camera = { x: 0, y: 0, zoom: 1 };
export const MAX_ZOOM = 8;
/** One Zoom In or Out step. */
export const ZOOM_STEP = 1.5;

type Size = { w: number; h: number };

/** Zoom within 1..MAX_ZOOM, and the view kept on the paper. */
export function clampCamera(c: Camera, paper: Size): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom));
  const maxX = Math.max(0, paper.w - paper.w / zoom);
  const maxY = Math.max(0, paper.h - paper.h / zoom);
  const x = Math.min(maxX, Math.max(0, c.x)) + 0;
  const y = Math.min(maxY, Math.max(0, c.y)) + 0;
  return x === c.x && y === c.y && zoom === c.zoom ? c : { x, y, zoom };
}

/** Paper-space point under a view point (paper pixels from the paper's top-left). */
export function toPaper(c: Camera, p: { x: number; y: number }): { x: number; y: number } {
  return { x: p.x / c.zoom + c.x, y: p.y / c.zoom + c.y };
}

/** Zoom by `factor`, keeping the paper point under the view point `at` where it is. */
export function zoomAt(c: Camera, factor: number, at: { x: number; y: number }, paper: Size) {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom * factor));
  const world = toPaper(c, at);
  return clampCamera({ zoom, x: world.x - at.x / zoom, y: world.y - at.y / zoom }, paper);
}

/** Move the view by `(dx, dy)` view pixels (a scroll or a drag). */
export function panBy(c: Camera, dx: number, dy: number, paper: Size): Camera {
  return clampCamera({ ...c, x: c.x + dx / c.zoom, y: c.y + dy / c.zoom }, paper);
}

const store = createStore<Camera>(FIT);
let paperSize: Size = { w: 0, h: 0 };

export const camera = {
  get: store.get,
  subscribe: store.subscribe,
  use: () => useStore(store),
  /** The paper's size in pixels, from the canvas host: what the camera is clamped to. */
  setPaper(size: Size) {
    paperSize = size;
    const now = store.get();
    const next = clampCamera(now, size);
    if (next !== now) store.set(next);
  },
  set(c: Camera) {
    const next = clampCamera(c, paperSize);
    const now = store.get();
    if (next.x !== now.x || next.y !== now.y || next.zoom !== now.zoom) store.set(next);
  },
  pan: (dx: number, dy: number) => camera.set(panBy(store.get(), dx, dy, paperSize)),
  zoomAt: (factor: number, at: { x: number; y: number }) =>
    camera.set(zoomAt(store.get(), factor, at, paperSize)),
  /** Zoom about the middle of the view, for the menu. */
  zoomCentre: (factor: number) => camera.zoomAt(factor, { x: paperSize.w / 2, y: paperSize.h / 2 }),
  fit: () => camera.set(FIT),
};
