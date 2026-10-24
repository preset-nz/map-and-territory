import { corners } from '@/lib/hex/layout';
import type { Point } from '@/lib/hex/types';

export type HexOrientation = 'pointy' | 'flat';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dash-dot';

export type Edge = readonly [Point, Point];

/**
 * The three edges of a hex that it alone draws: corner 0 to corner 3, so edges 0-1, 1-2 and
 * 2-3. Pointy that is east, south-east and south-west; flat it is south-east, south and
 * south-west. Each hex's other three edges (the opposite ones) are some neighbour's, because
 * the neighbour across an owned edge sees it as one of its own unowned three. So over a
 * tiling every edge is drawn exactly once.
 */
export function ownedEdges(center: Point, size: number, orientation: HexOrientation): Edge[] {
  const pts = corners(center, { size, orientation, origin: { x: 0, y: 0 } });
  return [
    [pts[0]!, pts[1]!],
    [pts[1]!, pts[2]!],
    [pts[2]!, pts[3]!],
  ];
}

export interface DashPlan {
  /** For `setLineDash`; empty is a solid line. */
  pattern: number[];
  /** For `lineDashOffset`: starts every edge in the middle of the first mark. */
  offset: number;
  /** Whole repeats along one edge. */
  periods: number;
}

const SOLID: DashPlan = { pattern: [], offset: 0, periods: 0 };

/**
 * The dash pattern for an edge of `edgeLength`, drawn with round caps at `lineWidth`.
 * `dash` and `gap` are in line widths and are what shows: a round cap adds half a width to
 * each end of a mark, so a mark's canvas length is `dash - 1` widths (a dot is zero) and a
 * canvas gap is `gap + 1`. The whole pattern is then scaled so a whole number of repeats
 * fits the edge, and the offset puts the edge's start, and so its end, in the middle of the
 * first mark, where a corner gets ink from both edges that meet there.
 */
export function fitDashPattern(
  style: LineStyle,
  dash: number,
  gap: number,
  lineWidth: number,
  edgeLength: number,
): DashPlan {
  if (style === 'solid' || !(lineWidth > 0) || !(edgeLength > 0)) return SOLID;
  const mark = Math.max(0, dash - 1) * lineWidth;
  const space = (Math.max(0, gap) + 1) * lineWidth;
  const base =
    style === 'dashed' ? [mark, space] : style === 'dotted' ? [0, space] : [mark, space, 0, space];
  const period = base.reduce((a, b) => a + b, 0);
  const periods = Math.max(1, Math.round(edgeLength / period));
  const scale = edgeLength / (periods * period);
  const pattern = base.map((v) => v * scale);
  return { pattern, offset: pattern[0]! / 2, periods };
}
