/**
 * The paper's shape: `square`, or width to height as `W:H` (`16:10`, and `10:16` for the same
 * paper standing up). The frame projection turns the paper's aspect and orientation into it.
 */
export type PaperAspect = string;

export interface PaperRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ComputePaperRectInput {
  canvasSize: { w: number; h: number };
  paper: { aspect: PaperAspect };
  padding?: { x?: number; y?: number };
}

const MIN_PADDING_X = 12;
const MIN_PADDING_Y = 12;
const HORIZONTAL_PADDING_RATIO = 0.05; // mirror historical behavior (5% of canvas width)

export function resolveAspectRatio(aspect: PaperAspect): {
  aw: number;
  ah: number;
} {
  if (aspect === 'square') return { aw: 1, ah: 1 };
  const [aw, ah] = aspect.split(':').map(Number);
  return aw > 0 && ah > 0 ? { aw, ah } : { aw: 16, ah: 10 };
}

/**
 * Computes the drawable paper rectangle, preserving aspect ratio with consistent padding.
 * Defaults align with legacy CanvasViewport/paper plugin logic to avoid visual churn.
 */
export function computePaperRect({ canvasSize, paper, padding }: ComputePaperRectInput): PaperRect {
  const canvasW = Math.max(0, canvasSize.w);
  const canvasH = Math.max(0, canvasSize.h);

  const basePaddingX = padding?.x ?? MIN_PADDING_X;
  const basePaddingY = padding?.y ?? MIN_PADDING_Y;

  const paddingX = Math.max(basePaddingX, canvasW * HORIZONTAL_PADDING_RATIO);
  const paddingY = basePaddingY;

  const availW = Math.max(0, canvasW - paddingX * 2);
  const availH = Math.max(0, canvasH - paddingY * 2);

  const { aw, ah } = resolveAspectRatio(paper.aspect);
  let paperW = availW;
  let paperH = availH > 0 ? (paperW * ah) / aw : 0;
  if (paperH > availH) {
    paperH = availH;
    paperW = availH > 0 ? (paperH * aw) / ah : 0;
  }

  const offsetX = paddingX + Math.max(0, (availW - paperW) / 2);
  const offsetY = paddingY;

  return { x: offsetX, y: offsetY, w: paperW, h: paperH };
}

/** The paper's long side in paper px (epic 07 story 6). */
export const PAPER_LONG_SIDE = 1200;

/**
 * A map's paper in paper px, from its aspect alone: 1200 on the long side. Paper space is
 * this, whatever the window: the screen and the export scale it, they never crop it.
 */
export function paperSize(aspect: PaperAspect): { w: number; h: number } {
  const { aw, ah } = resolveAspectRatio(aspect);
  return aw >= ah
    ? { w: PAPER_LONG_SIDE, h: (PAPER_LONG_SIDE * ah) / aw }
    : { w: (PAPER_LONG_SIDE * aw) / ah, h: PAPER_LONG_SIDE };
}

export interface PaperView {
  /** Where the paper sits in the canvas, in CSS px. */
  rect: PaperRect;
  /** The paper in paper px. */
  size: { w: number; h: number };
  /** CSS px per paper px at zoom 1; 0 when the canvas has no room for the paper. */
  fit: number;
}

/**
 * The paper as a canvas shows it: its screen rect and the one scale from paper px into it.
 * The backend, the camera's inputs, pointer-to-hex and the tools all go through this.
 */
export function paperView(canvasSize: { w: number; h: number }, aspect: PaperAspect): PaperView {
  const rect = computePaperRect({ canvasSize, paper: { aspect } });
  const size = paperSize(aspect);
  const fit = rect.w > 0 && rect.h > 0 ? rect.w / size.w : 0;
  return { rect, size, fit };
}

/** A point in canvas CSS px as paper px at zoom 1 from the paper's top-left: what the camera takes. */
export function viewToFitted(view: PaperView, x: number, y: number): { x: number; y: number } {
  const f = view.fit || 1;
  return { x: (x - view.rect.x) / f, y: (y - view.rect.y) / f };
}

export const PaperGeometry = {
  computePaperRect,
  paperSize,
  paperView,
  resolveAspectRatio,
} as const;
