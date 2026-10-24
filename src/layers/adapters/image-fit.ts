// How a bitmap sits on the paper rect: cover, contain or repeat, centred, scaled. Shared by the
// paper's texture and the image layer so both fit the same way.

export type ImageFit = 'cover' | 'contain' | 'repeat';

export const clampScale = (s: unknown): number => {
  const n = typeof s === 'number' && Number.isFinite(s) ? s : 1;
  return Math.max(0.05, Math.min(8, n));
};

/**
 * Draws `bitmap` over (0,0,w,h) in the context's current space. `repeat` tiles at the image
 * size times `scale`; `bleed` extends the tiled area that many px past the rect on every side
 * (for when the caller rotates or offsets the space inside a clip).
 */
export function drawFitted(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  w: number,
  h: number,
  fit: ImageFit | undefined,
  scale: number,
  bleed = 0,
): void {
  if (fit === 'repeat') {
    const pattern = ctx.createPattern(bitmap as CanvasImageSource, 'repeat');
    if (!pattern) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = pattern;
    const from = bleed ? -bleed / scale : 0;
    ctx.fillRect(
      from,
      from,
      w / scale + (bleed ? (2 * bleed) / scale : 0),
      h / scale + (bleed ? (2 * bleed) / scale : 0),
    );
    return;
  }
  const pick = fit === 'contain' ? Math.min : Math.max;
  const ratio = pick(w / bitmap.width, h / bitmap.height) * scale;
  const dw = bitmap.width * ratio;
  const dh = bitmap.height * ratio;
  ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
