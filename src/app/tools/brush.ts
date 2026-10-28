// The brush: which terrain paint and fill lay down. Tool state, never in the document.
// Picked in the inspector's palette strip (epic 30), by terrain; until cells hold terrain ids
// (epic 26) a stroke paints the terrain's base type, so `get` gives that.
import { createStore, useStore } from '@preset.nz/app-kit/core';
import type { TerrainCategory } from '@/palettes/types';

export const TERRAINS: TerrainCategory[] = ['water', 'plains', 'forest', 'hills', 'mountains'];

export interface BrushTerrain {
  baseType: TerrainCategory;
  /** The palette terrain picked; null for the base type alone. */
  id: string | null;
}

const store = createStore<BrushTerrain>({ baseType: 'plains', id: null });

export const brush = {
  /** The base type a stroke paints. */
  get: () => store.get().baseType,
  /** The terrain picked, for the strip to mark. */
  picked: store.get,
  set: (baseType: TerrainCategory, id: string | null = null) => store.set({ baseType, id }),
  subscribe: store.subscribe,
  use: () => useStore(store),
};
