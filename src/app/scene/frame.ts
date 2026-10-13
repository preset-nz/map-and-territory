// The projection from the document to the renderer: mirror rows in, a SceneFrame out.
// Pure, so it is tested without a window. Object model: guidance
// projects/map-and-territory/design/object-model.md, "The mirror and the SceneFrame".
import { DefaultPalette } from '@/palettes/defaults';
import type { MapPalette, TerrainCategory } from '@/palettes/types';
import type { PaperSpec, SceneFrame, SceneLayer } from '@/render/types';
import type { Camera } from '../view/camera';
import { cssColour } from './colour';
import { decodeChunk, type Voxel } from './voxels';

export { cssColour };

/** The part of a `@preset.nz/pom` row the frame reads. A pom `Row` fits it as it is. */
export interface FrameRow {
  id: string;
  type: string;
  /** The node's path; its last segment names a chunk. */
  path?: string;
  values?: Record<string, unknown>;
  refs?: Record<string, { file?: string; node?: string }>;
  orders?: Record<string, string[]>;
}

/** Where rows come from: the pom `Mirror` fits it. */
export interface RowSource {
  node(id: string): FrameRow | undefined;
  nodeAt(path: string): FrameRow | undefined;
}

/** The part of the registry schema the frame reads: which values are colours. */
export interface FrameSchema {
  types: { name: string; values?: { key: string; kind: string }[] }[];
}

export const CAMPAIGN_PATH = '/campaign/campaign';
export const MAPS_PATH = '/maps';

const IDENTITY_CAMERA = { x: 0, y: 0, zoom: 1 };
const DEFAULT_PAPER: PaperSpec = { aspect: '16:10', color: '#ffffff' };
const TERRAINS: TerrainCategory[] = ['water', 'plains', 'forest', 'hills', 'mountains'];

/** Each kind's colour-valued keys, from the schema the view carries. */
export function colourKeys(schema: FrameSchema | null | undefined): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const t of schema?.types ?? []) {
    const keys = (t.values ?? []).filter((v) => v.kind === 'colour').map((v) => v.key);
    if (keys.length) out.set(t.name, new Set(keys));
  }
  return out;
}

/** The first map in `maps` order, the active map until something chooses another. */
export function defaultMapId(rows: RowSource): string | null {
  return rows.nodeAt(MAPS_PATH)?.orders?.maps?.[0] ?? null;
}

/**
 * After an undo or redo: the map to make active, when every change lies under one map other
 * than the active one (epic 11's "undo shows what it changed"). `null` leaves it as it is.
 */
export function mapToFollow(
  changes: readonly { path: string }[],
  rows: RowSource,
  activeMapId: string | null,
): string | null {
  let mapPath: string | null = null;
  for (const c of changes) {
    const parts = c.path.split('/');
    if (parts[1] !== MAPS_PATH.slice(1) || !parts[2]) return null;
    const p = `${MAPS_PATH}/${parts[2]}`;
    if (mapPath !== null && p !== mapPath) return null;
    mapPath = p;
  }
  if (mapPath === null) return null;
  const id = rows.nodeAt(mapPath)?.id ?? null;
  return id !== null && id !== activeMapId ? id : null;
}

/** The outline tool's preview: which path is open and the corner near the pointer. */
export interface OutlinePreview {
  layerId: string | null;
  active: boolean;
  hover: { hex: { q: number; r: number }; corner: number } | null;
}

export interface FrameBuilder {
  build(
    rows: RowSource,
    mapId: string | null,
    size: { w: number; h: number },
    pixelRatio: number,
    preview?: OutlinePreview,
    camera?: Camera,
  ): SceneFrame;
}

interface StoredPath {
  corners: { q: number; r: number; corner: number }[];
  closed: boolean;
}

/** An outline layer's `paths` as the adapter reads them: nested hexes, a path id. */
function adapterPaths(value: unknown) {
  const paths = Array.isArray(value) ? (value as StoredPath[]) : [];
  return paths.map((p, i) => ({
    id: `path-${i}`,
    closed: p.closed,
    corners: p.corners.map((c) => ({ hex: { q: c.q, r: c.r }, corner: c.corner })),
  }));
}

/**
 * A frame builder with its memo. A layer whose row object is unchanged keeps its `state`
 * object, and a palette whose row is unchanged keeps its `MapPalette`, so the renderer's
 * keys and delta frames see only what moved. Rows are immutable: a patch replaces a row.
 */
