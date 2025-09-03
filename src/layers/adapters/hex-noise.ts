import type { LayerAdapter } from '@/layers/types';
import { registerPropertySchema } from '@/properties/registry';
import { createPerlinNoise } from '@/lib/noise';
import { corners as hexCorners, fromPoint as hexFromPoint } from '@/lib/hex';

export interface HexNoiseState {
  seed: string | number;
  frequency: number; // scale applied to axial coords
  offsetX: number;
  offsetY: number;
  intensity: number; // 0..1 multiplier
}

export const HexNoiseAdapter: LayerAdapter<HexNoiseState> = {
  title: 'Hex Noise',
  // Note: main renderers draw this layer explicitly; adapter kept for parity/future bridge
  getInvalidationKey(state) {
    return `hexnoise:${state.seed ?? ''}:${state.frequency ?? ''}:${state.offsetX ?? ''}:${state.offsetY ?? ''}:${state.intensity ?? ''}`;
  },
};

export const HexNoiseType = {
  id: 'hexnoise',
  title: 'Hex Noise',
  defaultState: { seed: 'seed', frequency: 0.15, offsetX: 0, offsetY: 0, intensity: 1 },
  adapter: HexNoiseAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

registerPropertySchema('layer:hexnoise', {
  groups: [
    {
      id: 'noise',
      title: 'Hex Noise',
      rows: [
        [
          { kind: 'text', id: 'seed', label: 'Seed', path: 'seed' },
          { kind: 'number', id: 'frequency', label: 'Frequency', path: 'frequency', min: 0.01, max: 5, step: 0.01 },
        ],
        [
          { kind: 'number', id: 'offsetX', label: 'Offset X', path: 'offsetX', min: -1000, max: 1000, step: 0.1 },
          { kind: 'number', id: 'offsetY', label: 'Offset Y', path: 'offsetY', min: -1000, max: 1000, step: 0.1 },
        ],
        { kind: 'slider', id: 'intensity', label: 'Intensity', path: 'intensity', min: 0, max: 1, step: 0.01 },
      ],
    },
  ],
});
