import type { Point } from '@/lib/hex/types';
import { createPerlinNoise, type PerlinNoise } from '@/lib/noise';
import { createRNG } from '@/lib/random';

/**
 * Ink noise: uneven ink density over a layer's drawn lines, kept inside the adapter.
 *
 * The ink is drawn into a scratch canvas, then a density mask takes some of its alpha away
 * (`destination-out`), then the scratch goes onto the layer's context. The mask is two parts,
 * both built in paper space and cached across frames:
 *
 * - blotch: smooth seeded Perlin at the ink scale, one sample per `scale / 4` px, upscaled
 *   with smoothing when drawn. It removes up to `BLOTCH_WEIGHT * amount` of the alpha.
 * - grain: a small seeded tile of ~1 px noise, repeated. It removes up to
 *   `GRAIN_WEIGHT * amount`.
 *
 * Each pass multiplies what is left, so the ink alpha at a point is
 * `(1 - 0.8 * amount * blotch) * (1 - 0.2 * amount * grain)`: never above 1, and never
 * below `INK_FLOOR` (0.16) whatever the amount, so some ink always remains.
 */

export const BLOTCH_WEIGHT = 0.8;
export const GRAIN_WEIGHT = 0.2;
/** The least alpha a point of ink can keep: both passes at full strength. */
export const INK_FLOOR = (1 - BLOTCH_WEIGHT) * (1 - GRAIN_WEIGHT);
/** The blotch field is sampled this many times per patch. */
export const SAMPLES_PER_PATCH = 4;
/** A cap on blotch samples, so tiny patches on a big paper stay cheap to build. */
export const MAX_BLOTCH_SAMPLES = 1_000_000;
export const GRAIN_TILE = 64;

/** The ink alpha left where the blotch is `blotch` and the grain is `grain`, both in [0, 1]. */
export function inkAlpha(amount: number, blotch: number, grain: number): number {
  return (1 - BLOTCH_WEIGHT * amount * blotch) * (1 - GRAIN_WEIGHT * amount * grain);
}

/** Perlin 2D tops out near 0.7; stretch to fill [-1, 1], clamp, and map to [0, 1]. */
function unit(n: number): number {
  return (Math.max(-1, Math.min(1, n * Math.SQRT2)) + 1) / 2;
}

/**
 * The blotch at a paper-space point, in [0, 1]. Sampled relative to the tiling centre minus
 * the misregistration shift, the same anchoring as the width noise, so it travels with the
 * grid and a resize or pan leaves it alone.
 */
export function blotchAt(
  noise: PerlinNoise,
  scale: number,
  shift: Point,
  origin: Point,
  x: number,
  y: number,
): number {
  return unit(noise.noise2D((x - shift.x - origin.x) / scale, (y - shift.y - origin.y) / scale));
}

export interface InkParams {
  seed: string;
  /** 0..1, already clamped. */
  amount: number;
  /** px, the size of a patch. */
  scale: number;
  /** The paper's size: the area the mask covers. */
  size: { w: number; h: number };
  /** The tiling centre. */
  origin: Point;
  /** The misregistration. */
  shift: Point;
}

export interface BlotchField {
  /** Alpha removed (0..255) per sample, row by row. */
  data: Uint8ClampedArray;
  cols: number;
  rows: number;
  /** Paper px between samples. */
  cell: number;
  /** Where the field's rectangle sits in paper space, for drawing it upscaled. */
  rect: { x: number; y: number; w: number; h: number };
}

