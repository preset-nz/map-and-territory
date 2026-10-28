// The scene's menu commands, bound to the selection. Rust declares them (src-tauri/src/menu.rs)
// and forwards them here because only the webview knows what is selected.
import type { Binding } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useMemo, useSyncExternalStore } from 'react';
import { useRun } from '../document';
import { activeMapId, type Selected, selection } from '../selection';
import type { RowSource } from './frame';
import { FURNITURE_KINDS, type TreeRow } from './tree';

type Rows = { node(id: string): (TreeRow & { parent?: string | null }) | undefined } & RowSource;

export interface SceneCommandState {
  /** The selected node's path and title, when something deletable or duplicable is selected. */
  target: { path: string; title: string; anchor: boolean } | null;
  /** The active map's path: where an added layer goes. */
  mapPath: string | null;
  /**
   * The selected layer's path, when a layer is selected: an added layer goes above it. Null for
   * the grid, since nothing goes above it: the layer then lands just below it, at the map's top.
   * Null for furniture too, which isn't in `layers`.
   */
  layerPath: string | null;
  canMove: { forward: boolean; backward: boolean };
}

const ANCHORS = new Set(['paper', 'hexgrid']);
const KIND_TITLE: Record<string, string> = { map: 'Map', campaign: 'Campaign', cartouche: 'Title' };

/** What the selection allows, read from the document rows. Pure, for tests. */
export function sceneCommandState(selected: Selected, rows: Rows): SceneCommandState {
  const mapId = activeMapId(selected, rows);
  const map = mapId ? rows.node(mapId) : undefined;
  const id = selected.kind === 'map' || selected.kind === 'layer' ? selected.id : null;
  const row = id ? rows.node(id) : undefined;
  const anchor = row ? ANCHORS.has(row.type) : false;
  const isLayer = selected.kind === 'layer' && row !== undefined;

  let forward = false;
  let backward = false;
  if (isLayer && !anchor && map) {
    const layers = map.orders?.layers ?? [];
    const i = layers.indexOf(row.id);
    // index 0 is the paper and the last is the grid: a layer moves only between them
    forward = i >= 1 && i < layers.length - 2;
    backward = i > 1;
  }
  return {
    target: row ? { path: row.path, title: KIND_TITLE[row.type] ?? 'Layer', anchor } : null,
    mapPath: map?.path ?? null,
    layerPath:
      isLayer && row.type !== 'hexgrid' && !FURNITURE_KINDS.has(row.type) ? row.path : null,
    canMove: { forward, backward },
  };
}

/** The bindings for Edit's Duplicate and Delete, the Layer menu and the moves. */
export function useSceneBindings(): Record<string, Binding> {
  const mirror = useMirror();
  const run = useRun();
  const subscribe = (f: () => void) => {
    const a = mirror.subscribe(f);
    const b = selection.subscribe(f);
    return () => {
      a();
      b();
    };
  };
  // A fresh state object each read would loop; read the inputs, derive in useMemo.
  const selected = useSyncExternalStore(subscribe, selection.get);
  const version = useSyncExternalStore(subscribe, () => mirror.seq * 1e6 + mirror.generation);
  return useMemo(() => {
    void version;
    const s = sceneCommandState(selected, mirror as unknown as Rows);
    const at = s.target?.path;
    const editable = s.target !== null && !s.target.anchor;
    const add = (type: string) => () => {
      if (s.mapPath) run('node.add', { parent: s.mapPath, type, above: s.layerPath ?? undefined });
    };
    const move = (id: string, can: boolean): Binding => ({
      enabled: can,
      run: () => at && run(id, { at }),
    });
    return {
      'edit.duplicate': {
        label: editable ? `Duplicate ${s.target?.title}` : 'Duplicate',
        enabled: editable,
        run: () => at && run('edit.duplicate', { at }),
      },
      'edit.delete': {
        label: editable ? `Delete ${s.target?.title}` : 'Delete',
        enabled: editable,
        run: () => {
          if (!at) return;
          run('edit.delete', { at });
          selection.clear();
        },
      },
      'layer.add-hex-noise': { enabled: s.mapPath !== null, run: add('hex-noise') },
      'layer.add-freeform': { enabled: s.mapPath !== null, run: add('freeform') },
      'layer.add-outline': { enabled: s.mapPath !== null, run: add('outline') },
      'layer.add-image': { enabled: s.mapPath !== null, run: add('image') },
      // furniture always lands on top of the map's `furniture`, whatever is selected
      'layer.add-title': {
        enabled: s.mapPath !== null,
        run: () => s.mapPath && run('node.add', { parent: s.mapPath, type: 'cartouche' }),
      },
      'edit.move-earlier': move('edit.move-earlier', s.canMove.forward),
      'edit.move-later': move('edit.move-later', s.canMove.backward),
      'edit.move-to-front': move('edit.move-to-front', s.canMove.forward),
      'edit.move-to-back': move('edit.move-to-back', s.canMove.backward),
    };
  }, [selected, version, mirror, run]);
}
