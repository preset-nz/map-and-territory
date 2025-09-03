import { describe, it, expect, beforeEach } from 'vitest';
import { registerLayerType, getLayerType, unregisterLayerType, listLayerTypes } from '@/layers/registry';
import type { LayerType } from '@/layers/types';
import { PaperAdapter } from '@/layers/adapters/paper';
import { HexgridAdapter } from '@/layers/adapters/hexgrid';

describe('Layer Registry', () => {
  beforeEach(() => {
    // no-op: registry is module-scoped; tests should not rely on previous state
  });

  it('registers and retrieves layer types', () => {
    const paper: LayerType<{ color: string }> = {
      id: 'paper',
      title: 'Paper',
      defaultState: { color: '#ffffff' },
      adapter: PaperAdapter,
    };
    const hex: LayerType<{ size: number; orientation: 'pointy'|'flat'; color: string }> = {
      id: 'hexgrid',
      title: 'Hex Grid',
      defaultState: { size: 24, orientation: 'pointy', color: '#000000' },
      adapter: HexgridAdapter,
    };

    registerLayerType(paper);
    registerLayerType(hex);

    expect(getLayerType('paper')?.title).toBe('Paper');
    expect(getLayerType('hexgrid')?.title).toBe('Hex Grid');
    expect(listLayerTypes().length).toBeGreaterThanOrEqual(2);

    unregisterLayerType('paper');
    unregisterLayerType('hexgrid');
  });
});
