// The compass (epic 24 story 1, disco-02): where north is, in the grid's ink on a disc of the
// paper's colour. Draws in paper px; the host places it over the grid because it is in the
// map's `furniture`. The shapes are in `compass-shapes.ts`; the frame projection resolves the
// words (overrides, the set, the style's one way), so the adapter draws what it is given.
import {
  type CompassStyle,
  compassShape,
  markWidth,
  outlineWidth,
  styleOf,
  turn,
} from '@/layers/adapters/compass-shapes';
import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { faceCaps, faceFont } from '@/render/faces';
import {
  fillOutline,
  type Hand,
  handEdge,
  handOf,
  handStray,
  handTilt,
  type Pt,
  strokeByHand,
  strokeEdge,
  strokeRing,
} from '@/render/hand';

// Label measurements, as fractions of the points' size (the examples page draws them at 120 px).
/** A letter's size, and a longer word's. */
export const LETTER_SIZE = 14 / 120;
export const WORD_SIZE = 11 / 120;
/** The gap from the points' reach to a north or south word's centre. */
export const GAP_NS = 12 / 120;
/** The gap from the points' reach to the near edge of an east or west word. */
export const GAP_EW = 8 / 120;

export type Anchor =
  | 'top-left'
  | 'top-centre'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right';

export interface CompassState {
  style?: CompassStyle;
  labels?: string;
  labelN?: string;
  labelE?: string;
  labelS?: string;
  labelW?: string;
  /** Degrees clockwise from up. */
  north?: number;
  /** The disc's diameter, in paper px. */
  size?: number;
  /** How far the points reach, as a share of the disc's radius. */
  points?: number;
  anchor?: Anchor;
  inset?: number;
  backing?: boolean;
  /** A line round the backing disc, drawn in the compass's hand. */
  ring?: boolean;
  /** `map` is resolved by the projection, so the adapter sees a face id. */
  face?: string;
  /** `map` is resolved by the projection; anything else draws clean. */
  hand?: string;
  /** From the projection: the node's id, so its wobble never moves and a copy's differs. */
  seed?: string;
  /** From the projection: the words for north, east, south and west; blank prints nothing. */
  resolvedLabels?: string[];
  /** From the projection: the grid's ink as drawn. */
  ink?: string;
  /** From the projection: the paper's colour, for the backing and the paper halves. */
  paper?: string;
}

type Ctx = CanvasRenderingContext2D;
type Measure = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

/** At the defaults the points are 120 px across, as on the examples page. */
const DEFAULT_SIZE = 160;
const DEFAULT_POINTS = 0.75;

/** The disc's diameter. */
const discOf = (s: CompassState) =>
  Number.isFinite(s.size) && (s.size as number) > 0 ? (s.size as number) : DEFAULT_SIZE;

const shareOf = (s: CompassState) =>
  Number.isFinite(s.points) && (s.points as number) > 0 ? (s.points as number) : DEFAULT_POINTS;

/** The points' diameter: the disc's, times their share. Lines and words scale with it. */
const sizeOf = (s: CompassState) => discOf(s) * shareOf(s);

const northOf = (s: CompassState) =>
  Number.isFinite(s.north) ? ((s.north as number) / 180) * Math.PI : 0;

/** A word placed about the compass's centre: where its middle sits, and its size. */
export interface Label {
  text: string;
  /** 0 north, 1 east, 2 south, 3 west. */
  dir: number;
  x: number;
  y: number;
  w: number;
  size: number;
  font: string;
}

/**
 * How far the ink of the points reaches past their radius: half the line it is drawn with
 * (mark's square ends stick out by that), and in a hand the wobble and the overshoot.
 */
export function inkPast(s: CompassState): number {
  const size = sizeOf(s);
  const line = styleOf(s.style) === 'mark' ? markWidth(size) : outlineWidth(size);
  return line / 2 + handStray(handOf(s.hand));
}

/**
 * The words, upright, at the turned points (disco-02, Drawing): north and south `GAP_NS` past
 * the points' ink, east and west set out by half their width so they clear the points.
 * Placed about `c`.
 */
export function labelsOf(ctx: Measure, s: CompassState, c: Pt): Label[] {
  const size = sizeOf(s);
  const r = size / 2 + inkPast(s);
  const face = s.face ?? 'condensed';
  const caps = faceCaps(face);
  const out: Label[] = [];
  for (const [dir, word] of (s.resolvedLabels ?? []).entries()) {
    if (!word) continue;
    const text = caps ? word.toUpperCase() : word;
    const px = (text.length > 2 ? WORD_SIZE : LETTER_SIZE) * size;
    const font = faceFont(face, px);
    ctx.font = font;
    const w = ctx.measureText(text).width;
    const reach = r + (dir % 2 ? w / 2 + GAP_EW * size : GAP_NS * size);
    const at = turn(c, northOf(s) + (dir * Math.PI) / 2, 0, -reach);
    out.push({ text, dir, x: at.x, y: at.y, w, size: px, font });
  }
  return out;
}