export function createFrameBuilder(schema: FrameSchema | null | undefined): FrameBuilder {
  const colours = colourKeys(schema);
  const states = new WeakMap<FrameRow, Record<string, unknown>>();
  const palettes = new WeakMap<FrameRow, MapPalette>();
  const chunkCells = new WeakMap<FrameRow, Record<string, Voxel>>();
  // a freeform layer's state, kept while neither its row nor any of its chunk rows changed
  const freeform = new WeakMap<FrameRow, { chunks: FrameRow[]; state: Record<string, unknown> }>();

  const cellsOfChunk = (row: FrameRow): Record<string, Voxel> => {
    const known = chunkCells.get(row);
    if (known) return known;
    const name = row.path?.split('/').pop() ?? '';
    const cells = decodeChunk(name, row.values?.voxels);
    chunkCells.set(row, cells);
    return cells;
  };

  /** A freeform layer's adapter state: its values plus `cells` gathered from its chunks. */
  const freeformState = (rows: RowSource, row: FrameRow): Record<string, unknown> => {
    const chunks = (row.orders?.chunks ?? [])
      .map((id) => rows.node(id))
      .filter((c): c is FrameRow => c !== undefined);
    const known = freeform.get(row);
    if (
      known &&
      known.chunks.length === chunks.length &&
      known.chunks.every((c, i) => c === chunks[i])
    ) {
      return known.state;
    }
    const cells: Record<string, Voxel> = {};
    for (const c of chunks) Object.assign(cells, cellsOfChunk(c));
    const state = { ...stateOf(row), cells };
    freeform.set(row, { chunks, state });
    return state;
  };

  const stateOf = (row: FrameRow): Record<string, unknown> => {
    const known = states.get(row);
    if (known) return known;
    const keys = colours.get(row.type);
    const state: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row.values ?? {})) {
      state[k] = keys?.has(k) ? cssColour(v) : v;
    }
    if (row.type === 'outline') state.paths = adapterPaths(row.values?.paths);
    states.set(row, state);
    return state;
  };

  const paletteOf = (row: FrameRow): MapPalette => {
    const known = palettes.get(row);
    if (known) return known;
    const palette = paletteFromRow(row, colours.get(row.type));
    palettes.set(row, palette);
    return palette;
  };

  /** Map, then campaign, then the code fallback. */
  const resolvePalette = (rows: RowSource, map: FrameRow): MapPalette => {
    for (const follower of [map, rows.nodeAt(CAMPAIGN_PATH)]) {
      const id = follower?.refs?.palette?.node;
      const theme = id ? rows.node(id) : undefined;
      if (theme) return paletteOf(theme);
    }
    return DefaultPalette;
  };

  return {
    build(rows, mapId, size, pixelRatio, preview, camera = IDENTITY_CAMERA) {
      const map = mapId ? rows.node(mapId) : undefined;
      if (!map) {
        return { size, pixelRatio, paper: DEFAULT_PAPER, camera, layers: [] };
      }
      let paper = DEFAULT_PAPER;
      const layers: SceneLayer[] = [];
      for (const id of map.orders?.layers ?? []) {
        const row = rows.node(id);
        if (!row) continue;
        let state = row.type === 'freeform' ? freeformState(rows, row) : stateOf(row);
        if (row.type === 'outline' && preview?.layerId === id) {
          // tool state rides on a copy, so the row's memoised state stays clean
          const paths = state.paths as { id: string; closed: boolean }[];
          const open = preview.active ? paths[paths.length - 1] : undefined;
          state = {
            ...state,
            activePathId: open && !open.closed ? open.id : null,
            hoverCorner: preview.hover,
          };
        }
        if (row.type === 'paper') {
          paper = {
            aspect: (state.aspect as PaperSpec['aspect']) ?? DEFAULT_PAPER.aspect,
            color: (state.color as string) ?? DEFAULT_PAPER.color,
          };
        }
        layers.push({ id, type: row.type, visible: state.visible !== false, state });
      }
      return {
        size,
        pixelRatio,
        paper,
        camera,
        layers,
        palette: resolvePalette(rows, map),
      };
    },
  };
}

interface TerrainEntry {
  baseType?: string;
  name?: string;
  colour?: unknown;
}

/** A `palette` node as the 2025 `MapPalette`: the first terrain of each base type, the grid line. */
function paletteFromRow(row: FrameRow, keys: Set<string> | undefined): MapPalette {
  const v = row.values ?? {};
  const terrain = { ...DefaultPalette.terrain };
  const seen = new Set<string>();
  for (const t of (v.terrains as TerrainEntry[] | undefined) ?? []) {
    const base = t.baseType as TerrainCategory | undefined;
    if (!base || !TERRAINS.includes(base) || seen.has(base)) continue;
    const fill = cssColour(t.colour);
    if (!fill) continue;
    seen.add(base);
    terrain[base] = { fill, label: t.name };
  }
  const line = keys?.has('gridLine') ? cssColour(v.gridLine) : undefined;
  return { terrain, grid: { line: line ?? DefaultPalette.grid.line } };
}

/** A map's palette by the cascade (map, then campaign, then the fallback), unmemoised: for UI. */
export function mapPalette(
  rows: RowSource,
  mapId: string | null,
  schema: FrameSchema | null | undefined,
): MapPalette {
  const map = mapId ? rows.node(mapId) : undefined;
  for (const follower of [map, rows.nodeAt(CAMPAIGN_PATH)]) {
    const id = follower?.refs?.palette?.node;
    const theme = id ? rows.node(id) : undefined;
    if (theme) return paletteFromRow(theme, colourKeys(schema).get(theme.type));
  }
  return DefaultPalette;
}

/** The name of the theme a map draws with, by the same cascade; null for the code fallback. */
export function mapPaletteName(rows: RowSource, mapId: string | null): string | null {
  const map = mapId ? rows.node(mapId) : undefined;
  for (const follower of [map, rows.nodeAt(CAMPAIGN_PATH)]) {
    const id = follower?.refs?.palette?.node;
    const theme = id ? rows.node(id) : undefined;
    if (theme) return typeof theme.values?.name === 'string' ? theme.values.name : null;
  }
  return null;
}
