// The title cartouche (epic 23 story 1, disco-03): the map's title in a box, with an optional
// subtitle and credit line. Draws in paper px; the host places it over the grid because it is
// in the map's `furniture`. It reads nothing but its state: the frame projection resolves the
// title (override, else the map's name) and the inks.
import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { faceCaps, faceFont, ITALIC_SERIF, MONO } from '@/render/faces';
import {
  fillByHand,
  type Hand,
  handOf,
  handTilt,
  type Pt,
  rectCorners,
  strokeByHand,
} from '@/render/hand';

// Every measurement is a fraction of `titleSize`, so the box scales with its type.
/** The subtitle's size. */
export const SUBTITLE_SCALE = 0.5;
/** The credit's size. */
export const CREDIT_SCALE = 1 / 3;
/** Room between the longest line and the box's sides. */
export const PAD_X = 0.7;
/** Room above the first line and below the last. */
export const PAD_Y = 0.45;
/** Space between lines. */
export const LINE_GAP = 0.25;
/** A line's height and where its baseline sits in it, as fractions of that line's size. */
export const LINE_HEIGHT = 1.0;
export const BASELINE = 0.8;
/** The rule's width. */
export const RULE_WIDTH = 0.06;
/** Letter spacing for a face set in capitals, where the canvas supports it. */
export const CAPS_TRACKING = 0.06;
/** `double`: the inner rule's width as a fraction of the outer's. */
export const INNER_RULE = 0.5;
/** `double`: the space between the two rules. */
export const DOUBLE_GAP = 0.15;
/** The alpha "Untitled map" prints at, so it reads as a stand-in (disco-03, Values). */
export const MUTED_INK_ALPHA = 0.45;

export type Frame = 'none' | 'rule' | 'double' | 'plate';

export type Anchor =
  | 'top-left'
  | 'top-centre'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-centre'
  | 'bottom-right';

export interface CartoucheState {
  title?: string;
  subtitle?: string;
  credit?: string;
  frame?: Frame;
  align?: 'left' | 'centre' | 'right';
  titleSize?: number;
  anchor?: Anchor;
  inset?: number;
  backing?: boolean;
  /** `map` is resolved by the projection, so the adapter sees a face id. */
  face?: string;
  /** `map` is resolved by the projection; anything else draws clean. */
  hand?: string;
  /** From the projection: the node's id, so its wobble never moves and a copy's differs. */
  seed?: string;
  /** From the projection: what the title line prints (the override, else the map's name). */
  resolvedTitle?: string;
  /** From the projection: the grid's ink as drawn, for the rule and the lines. */
  ink?: string;
  /** From the projection: the title line's ink; muted when nothing names the map. */
  titleInk?: string;
  /** From the projection: whether the title is the muted "Untitled map". */
  titleMuted?: boolean;
  /** From the projection: the paper's colour, for the backing plate. */
  paper?: string;
}

interface Line {
  text: string;
  font: string;
  size: number;
  ink: string;
  /** The line's alpha over the context's: the muted title on a plate. */
  alpha: number;
  tracking: number;
}

export interface CartoucheBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Measure = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

const DEFAULT_SIZE = 30;

const sizeOf = (s: CartoucheState) =>
  Number.isFinite(s.titleSize) && (s.titleSize as number) > 0
    ? (s.titleSize as number)
    : DEFAULT_SIZE;

const frameOf = (s: CartoucheState): Frame => s.frame ?? 'rule';

/**
 * The lines the cartouche prints, top to bottom; blank subtitle and credit are left out. On a
 * plate they are reversed out in the paper's colour.
 */
