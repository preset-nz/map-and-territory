// The title cartouche (epic 23 story 1, disco-03): the map's title in a box, with an optional
// subtitle and credit line. Draws in paper px; the host places it over the grid because it is
// in the map's `furniture`. It reads nothing but its state: the frame projection resolves the
// title (override, else the map's name) and the inks.
import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { faceCaps, faceFont, ITALIC_SERIF, MONO } from '@/render/faces';

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
  frame?: 'none' | 'rule';
  align?: 'left' | 'centre' | 'right';
  titleSize?: number;
  anchor?: Anchor;
  inset?: number;
  backing?: boolean;
  face?: string;
  /** From the projection: what the title line prints (the override, else the map's name). */
  resolvedTitle?: string;
  /** From the projection: the grid's ink as drawn, for the rule and the lines. */
  ink?: string;
  /** From the projection: the title line's ink; muted when nothing names the map. */
  titleInk?: string;
  /** From the projection: the paper's colour, for the backing plate. */
  paper?: string;
}

interface Line {
  text: string;
  font: string;
  size: number;
  ink: string;
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

/** The lines the cartouche prints, top to bottom; blank subtitle and credit are left out. */
export function linesOf(s: CartoucheState): Line[] {
  const size = sizeOf(s);
  const ink = s.ink || '#000000';
  const face = s.face ?? 'condensed';
  const caps = faceCaps(face);
  const title = s.resolvedTitle ?? '';
  const lines: Line[] = [
    {
      text: caps ? title.toUpperCase() : title,
      font: faceFont(face, size),
      size,
      ink: s.titleInk || ink,
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
      tracking: 0,
    });
  }
  const credit = s.credit?.trim();
  if (credit) {
    const z = size * CREDIT_SCALE;
    lines.push({ text: credit, font: `normal 400 ${z}px ${MONO}`, size: z, ink, tracking: 0 });
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

/** The box: the longest line plus padding, at `anchor`, `inset` in from the paper's edges. */
export function boxOf(
  s: CartoucheState,
  lineWidths: number[],
  lines: Line[],
  paper: { w: number; h: number },
): CartoucheBox {
  const size = sizeOf(s);
  const w = Math.max(0, ...lineWidths) + 2 * PAD_X * size;
  const h =
    2 * PAD_Y * size +
    lines.reduce((sum, l) => sum + l.size * LINE_HEIGHT, 0) +
    Math.max(0, lines.length - 1) * LINE_GAP * size;
  const inset = Number.isFinite(s.inset) ? Math.max(0, s.inset as number) : 24;
  const [v, hz] = (s.anchor ?? 'top-left').split('-');
  const x = hz === 'left' ? inset : hz === 'right' ? paper.w - inset - w : (paper.w - w) / 2;
  const y = v === 'bottom' ? paper.h - inset - h : inset;
  return { x, y, w, h };
}

export const CartoucheAdapter: LayerAdapter<CartoucheState> = {
  title: 'Title',
  drawMain(ctx, state, env: RenderEnv) {
    const lines = linesOf(state);
    ctx.save();
    const box = boxOf(state, widths(ctx, lines), lines, env.size);
    const size = sizeOf(state);
    if (state.backing !== false) {
      ctx.fillStyle = state.paper || '#ffffff';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    if ((state.frame ?? 'rule') === 'rule') {
      const lw = RULE_WIDTH * size;
      ctx.strokeStyle = state.ink || '#000000';
      ctx.lineWidth = lw;
      // inside the box, so the plate and the rule share an outer edge
      ctx.strokeRect(box.x + lw / 2, box.y + lw / 2, box.w - lw, box.h - lw);
    }
    const align = state.align ?? 'centre';
    const padX = PAD_X * size;
    const x =
      align === 'left'
        ? box.x + padX
        : align === 'right'
          ? box.x + box.w - padX
          : box.x + box.w / 2;
    ctx.textAlign = align === 'centre' ? 'center' : align;
    ctx.textBaseline = 'alphabetic';
    let y = box.y + PAD_Y * size;
    for (const l of lines) {
      ctx.font = l.font;
      track(ctx, l.tracking);
      ctx.fillStyle = l.ink;
      ctx.fillText(l.text, x, y + l.size * BASELINE);
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
      s.frame ?? 'rule',
      s.align ?? 'centre',
      sizeOf(s),
      s.anchor ?? 'top-left',
      s.inset ?? 24,
      s.backing !== false,
      s.face ?? 'condensed',
      s.ink ?? '',
      s.titleInk ?? '',
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
    face: 'condensed',
  } satisfies CartoucheState,
  adapter: CartoucheAdapter,
} as const;
