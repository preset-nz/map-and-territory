export type PaperAspect = "square" | "4:3" | "16:10";

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
  switch (aspect) {
    case "square":
      return { aw: 1, ah: 1 };
    case "4:3":
      return { aw: 4, ah: 3 };
    case "16:10":
    default:
      return { aw: 16, ah: 10 };
  }
}

/**
 * Computes the drawable paper rectangle, preserving aspect ratio with consistent padding.
 * Defaults align with legacy CanvasViewport/paper plugin logic to avoid visual churn.
 */
export function computePaperRect({
  canvasSize,
  paper,
  padding,
}: ComputePaperRectInput): PaperRect {
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

export const PaperGeometry = {
  computePaperRect,
  resolveAspectRatio,
} as const;
