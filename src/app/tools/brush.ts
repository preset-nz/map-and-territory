// The brush: which terrain paint and fill lay down. Tool state, never in the document.
import { createStore, useStore } from '@preset.nz/app-kit/core';
import type { TerrainCategory } from '@/palettes/types';

export const TERRAINS: TerrainCategory[] = ['water', 'plains', 'forest', 'hills', 'mountains'];

const store = createStore<TerrainCategory>('plains');

export const brush = {
  get: store.get,
  set: store.set,
  subscribe: store.subscribe,
  use: () => useStore(store),
};
