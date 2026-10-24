import { clampScale, drawFitted } from '@/layers/adapters/image-fit';
import type { LayerAdapter } from '@/layers/types';

export interface ImageState {
  /** The picture's path as written (epic 21); the bitmap arrives through `env.textures`. */
  file?: string;
  fit?: 'cover' | 'contain' | 'repeat';
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  opacity?: number;
  blend?: string;
}

export const ImageAdapter: LayerAdapter<ImageState> = {
  title: 'Image',
  // Draws over the paper rect in paper space. Opacity and blend are the host's; a bitmap that is
  // missing or still loading draws nothing.
  drawMain(ctx, state, env) {
    const bitmap = state.file ? (env.textures?.get(state.file) ?? null) : null;
    if (!bitmap) return;
    const { w, h } = env.size;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    const ox = num(state.offsetX);
    const oy = num(state.offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    // offset in paper px, rotation about the middle of the paper
    ctx.translate(w / 2 + ox, h / 2 + oy);
    ctx.rotate((num(state.rotation) * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
    drawFitted(
      ctx,
      bitmap,
      w,
      h,
      state.fit,
      clampScale(state.scale),
      Math.hypot(w, h) + Math.hypot(ox, oy),
    );
    ctx.restore();
  },
  getInvalidationKey(state) {
    return `image:${state.file ?? '-'}:${state.fit ?? 'cover'}:${state.scale ?? 1}:${state.offsetX ?? 0}:${state.offsetY ?? 0}:${state.rotation ?? 0}:${state.opacity ?? 1}:${state.blend ?? 'normal'}`;
  },
};

export const ImageType = {
  id: 'image',
  title: 'Image',
  defaultState: {
    fit: 'cover',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  } satisfies ImageState,
  adapter: ImageAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;
