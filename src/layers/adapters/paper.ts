import { clampScale, drawFitted } from '@/layers/adapters/image-fit';
import type { LayerAdapter } from '@/layers/types';

export interface PaperState {
  color: string; // hex
  aspect: string;
  orientation?: 'landscape' | 'portrait';
  /** The image's path as written (epic 21); the bitmap arrives through `env.textures`. */
  texture?: string;
  /** `normal` shows the image alone, `multiply` mixes it with the paper colour. */
  textureBlend?: 'normal' | 'multiply';
  textureFit?: 'cover' | 'contain' | 'repeat';
  textureScale?: number;
}

export const PaperAdapter: LayerAdapter<PaperState> = {
  title: 'Paper',
  drawMain(ctx, state, env) {
    const { w, h } = env.size;
    ctx.save();
    ctx.fillStyle = state.color || '#ffffff';
    ctx.fillRect(0, 0, w, h);
    // the image over the colour; a file that is missing or still loading draws just the colour
    const bitmap = state.texture ? (env.textures?.get(state.texture) ?? null) : null;
    if (bitmap) {
      const scale = clampScale(state.textureScale);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      ctx.globalCompositeOperation = state.textureBlend === 'normal' ? 'source-over' : 'multiply';
      drawFitted(ctx, bitmap, w, h, state.textureFit, scale);
    }
    ctx.restore();
  },
  getInvalidationKey(state) {
    const scale = clampScale(state.textureScale).toFixed(3);
    return `paper:${state.aspect}:${state.orientation ?? 'landscape'}:${state.color}:${state.texture ?? '-'}:${state.textureBlend ?? 'multiply'}:${state.textureFit ?? 'cover'}:${scale}`;
  },
};

export const PaperType = {
  id: 'paper',
  title: 'Paper',
  defaultState: { color: '#ffffff', aspect: '16:10' },
  adapter: PaperAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Properties schema is registered by the paper plugin during activation.
