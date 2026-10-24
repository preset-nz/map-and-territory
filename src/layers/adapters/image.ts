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
  // Story 3 draws the picture; until then the layer exists and draws nothing.
  drawMain() {},
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
