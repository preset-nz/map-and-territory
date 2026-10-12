// What is selected in the scene: interaction state, kept out of the document
// (guidance design/interaction-state.md). Undo and redo leave it alone, and a selection whose
// target is gone reads as nothing selected.
import { createSelection } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useSyncExternalStore } from 'react';
import { MAPS_PATH, type RowSource } from './scene/frame';

export type Selected =
  | { kind: 'none' }
  | { kind: 'campaign' }
  | { kind: 'map'; id: string }
  | { kind: 'layer'; id: string };

const NONE: Selected = { kind: 'none' };
const store = createSelection<Selected>(NONE);

export const selection = {
  get: store.get,
  use: store.use,
  subscribe: store.subscribe,
  clear: store.clear,
  selectCampaign: () => store.select({ kind: 'campaign' }),
  selectMap: (id: string) => store.select({ kind: 'map', id }),
  selectLayer: (id: string) => store.select({ kind: 'layer', id }),
};

/** A row's parent id, where the source knows it (a pom `Row` does). */
type WithParent = { parent?: string | null };

/**
 * The map that is drawn: the selected map, or the selected layer's map; otherwise the first map
 * in `maps` order. A selection whose node has gone falls through to the first map.
 */
export function activeMapId(selected: Selected, rows: RowSource): string | null {
  if (selected.kind === 'map' && rows.node(selected.id)) return selected.id;
  if (selected.kind === 'layer') {
    const layer = rows.node(selected.id) as (WithParent & object) | undefined;
    const parent = layer?.parent;
    if (parent && rows.node(parent)) return parent;
  }
  return rows.nodeAt(MAPS_PATH)?.orders?.maps?.[0] ?? null;
}

/** The active map, kept current as the selection or the document changes. */
export function useActiveMapId(): string | null {
  const mirror = useMirror();
  const subscribe = (f: () => void) => {
    const a = mirror.subscribe(f);
    const b = selection.subscribe(f);
    return () => {
      a();
      b();
    };
  };
  return useSyncExternalStore(subscribe, () => activeMapId(selection.get(), mirror));
}
