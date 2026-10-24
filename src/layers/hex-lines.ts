import { corners } from '@/lib/hex/layout';
import type { Point } from '@/lib/hex/types';
import { createRNG } from '@/lib/random';

export type HexOrientation = 'pointy' | 'flat';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dash-dot';

export type Edge = readonly [Point, Point];

const SQRT3 = Math.sqrt(3);

/** A grid corner's place in the lattice, whichever hex or loop reaches it. */
export interface CornerKey {
  u: number;
  v: number;
}

/**
 * Where a corner sits in the hex lattice anchored at `origin` (the tiling centre), as two
 * integers. Corners of a hex of radius `size` lie on a lattice whose steps are
 * `size * sqrt(3) / 2` and `size / 2` (pointy; swapped for flat), so rounding the offset in
 * those steps gives a key that is the same from all three hexes meeting there, ignores
 * floating-point drift, and doesn't depend on the tiling loop or the canvas size.
 */
export function cornerKey(
  p: Point,
  origin: Point,
  size: number,
  orientation: HexOrientation,
): CornerKey {
  const wide = (size * SQRT3) / 2;
  const half = size / 2;
  const sx = orientation === 'pointy' ? wide : half;
  const sy = orientation === 'pointy' ? half : wide;
  return {
    u: Math.round((p.x - origin.x) / sx) + 0,
    v: Math.round((p.y - origin.y) / sy) + 0,
  };
}

/** The seed as a 32-bit number, for the per-corner hash. */
export function seedBase(seed: string): number {
  return Math.floor(createRNG(seed).float() * 4294967296) >>> 0;
}

/** Two well-mixed floats in [0, 1) for a lattice corner, from the seed's base and the key. */
function cornerHash(base: number, key: CornerKey): [number, number] {
  let h = (base ^ Math.imul(key.u | 0, 0x27d4eb2d) ^ Math.imul(key.v | 0, 0x165667b1)) >>> 0;
  const mix = () => {
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    h = Math.imul(h, 0x297a2d39);
    h ^= h >>> 15;
    h >>>= 0;
    return h / 4294967296;
  };
  mix();
  return [mix(), mix()];
}

/** A corner's seeded move: a random direction, a distance up to `amount` (uniform on a disc). */
export function cornerOffset(base: number, key: CornerKey, amount: number): Point {
  if (!(amount > 0)) return { x: 0, y: 0 };
  const [a, d] = cornerHash(base, key);
  const angle = a * Math.PI * 2;
  const dist = amount * Math.sqrt(d);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

/** The whole grid's shift: `amount` px in a direction the seed picks. */
export function misregistrationShift(seed: string, amount: number): Point {
  if (!(amount > 0)) return { x: 0, y: 0 };
  const angle = createRNG(`${seed}:misregistration`).float() * Math.PI * 2;
  return { x: Math.cos(angle) * amount, y: Math.sin(angle) * amount };
}

/** How the grid is knocked about: all in paper pixels, all optional. */
export interface EdgeWobble {
  /** The tiling centre, which anchors the corner lattice. */
  origin: Point;
  /** `seedBase` of the seed text. */
  base: number;
  /** Largest corner move. */
  jitter: number;
  /** Move for every point, applied after the jitter. */
  shift: Point;
}

/**
 * The three edges of a hex that it alone draws: corner 0 to corner 3, so edges 0-1, 1-2 and
 * 2-3. Pointy that is east, south-east and south-west; flat it is south-east, south and
 * south-west. Each hex's other three edges (the opposite ones) are some neighbour's, because
 * the neighbour across an owned edge sees it as one of its own unowned three. So over a
 * tiling every edge is drawn exactly once.
 *
 * With `wobble`, each corner moves by its seeded jitter, found from its place in the lattice,
 * so the edges that meet there move together, and then everything shifts by the
 * misregistration.
 */
export function ownedEdges(
  center: Point,
  size: number,
  orientation: HexOrientation,
  wobble?: EdgeWobble,
): Edge[] {
  const raw = corners(center, { size, orientation, origin: { x: 0, y: 0 } }).slice(0, 4);
  const pts = wobble
    ? raw.map((p) => {
        const o = cornerOffset(
          wobble.base,
          cornerKey(p, wobble.origin, size, orientation),
          wobble.jitter,
        );
        return { x: p.x + o.x + wobble.shift.x, y: p.y + o.y + wobble.shift.y };
      })
    : raw;
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