/**
 * How far the compass reaches from its centre in any direction: the disc, drawn or not,
 * and every word however north turns it. The disc counts even when off, and the reach doesn't
 * depend on `north`, so neither switching the backing nor turning north moves the compass.
 * `labels` were placed about the origin.
 */
export function reachOf(s: CompassState, labels: Label[]): number {
  let reach = discOf(s) / 2 + outlineWidth(sizeOf(s)) / 2;
  for (const l of labels) {
    reach = Math.max(reach, Math.hypot(l.x, l.y) + Math.hypot(l.w, l.size) / 2);
  }
  return reach;
}

/** Where the compass's centre sits: its reach at `anchor`, `inset` in from the paper's edges. */
export function centreOf(s: CompassState, reach: number, paper: { w: number; h: number }): Pt {
  const inset = Number.isFinite(s.inset) ? Math.max(0, s.inset as number) : 24;
  const [v, hz] = (s.anchor ?? 'top-right').split('-');
  const x = hz === 'left' ? inset + reach : hz === 'right' ? paper.w - inset - reach : paper.w / 2;
  const y = v === 'bottom' ? paper.h - inset - reach : inset + reach;
  return { x, y };
}

/**
 * The points, shape by shape: its rings, each half filled through its sides, then every side
 * stroked once, so a later shape lies over the whole of an earlier one.
 */
function drawShape(ctx: Ctx, s: CompassState, c: Pt, hand: Hand, seed: string) {
  const size = sizeOf(s);
  const ink = s.ink || '#000000';
  const paper = s.paper || '#ffffff';
  const outline = outlineWidth(size);
  for (const shape of compassShape(styleOf(s.style), c, size, northOf(s))) {
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'round';
    for (const [i, r] of shape.rings.entries()) {
      strokeRing(ctx, c, r, hand, `${seed}:inner${i}`, outline);
    }
    const sides = new Map(
      Object.entries(shape.sides).map(([name, side]) => [
        name,
        handEdge(side.a, side.b, hand, `${seed}:${name}`),
      ]),
    );
    for (const half of shape.halves) {
      const pts = half.sides.flatMap(([name, reversed]) => {
        const p = sides.get(name) ?? [];
        return reversed ? [...p].reverse() : p;
      });
      ctx.fillStyle = half.ink ? ink : paper;
      fillOutline(ctx, pts);
    }
    ctx.lineCap = 'round';
    for (const [name, side] of Object.entries(shape.sides)) {
      strokeEdge(ctx, side.a, side.b, hand, `${seed}:${name}`, outline);
    }
    // square ends in every hand: a mark is chiselled, not dabbed
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (const st of shape.strokes) {
      strokeByHand(ctx, st.a, st.b, hand, `${seed}:${st.name}`, st.width);
    }
  }
}

export const CompassAdapter: LayerAdapter<CompassState> = {
  title: 'Compass',
  drawMain(ctx, state, env: RenderEnv) {
    ctx.save();
    const origin = { x: 0, y: 0 };
    const placed = labelsOf(ctx, state, origin);
    const c = centreOf(state, reachOf(state, placed), env.size);
    const hand = handOf(state.hand);
    const seed = state.seed ?? 'compass';
    // backings stay clean (drawing by hand)
    if (state.backing !== false) {
      ctx.fillStyle = state.paper || '#ffffff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, discOf(state) / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (state.ring !== false) {
      ctx.strokeStyle = state.ink || '#000000';
      ctx.lineJoin = 'round';
      strokeRing(ctx, c, discOf(state) / 2, hand, `${seed}:ring`, outlineWidth(sizeOf(state)));
    }
    drawShape(ctx, state, c, hand, seed);
    ctx.fillStyle = state.ink || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of placed) {
      ctx.font = l.font;
      const x = c.x + l.x;
      const y = c.y + l.y;
      const tilt = handTilt(hand, `${seed}:label${l.dir}`);
      if (tilt === 0) {
        ctx.fillText(l.text, x, y);
      } else {
        // leaned about its middle, so it stays where north puts it
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.fillText(l.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  },
  getInvalidationKey(s) {
    return [
      'compass',
      styleOf(s.style),
      s.labels ?? '',
      s.resolvedLabels ?? [],
      s.north ?? 0,
      discOf(s),
      shareOf(s),
      s.anchor ?? 'top-right',
      s.inset ?? 24,
      s.backing !== false,
      s.ring !== false,
      s.face ?? 'condensed',
      handOf(s.hand),
      s.seed ?? '',
      s.ink ?? '',
      s.paper ?? '',
    ]
      .map((p) => JSON.stringify(p))
      .join(':');
  },
};

export const CompassType = {
  id: 'compass',
  title: 'Compass',
  defaultState: {
    style: 'mark',
    labels: 'north-only',
    labelN: '',
    labelE: '',
    labelS: '',
    labelW: '',
    north: 0,
    size: DEFAULT_SIZE,
    points: DEFAULT_POINTS,
    anchor: 'top-right',
    inset: 24,
    backing: true,
    ring: true,
    face: 'map',
    hand: 'map',
  } satisfies CompassState,
  adapter: CompassAdapter,
} as const;
