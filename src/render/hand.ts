// Drawing by hand (design/drawing-by-hand.md): a stroke ruled, pen-drawn or scratched in. The
// three hands' numbers are written here once, as that doc's table gives them. Every wobble is
// seeded, so a node redraws, exports and reopens with the same one; callers seed each stroke
// with the node's id and the stroke's name, so a stroke keeps its wobble when another changes.
import { createRNG } from '@/lib/random';

export type Hand = 'clean' | 'drawn' | 'scratched';

export interface Pt {
  x: number;
  y: number;
}

interface HandSpec {
  /** Paper px between the knots the wobble passes through. */
  knot: number;
  /** The most a knot sits off the line, in paper px. */
  amp: number;
  /** The most an open stroke runs past each end, in paper px. */
  overshoot: number;
  /** The most a line of text leans, in degrees. */
  tilt: number;
  /** Whether every stroke is gone over a second time. */
  twice: boolean;
}

export const HANDS: Record<Exclude<Hand, 'clean'>, HandSpec> = {
  drawn: { knot: 18, amp: 1.1, overshoot: 2, tilt: 1.5, twice: false },
  scratched: { knot: 11, amp: 1.8, overshoot: 6, tilt: 3, twice: true },
};

/** The second stroke's width, as a fraction of the first's. */
export const SECOND_STROKE = 0.6;
/** Points drawn per knot, so the eased wobble reads as a curve. */
const STEPS_PER_KNOT = 4;

/** A stored `hand` value as a hand; anything else (`map` unresolved, missing) is `clean`. */
export function handOf(v: unknown): Hand {
  return v === 'drawn' || v === 'scratched' ? v : 'clean';
}

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Points along `a`→`b`, `from` to `to` px along it, pushed sideways by eased noise through
 * knots `spec.knot` apart. `pinned` holds the first and last knots on the line, so a closed
 * outline meets itself at its corners.
 */
function wobble(
  a: Pt,
  b: Pt,
  from: number,
  to: number,
  spec: HandSpec,
  rng: ReturnType<typeof createRNG>,
  pinned: boolean,
): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len === 0) return [a, b];
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const knots = Math.max(1, Math.ceil((to - from) / spec.knot));
  const offs = Array.from({ length: knots + 1 }, () => (rng.float() * 2 - 1) * spec.amp);
  if (pinned) {
    offs[0] = 0;
    offs[knots] = 0;
  }
  const steps = knots * STEPS_PER_KNOT;
  const out: Pt[] = [];
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    const s = from + (to - from) * t;
    const k = Math.min(knots - 1, Math.floor(t * knots));
    const f = ease(t * knots - k);
    const off = offs[k] + (offs[k + 1] - offs[k]) * f;
    out.push({ x: a.x + ux * s - uy * off, y: a.y + uy * s + ux * off });
  }
  return out;
}

/**
 * An open stroke from `a` to `b` in `hand`: clean is the two ends; drawn and scratched wobble
 * and overshoot each end by a seeded amount.
 */
export function handLine(a: Pt, b: Pt, hand: Hand, seed: string): Pt[] {
  if (hand === 'clean') return [a, b];
  const spec = HANDS[hand];
  const rng = createRNG(seed);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const from = -rng.float() * spec.overshoot;
  const to = len + rng.float() * spec.overshoot;
  return wobble(a, b, from, to, spec, rng, false);
}

/**
 * A side of a shape from `a` to `b` in `hand`: wobbled like a stroke but held at both ends, so
 * shapes that share the side meet along it. Clean is the two ends.
 */
export function handEdge(a: Pt, b: Pt, hand: Hand, seed: string): Pt[] {
  if (hand === 'clean') return [a, b];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return wobble(a, b, 0, len, HANDS[hand], createRNG(seed), true);
}

/**
 * A closed outline through `corners` in `hand`: each corner nudged by up to the hand's
 * amplitude, each side wobbled between them. Clean is the corners as given.
 */