export function buildBlotch(p: InkParams): BlotchField {
  const scale = Math.max(1, p.scale);
  const cell = Math.max(
    scale / SAMPLES_PER_PATCH,
    Math.sqrt((p.size.w * p.size.h) / MAX_BLOTCH_SAMPLES),
  );
  const ax = p.origin.x + p.shift.x;
  const ay = p.origin.y + p.shift.y;
  // sample k sits at ax + k * cell; one spare sample each side so the smoothing has neighbours
  const kx0 = Math.floor(-ax / cell) - 1;
  const kx1 = Math.ceil((p.size.w - ax) / cell) + 1;
  const ky0 = Math.floor(-ay / cell) - 1;
  const ky1 = Math.ceil((p.size.h - ay) / cell) + 1;
  const cols = kx1 - kx0 + 1;
  const rows = ky1 - ky0 + 1;
  const noise = createPerlinNoise(`${p.seed}:ink`);
  const data = new Uint8ClampedArray(cols * rows);
  const strength = 255 * BLOTCH_WEIGHT * p.amount;
  let i = 0;
  for (let ky = ky0; ky <= ky1; ky++) {
    const v = (ky * cell) / scale;
    for (let kx = kx0; kx <= kx1; kx++) {
      data[i++] = Math.round(strength * unit(noise.noise2D((kx * cell) / scale, v)));
    }
  }
  return {
    data,
    cols,
    rows,
    cell,
    // a sample is the centre of its pixel once drawn, so the rectangle starts half a cell early
    rect: {
      x: ax + (kx0 - 0.5) * cell,
      y: ay + (ky0 - 0.5) * cell,
      w: cols * cell,
      h: rows * cell,
    },
  };
}

/** The grain tile's alpha removed (0..255) per pixel: seeded, one tile px per paper px. */
export function buildGrain(seed: string, amount: number): Uint8ClampedArray {
  const rng = createRNG(`${seed}:ink:grain`);
  const data = new Uint8ClampedArray(GRAIN_TILE * GRAIN_TILE);
  const strength = 255 * GRAIN_WEIGHT * amount;
  for (let i = 0; i < data.length; i++) data[i] = Math.round(strength * rng.float());
  return data;
}

// ---- canvases ----

type Surface = OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface InkMask {
  key: string;
  blotch: Surface;
  grain: Surface;
  rect: BlotchField['rect'];
}

/** A canvas without a DOM, or null where there is none (a test runner without canvas). */
export function makeSurface(w: number, h: number): Surface | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
}

function alphaCanvas(data: Uint8ClampedArray, cols: number, rows: number): Surface | null {
  const c = makeSurface(cols, rows);
  const ctx = c?.getContext('2d') as Ctx2D | null | undefined;
  if (!c || !ctx) return null;
  const img = ctx.createImageData(cols, rows);
  // black, with the alpha to remove: destination-out reads only the alpha
  for (let i = 0; i < data.length; i++) img.data[i * 4 + 3] = data[i]!;
  ctx.putImageData(img, 0, 0);
  return c;
}

export function inkMaskKey(p: InkParams): string {
  return [
    p.seed,
    p.amount,
    p.scale,
    `${p.size.w}x${p.size.h}`,
    `${p.origin.x},${p.origin.y}`,
    `${p.shift.x},${p.shift.y}`,
  ].join('|');
}

let cached: InkMask | null = null;
let builds = 0;

/** How many masks have been built since `resetInkMask`; for tests and timing. */
export const inkMaskBuilds = () => builds;

export function resetInkMask(): void {
  cached = null;
  builds = 0;
}

/** The mask for these values: the cached one when nothing it depends on has changed. */
export function getInkMask(p: InkParams): InkMask | null {
  const key = inkMaskKey(p);
  if (cached?.key === key) return cached;
  const field = buildBlotch(p);
  const blotch = alphaCanvas(field.data, field.cols, field.rows);
  const grain = alphaCanvas(buildGrain(p.seed, p.amount), GRAIN_TILE, GRAIN_TILE);
  builds++;
  if (!blotch || !grain) return null;
  cached = { key, blotch, grain, rect: field.rect };
  return cached;
}

/**
 * Take the mask's alpha off whatever is on `ctx`. `ctx` must have the paper's transform set
 * (paper px as user space). `destination-out` leaves everything the mask doesn't reach alone.
 */
export function applyInkMask(ctx: Ctx2D, mask: InkMask, p: InkParams): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mask.blotch, mask.rect.x, mask.rect.y, mask.rect.w, mask.rect.h);
  // the grain tile is anchored at the grid, like the blotch, and kept crisp
  const pattern = ctx.createPattern(mask.grain, 'repeat');
  if (pattern) {
    const ax = p.origin.x + p.shift.x;
    const ay = p.origin.y + p.shift.y;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(ax, ay);
    ctx.fillStyle = pattern;
    ctx.fillRect(-ax, -ay, p.size.w, p.size.h);
  }
  ctx.restore();
}
