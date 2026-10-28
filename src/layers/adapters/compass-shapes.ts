// The compass's shapes (epic 24, disco-02), written once as fractions of its radius `R`, half of
// `size`, from the reference values on the map furniture examples page. Every point is split
// into an inked half and a paper half, so a compass reads in one ink. A shape is its sides,
// each named so the hand wobbles it once and both halves that share it follow the same line,
// and the halves that fill between them.
import type { Pt } from '@/render/hand';

export type CompassStyle = 'mark' | 'arrow' | 'cross';

/** The backing disc's radius. */
export const BACKING = 1.32;
/** `arrow`: the base corners' half-width and depth below the centre, and the notch's. */
export const ARROW = { halfWidth: 0.3, base: 0.75, notch: 0.42 };
/** `cross`: four points, each this wide at its base. */
export const CROSS = { points: 4, waist: 0.2 };
/** `mark`: the crossbar sits this far above the centre, reaching this far each side. */
export const MARK = { bar: 0.12, reach: 0.62 };
/** `mark`'s stroke width, as a fraction of `size`, and its least, in paper px. */
export const MARK_WIDTH = 0.05;
export const MARK_MIN_WIDTH = 2.5;
/** The outline drawn round each half, as a fraction of `size`, and its least, in paper px. */
export const OUTLINE = 1 / 120;
export const OUTLINE_MIN = 0.75;

export interface Side {
  a: Pt;
  b: Pt;
}

export interface Half {
  ink: boolean;
  /** Sides in order round the half; `true` runs the side from `b` to `a`. */
  sides: [name: string, reversed: boolean][];
}

export interface Stroke {
  name: string;
  a: Pt;
  b: Pt;
  width: number;
}

export interface CompassShape {
  sides: Record<string, Side>;
  halves: Half[];
  /** Open strokes, drawn by hand like a pen line: `mark`'s two. */
  strokes: Stroke[];
}

/** `mark`'s stroke width at `size`. */
export const markWidth = (size: number) => Math.max(MARK_MIN_WIDTH, size * MARK_WIDTH);

/** The outline's width at `size`, round each half and the backing's ring. */
export const outlineWidth = (size: number) => Math.max(OUTLINE_MIN, size * OUTLINE);

export const styleOf = (v: unknown): CompassStyle => (v === 'arrow' || v === 'cross' ? v : 'mark');

/**
 * Turns a point `dx` right and `dy` down of `c` (drawn pointing up) by `north` radians
 * clockwise about `c`.
 */
export function turn(c: Pt, north: number, dx: number, dy: number): Pt {
  const cos = Math.cos(north);
  const sin = Math.sin(north);
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** A point `r` from `c` at `angle` clockwise from up. */
const polar = (c: Pt, angle: number, r: number): Pt => turn(c, angle, 0, -r);

function arrow(c: Pt, r: number, north: number): CompassShape {
  const tip = turn(c, north, 0, -r);
  const left = turn(c, north, -ARROW.halfWidth * r, ARROW.base * r);
  const right = turn(c, north, ARROW.halfWidth * r, ARROW.base * r);
  const notch = turn(c, north, 0, ARROW.notch * r);
  return {
    sides: {
      spine: { a: tip, b: notch },
      left: { a: tip, b: left },
      leftBase: { a: left, b: notch },
      right: { a: tip, b: right },
      rightBase: { a: right, b: notch },
    },
    halves: [
      {
        ink: true,
        sides: [
          ['left', false],
          ['leftBase', false],
          ['spine', true],
        ],
      },
      {
        ink: false,
        sides: [
          ['right', false],
          ['rightBase', false],
          ['spine', true],
        ],
      },
    ],
    strokes: [],
  };
}

/**
 * `n` split points about `c`: point k's inked half runs centre, tip, the base corner before it;
 * its paper half centre, tip, the base corner after it, which is the next point's first.
 */
function star(c: Pt, r: number, north: number, n: number, waist: number): CompassShape {
  const sides: Record<string, Side> = {};
  const halves: Half[] = [];
  const base = (k: number) => polar(c, north + ((k - 0.5) * 2 * Math.PI) / n, waist * r);
  for (let k = 0; k < n; k++) {
    const tip = polar(c, north + (k * 2 * Math.PI) / n, r);
    sides[`spine${k}`] = { a: c, b: tip };
    sides[`before${k}`] = { a: tip, b: base(k) };
    sides[`after${k}`] = { a: tip, b: base(k + 1) };
    sides[`base${k}`] = { a: base(k), b: c };
  }
  for (let k = 0; k < n; k++) {
    halves.push({
      ink: true,
      sides: [
        [`spine${k}`, false],
        [`before${k}`, false],
        [`base${k}`, false],
      ],
    });
    halves.push({
      ink: false,
      sides: [
        [`spine${k}`, false],
        [`after${k}`, false],
        [`base${(k + 1) % n}`, false],
      ],
    });
  }
  return { sides, halves, strokes: [] };
}

function mark(c: Pt, r: number, north: number, size: number): CompassShape {
  const width = markWidth(size);
  return {
    sides: {},
    halves: [],
    strokes: [
      { name: 'stem', a: turn(c, north, 0, -r), b: turn(c, north, 0, r), width },
      {
        name: 'bar',
        a: turn(c, north, -MARK.reach * r, -MARK.bar * r),
        b: turn(c, north, MARK.reach * r, -MARK.bar * r),
        width,
      },
    ],
  };
}

/** The shape of `style` at `size`, centred on `c`, turned `north` radians clockwise. */
export function compassShape(style: CompassStyle, c: Pt, size: number, north: number) {
  const r = size / 2;
  if (style === 'arrow') return arrow(c, r, north);
  if (style === 'cross') return star(c, r, north, CROSS.points, CROSS.waist);
  return mark(c, r, north, size);
}