export function linesOf(s: CartoucheState): Line[] {
  const size = sizeOf(s);
  const plate = frameOf(s) === 'plate';
  const ink = plate ? s.paper || '#ffffff' : s.ink || '#000000';
  const face = s.face ?? 'condensed';
  const caps = faceCaps(face);
  const title = s.resolvedTitle ?? '';
  const lines: Line[] = [
    {
      text: caps ? title.toUpperCase() : title,
      font: faceFont(face, size),
      size,
      ink: plate ? ink : s.titleInk || ink,
      alpha: plate && s.titleMuted ? MUTED_INK_ALPHA : 1,
      tracking: caps ? CAPS_TRACKING * size : 0,
    },
  ];
  const sub = s.subtitle?.trim();
  if (sub) {
    const z = size * SUBTITLE_SCALE;
    lines.push({
      text: sub,
      font: `italic 400 ${z}px "${ITALIC_SERIF.family}", ${ITALIC_SERIF.fallback}`,
      size: z,
      ink,
      alpha: 1,
      tracking: 0,
    });
  }
  const credit = s.credit?.trim();
  if (credit) {
    const z = size * CREDIT_SCALE;
    lines.push({
      text: credit,
      font: `normal 400 ${z}px ${MONO}`,
      size: z,
      ink,
      alpha: 1,
      tracking: 0,
    });
  }
  return lines;
}

