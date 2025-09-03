import type { LayerAdapter } from '@/layers/types';
import { registerPropertySchema } from '@/properties/registry';

export interface PaperState {
  color: string; // hex
  aspect: 'square' | '4:3' | '16:10';
}

export const PaperAdapter: LayerAdapter<PaperState> = {
  title: 'Paper',
  drawMain(ctx, state, env) {
    const { w, h } = env.size;
    ctx.save();
    ctx.fillStyle = state.color || '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },
  getInvalidationKey(state) {
    return `paper:${state.aspect}:${state.color}`;
  },
};

export const PaperType = {
  id: 'paper',
  title: 'Paper',
  defaultState: { color: '#ffffff', aspect: '16:10' },
  adapter: PaperAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Register Paper properties schema for generic panel
registerPropertySchema('layer:paper', {
  groups: [
    {
      id: 'paper',
      title: 'Paper',
      rows: [
        { kind: 'select', id: 'aspect', label: 'Aspect Ratio', path: 'aspect', options: [
          { value: 'square', label: 'Square (1:1)' },
          { value: '4:3', label: '4:3' },
          { value: '16:10', label: '16:10' },
        ]},
        { kind: 'color', id: 'color', label: 'Color', path: 'color' },
      ],
    },
  ],
});
