// The outline tool: what a click on a hex corner does to a layer's `paths` (2025's
// `outlineTool`, on the document). A click appends to the open path, or starts one; clicking the
// first corner closes it, and clicking the last corner again ends it. Each click is one
// `outline.draw`, so undo takes a corner back. Which path is open and which corner the pointer
// is near are tool state, never in the document.
import { createStore, useStore } from '@preset.nz/app-kit/core';
import type { Layout } from '@/lib/hex';
import { findNearestCorner, interpolateCorners } from '@/lib/outline/geometry';
import type { OutlineCorner, OutlineCornerIndex } from '@/lib/outline/types';
import { cornersEqual } from '@/lib/outline/types';

/** A path as the document stores it: flat corners. */
export interface StoredCorner {
  q: number;
  r: number;
  corner: number;
}
export interface StoredPath {
  corners: StoredCorner[];
  closed: boolean;
}

/** How close, in paper pixels, a pointer must be to a corner to pick it. */
export const TOLERANCE_PX = 14;

export const toCorner = (c: StoredCorner): OutlineCorner => ({
  hex: { q: c.q, r: c.r },
  corner: c.corner as OutlineCornerIndex,
});
export const toStored = (c: OutlineCorner): StoredCorner => ({
  q: c.hex.q,
  r: c.hex.r,
  corner: c.corner,
});

export interface OutlineDraft {
  /** The layer being drawn on; the draft means nothing for any other. */
  layerId: string | null;
  /** True while the layer's last path is open and being extended. */
  active: boolean;
  hover: OutlineCorner | null;
}

const IDLE: OutlineDraft = { layerId: null, active: false, hover: null };
const draft = createStore<OutlineDraft>(IDLE);

export const outlineDraft = {
  get: draft.get,
  subscribe: draft.subscribe,
  use: () => useStore(draft),
  reset: () => {
    if (draft.get() !== IDLE) draft.set(IDLE);
  },
  hover(layerId: string, hover: OutlineCorner | null) {
    const d = draft.get();
    const same = d.layerId === layerId && (d.hover === hover || cornersEqual(d.hover, hover));
    if (same) return;
    draft.set({ layerId, active: d.layerId === layerId && d.active, hover });
  },
  set: (d: OutlineDraft) => draft.set(d),
};

/** True when `paths` ends in an open path that the draft says is being drawn. */
export function openPath(paths: readonly StoredPath[], d: OutlineDraft, layerId: string): boolean {
  const last = paths[paths.length - 1];
  return d.layerId === layerId && d.active && last !== undefined && !last.closed;
}

export interface Step {
  paths: StoredPath[];
  active: boolean;
}

/** A click on `corner`. Returns the new paths and whether a path is still open, or null for no change. */
export function click(
  paths: StoredPath[],
  active: boolean,
  corner: OutlineCorner,
  layout: Layout,
): Step | null {
  const last = paths[paths.length - 1];
  if (!active || !last || last.closed) {
    return { paths: [...paths, { corners: [toStored(corner)], closed: false }], active: true };
  }
  const tail = last.corners[last.corners.length - 1];
  if (tail && cornersEqual(toCorner(tail), corner)) {
    // the last corner again ends the path
    return last.corners.length < 2
      ? { paths: paths.slice(0, -1), active: false }
      : { paths, active: false };
  }
  const steps = interpolateCorners(tail ? toCorner(tail) : null, corner, layout).map(toStored);
  const corners = [...last.corners, ...steps];
  const first = last.corners[0];
  const closes = first !== undefined && cornersEqual(toCorner(first), corner) && corners.length > 2;
  return {
    paths: [...paths.slice(0, -1), { corners, closed: closes }],
    active: !closes,
  };
}

/** The corner under a point in paper pixels, or null. */
export function cornerAt(point: { x: number; y: number }, layout: Layout): OutlineCorner | null {
  return findNearestCorner(point, layout, TOLERANCE_PX);
}