export function handOutline(corners: Pt[], hand: Hand, seed: string): Pt[] {
  if (hand === 'clean') return corners;
  const spec = HANDS[hand];
  const rng = createRNG(seed);
  const nudged = corners.map((c) => ({
    x: c.x + (rng.float() * 2 - 1) * spec.amp,
    y: c.y + (rng.float() * 2 - 1) * spec.amp,
  }));
  const out: Pt[] = [];
  for (let i = 0; i < nudged.length; i++) {
    const a = nudged[i];
    const b = nudged[(i + 1) % nudged.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    // each side ends where the next begins, so its last point is left to the next side
    out.push(...wobble(a, b, 0, len, spec, rng, true).slice(0, -1));
  }
  return out;
}

/**
 * A circle of radius `r` about `c` in `hand`, as a closed outline: clean is a fine polygon,
 * drawn and scratched push it in and out by eased noise through knots `knot` apart round it,
 * meeting itself where it starts.
 */
export function handRing(c: Pt, r: number, hand: Hand, seed: string): Pt[] {
  const around = 2 * Math.PI * r;
  if (hand === 'clean') {
    const n = Math.max(24, Math.ceil(around / 4));
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 2 * Math.PI;
      return { x: c.x + r * Math.sin(a), y: c.y - r * Math.cos(a) };
    });
  }
  const spec = HANDS[hand];
  const rng = createRNG(seed);
  const knots = Math.max(3, Math.ceil(around / spec.knot));
  const offs = Array.from({ length: knots }, () => (rng.float() * 2 - 1) * spec.amp);
  const steps = knots * STEPS_PER_KNOT;
  const out: Pt[] = [];
  for (let j = 0; j < steps; j++) {
    const t = (j / steps) * knots;
    const k = Math.floor(t);
    const off = offs[k] + (offs[(k + 1) % knots] - offs[k]) * ease(t - k);
    const a = (j / steps) * 2 * Math.PI;
    out.push({ x: c.x + (r + off) * Math.sin(a), y: c.y - (r + off) * Math.cos(a) });
  }
  return out;
}

/**
 * Strokes the circle of radius `r` about `c` in `hand` at `width`. Scratched goes round again,
 * thinner, with a wobble of its own.
 */
export function strokeRing(ctx: Pen, c: Pt, r: number, hand: Hand, seed: string, width: number) {
  ctx.lineWidth = width;
  trace(ctx, handRing(c, r, hand, seed));
  ctx.closePath();
  ctx.stroke();
  if (hand !== 'clean' && HANDS[hand].twice) {
    ctx.lineWidth = width * SECOND_STROKE;
    trace(ctx, handRing(c, r, hand, `${seed}:again`));
    ctx.closePath();
    ctx.stroke();
  }
}

/** How far a stroke in `hand` can stray past where it is drawn: its wobble and overshoot. */
export function handStray(hand: Hand): number {
  return hand === 'clean' ? 0 : HANDS[hand].amp + HANDS[hand].overshoot;
}

/** How far a line of text leans in `hand`, in radians; clean is upright. */
export function handTilt(hand: Hand, seed: string): number {
  if (hand === 'clean') return 0;
  return (((createRNG(seed).float() * 2 - 1) * HANDS[hand].tilt) / 180) * Math.PI;
}

type Pen = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'stroke' | 'fill' | 'lineWidth'
>;

function trace(ctx: Pen, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
}

/**
 * Strokes `a`→`b` in `hand` at `width`, in the context's stroke style. Scratched goes over it
 * again, thinner, with a wobble of its own.
 */
export function strokeByHand(ctx: Pen, a: Pt, b: Pt, hand: Hand, seed: string, width: number) {
  ctx.lineWidth = width;
  trace(ctx, handLine(a, b, hand, seed));
  ctx.stroke();
  if (hand !== 'clean' && HANDS[hand].twice) {
    ctx.lineWidth = width * SECOND_STROKE;
    trace(ctx, handLine(a, b, hand, `${seed}:again`));
    ctx.stroke();
  }
}

/**
 * Strokes the side `a`→`b` in `hand` at `width`, held at both ends (`handEdge`). Scratched goes
 * over it again, thinner, with a wobble of its own.
 */
export function strokeEdge(ctx: Pen, a: Pt, b: Pt, hand: Hand, seed: string, width: number) {
  ctx.lineWidth = width;
  trace(ctx, handEdge(a, b, hand, seed));
  ctx.stroke();
  if (hand !== 'clean' && HANDS[hand].twice) {
    ctx.lineWidth = width * SECOND_STROKE;
    trace(ctx, handEdge(a, b, hand, `${seed}:again`));
    ctx.stroke();
  }
}

/** Fills the closed outline through `pts` as given, in the context's fill style. */
export function fillOutline(ctx: Pen, pts: Pt[]) {
  trace(ctx, pts);
  ctx.closePath();
  ctx.fill();
}

/** Fills the outline through `corners` in `hand`, in the context's fill style. */
export function fillByHand(ctx: Pen, corners: Pt[], hand: Hand, seed: string) {
  trace(ctx, handOutline(corners, hand, seed));
  ctx.closePath();
  ctx.fill();
}

/** A rectangle's corners, clockwise from the top left. */
export function rectCorners(x: number, y: number, w: number, h: number): Pt[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}
