import type { LayerAdapter } from '@/layers/types';

export interface PaperState {
  color: string; // hex
  aspect: 'square' | '4:3' | '16:10';
  /** The image's path as written (epic 21); the bitmap arrives through `env.textures`. */
  texture?: string;
  /** `normal` shows the image alone, `multiply` mixes it with the paper colour. */
  textureBlend?: 'normal' | 'multiply';
  textureFit?: 'cover' | 'contain' | 'repeat';
  textureScale?: number;
}

const clampScale = (s: unknown): number => {
  const n = typeof s === 'number' && Number.isFinite(s) ? s : 1;
  return Math.max(0.05, Math.min(8, n));
};

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
      if (state.textureFit === 'repeat') {
        const pattern = ctx.createPattern(bitmap as CanvasImageSource, 'repeat');
        if (pattern) {
          ctx.scale(scale, scale);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w / scale, h / scale);
        }
      } else {
        const pick = state.textureFit === 'contain' ? Math.min : Math.max;
        const ratio = pick(w / bitmap.width, h / bitmap.height) * scale;
        const dw = bitmap.width * ratio;
        const dh = bitmap.height * ratio;
        ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
    }
    ctx.restore();
  },
  getInvalidationKey(state) {
    const scale = clampScale(state.textureScale).toFixed(3);
    return `paper:${state.aspect}:${state.color}:${state.texture ?? '-'}:${state.textureBlend ?? 'multiply'}:${state.textureFit ?? 'cover'}:${scale}`;
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