/** Sets letter spacing where the canvas has it; measuring and drawing then agree. */
function track(ctx: object, px: number) {
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Each line's width, measured in its own font. */
function widths(ctx: Measure, lines: Line[]): number[] {
  return lines.map((l) => {
    ctx.font = l.font;
    track(ctx, l.tracking);
    return ctx.measureText(l.text).width;
  });
}

/** What a double frame's inner rule takes from each side, beyond the padding. */
const frameRoom = (s: CartoucheState, size: number) =>
  frameOf(s) === 'double' ? (DOUBLE_GAP + INNER_RULE * RULE_WIDTH) * size : 0;

/** The box: the longest line plus padding, at `anchor`, `inset` in from the paper's edges. */
export function boxOf(
  s: CartoucheState,
  lineWidths: number[],
  lines: Line[],
  paper: { w: number; h: number },
): CartoucheBox {
  const size = sizeOf(s);
  const room = 2 * frameRoom(s, size);
  const w = Math.max(0, ...lineWidths) + 2 * PAD_X * size + room;
  const h =
    room +
    2 * PAD_Y * size +
    lines.reduce((sum, l) => sum + l.size * LINE_HEIGHT, 0) +
    Math.max(0, lines.length - 1) * LINE_GAP * size;
  const inset = Number.isFinite(s.inset) ? Math.max(0, s.inset as number) : 24;
  const [v, hz] = (s.anchor ?? 'top-left').split('-');
  const x = hz === 'left' ? inset : hz === 'right' ? paper.w - inset - w : (paper.w - w) / 2;
  const y = v === 'bottom' ? paper.h - inset - h : inset;
  return { x, y, w, h };
}

type Ctx = CanvasRenderingContext2D;

/** A ruled box `inset` in from `box`'s edges at `width`: one rect when clean, four strokes by hand. */
function ruleBox(
  ctx: Ctx,
  box: CartoucheBox,
  inset: number,
  width: number,
  hand: Hand,
  seed: string,
) {
  const x = box.x + inset;
  const y = box.y + inset;
  const w = box.w - 2 * inset;
  const h = box.h - 2 * inset;
  if (hand === 'clean') {
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
    return;
  }
  const [tl, tr, br, bl] = rectCorners(x, y, w, h);
  const sides: [string, Pt, Pt][] = [
    ['top', tl, tr],
    ['right', tr, br],
    ['bottom', bl, br],
    ['left', tl, bl],
  ];
  for (const [name, a, b] of sides) strokeByHand(ctx, a, b, hand, `${seed}:${name}`, width);
}

/** A filled rect: exact when clean, through a wobbled outline by hand. */
function fillBox(ctx: Ctx, x: number, y: number, w: number, h: number, hand: Hand, seed: string) {
  if (hand === 'clean') ctx.fillRect(x, y, w, h);
  else fillByHand(ctx, rectCorners(x, y, w, h), hand, seed);
}

/** The frame (map furniture §5): a rule, a double rule, or a solid plate. */
function drawFrame(ctx: Ctx, s: CartoucheState, box: CartoucheBox, size: number) {
  const frame = frameOf(s);
  const hand = handOf(s.hand);
  const seed = s.seed ?? 'cartouche';
  const ink = s.ink || '#000000';
  const lw = RULE_WIDTH * size;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = hand === 'clean' ? 'butt' : 'round';
  if (frame === 'plate') {
    fillBox(ctx, box.x, box.y, box.w, box.h, hand, `${seed}:plate`);
  } else if (frame === 'rule') {
    // inside the box, so the backing and the rule share an outer edge
    ruleBox(ctx, box, lw / 2, lw, hand, `${seed}:rule`);
  } else if (frame === 'double') {
    ruleBox(ctx, box, lw / 2, lw, hand, `${seed}:outer`);
    const inner = INNER_RULE * lw;
    ruleBox(ctx, box, lw + DOUBLE_GAP * size + inner / 2, inner, hand, `${seed}:inner`);
  }
}

export const CartoucheAdapter: LayerAdapter<CartoucheState> = {
  title: 'Title',
  drawMain(ctx, state, env: RenderEnv) {
    const lines = linesOf(state);
    ctx.save();
    const box = boxOf(state, widths(ctx, lines), lines, env.size);
    const size = sizeOf(state);
    // a plate is its own backing, and backings stay clean (drawing by hand)
    if (state.backing !== false && frameOf(state) !== 'plate') {
      ctx.fillStyle = state.paper || '#ffffff';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    drawFrame(ctx, state, box, size);
    const hand = handOf(state.hand);
    const seed = state.seed ?? 'cartouche';
    const align = state.align ?? 'centre';
    const padX = PAD_X * size + frameRoom(state, size);
    const x =
      align === 'left'
        ? box.x + padX
        : align === 'right'
          ? box.x + box.w - padX
          : box.x + box.w / 2;
    ctx.textAlign = align === 'centre' ? 'center' : align;
    ctx.textBaseline = 'alphabetic';
    let y = box.y + PAD_Y * size + frameRoom(state, size);
    // the host may have set the layer's opacity here
    const alpha = ctx.globalAlpha;
    for (const [i, l] of lines.entries()) {
      ctx.font = l.font;
      track(ctx, l.tracking);
      ctx.fillStyle = l.ink;
      ctx.globalAlpha = alpha * l.alpha;
      const baseline = y + l.size * BASELINE;
      const tilt = handTilt(hand, `${seed}:line${i}`);
      if (tilt === 0) {
        ctx.fillText(l.text, x, baseline);
      } else {
        // leaned about where the line starts, so its alignment holds
        ctx.save();
        ctx.translate(x, baseline);
        ctx.rotate(tilt);
        ctx.fillText(l.text, 0, 0);
        ctx.restore();
      }
      y += l.size * LINE_HEIGHT + LINE_GAP * size;
    }
    ctx.restore();
  },
  getInvalidationKey(s) {
    return [
      'cartouche',
      s.resolvedTitle ?? '',
      s.subtitle ?? '',
      s.credit ?? '',
      frameOf(s),
      s.align ?? 'centre',
      sizeOf(s),
      s.anchor ?? 'top-left',
      s.inset ?? 24,
      s.backing !== false,
      s.face ?? 'condensed',
      handOf(s.hand),
      s.seed ?? '',
      s.ink ?? '',
      s.titleInk ?? '',
      s.titleMuted === true,
      s.paper ?? '',
    ]
      .map((p) => JSON.stringify(p))
      .join(':');
  },
};

export const CartoucheType = {
  id: 'cartouche',
  title: 'Title',
  defaultState: {
    title: '',
    subtitle: '',
    credit: '',
    frame: 'rule',
    align: 'centre',
    titleSize: DEFAULT_SIZE,
    anchor: 'top-left',
    inset: 24,
    backing: true,
    face: 'map',
    hand: 'map',
  } satisfies CartoucheState,
  adapter: CartoucheAdapter,
} as const;
