// Pointer to hex, through the same paper rect the renderer clips to and the hexgrid's size and
// orientation, with axial (0, 0) at the paper's centre. The camera (epic 04) is undone first.
import { fromPoint } from '@/lib/hex/layout';
import type { Orientation } from '@/lib/hex/types';
import { computePaperRect, type PaperAspect } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';
import { toPaper } from '../view/camera';

export interface PointerHit {
  /** In paper space (the paper's pixels at zoom 1), origin at the paper's top-left. */
  point: { x: number; y: number };
  hex: { q: number; r: number } | null;
}

/** The grid a frame draws: its hexgrid layer's size and orientation. */
export function gridOf(frame: SceneFrame): { size: number; orientation: Orientation } | null {
  const grid = frame.layers.find((l) => l.type === 'hexgrid');
  if (!grid) return null;
  const s = grid.state as { size?: unknown; orientation?: unknown };
  return {
    size: Math.max(4, Number(s.size ?? 24)),
    orientation: s.orientation === 'flat' ? 'flat' : 'pointy',
  };
}

/** Where a pointer at `(x, y)` in canvas pixels lands; null when it is off the paper. */
export function hitTest(frame: SceneFrame, x: number, y: number): PointerHit | null {
  const paper = computePaperRect({
    canvasSize: frame.size,
    paper: { aspect: frame.paper.aspect as PaperAspect },
  });
  const view = { x: x - paper.x, y: y - paper.y };
  if (view.x < 0 || view.y < 0 || view.x > paper.w || view.y > paper.h) return null;
  const point = toPaper(frame.camera, view);
  const grid = gridOf(frame);
  const axial = grid
    ? fromPoint(point, { ...grid, origin: { x: paper.w / 2, y: paper.h / 2 } })
    : null;
  // cube rounding can give -0; `+ 0` makes it 0, so a hex compares and serialises plainly
  const hex = axial ? { q: axial.q + 0, r: axial.r + 0 } : null;
  return { point, hex };
}
