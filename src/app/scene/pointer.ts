// Pointer to hex, through the same paper view the renderer draws with (its rect and fit) and the
// hexgrid's size and orientation, with axial (0, 0) at the paper's centre. The fit and the
// camera (epic 04) are undone first.
import { fromPoint } from '@/lib/hex/layout';
import type { Orientation } from '@/lib/hex/types';
import { type PaperAspect, paperView, viewToFitted } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';
import { toPaper } from '../view/camera';

export interface PointerHit {
  /** In paper space (paper px, the paper's fixed size), origin at the paper's top-left. */
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
  const view = paperView(frame.size, frame.paper.aspect as PaperAspect);
  const { rect, size } = view;
  if (view.fit <= 0) return null;
  if (x < rect.x || y < rect.y || x > rect.x + rect.w || y > rect.y + rect.h) return null;
  const point = toPaper(frame.camera, viewToFitted(view, x, y));
  const grid = gridOf(frame);
  const axial = grid
    ? fromPoint(point, { ...grid, origin: { x: size.w / 2, y: size.h / 2 } })
    : null;
  // cube rounding can give -0; `+ 0` makes it 0, so a hex compares and serialises plainly
  const hex = axial ? { q: axial.q + 0, r: axial.r + 0 } : null;
  return { point, hex };
}
