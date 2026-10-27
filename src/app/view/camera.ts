// The one camera (epic 04, architecture §2): where the paper is looked at and how closely.
// `x`, `y` are the paper-space point at the paper's top-left corner of the view, `zoom` scales
// it; the renderer draws `(p - camera) * zoom` (then the view's fit) and hit-testing undoes
// exactly that. View state, never in the document. Zoom 1 shows the whole paper, and the
// camera can't leave it. It works in paper px (epic 07 story 6): view px are divided by the
// view's fit before they get here, by `panByView` and `zoomAtView`.
import { createStore, useStore } from '@preset.nz/app-kit/core';
import { type PaperView, viewToFitted } from '@/render/geometry';

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

/** Paper-space point under a view point (paper px at zoom 1 from the paper's top-left). */
export function toPaper(c: Camera, p: { x: number; y: number }): { x: number; y: number } {
  return { x: p.x / c.zoom + c.x, y: p.y / c.zoom + c.y };
}

/** Zoom by `factor`, keeping the paper point under the view point `at` where it is. */
export function zoomAt(c: Camera, factor: number, at: { x: number; y: number }, paper: Size) {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom * factor));
  const world = toPaper(c, at);
  return clampCamera({ zoom, x: world.x - at.x / zoom, y: world.y - at.y / zoom }, paper);
}

/** Move the view by `(dx, dy)` paper px at zoom 1 (view px over the fit). */
export function panBy(c: Camera, dx: number, dy: number, paper: Size): Camera {
  return clampCamera({ ...c, x: c.x + dx / c.zoom, y: c.y + dy / c.zoom }, paper);
}

/** Pan by `(dx, dy)` canvas px: a drag or a scroll on a paper drawn at `view.fit`. */
export function panByView(c: Camera, view: PaperView, dx: number, dy: number): Camera {
  const f = view.fit || 1;
  return panBy(c, dx / f, dy / f, view.size);
}

/** Zoom by `factor` about the canvas point `(x, y)` on a paper drawn at `view.fit`. */
export function zoomAtView(c: Camera, factor: number, view: PaperView, x: number, y: number) {
  return zoomAt(c, factor, viewToFitted(view, x, y), view.size);
}

const store = createStore<Camera>(FIT);
let paperSize: Size = { w: 0, h: 0 };

export const camera = {
  get: store.get,
  subscribe: store.subscribe,
  use: () => useStore(store),
  /** The paper's size in paper px, from the canvas host: what the camera is clamped to. */
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
  /** Pan by canvas px on the paper `view` shows. */
  pan: (view: PaperView, dx: number, dy: number) =>
    camera.set(panByView(store.get(), view, dx, dy)),
  /** Zoom about a canvas point on the paper `view` shows. */
  zoomAt: (factor: number, view: PaperView, x: number, y: number) =>
    camera.set(zoomAtView(store.get(), factor, view, x, y)),
  /** Zoom about the middle of the view, for the menu. */
  zoomCentre: (factor: number) =>
    camera.set(zoomAt(store.get(), factor, { x: paperSize.w / 2, y: paperSize.h / 2 }, paperSize)),
  fit: () => camera.set(FIT),
};
