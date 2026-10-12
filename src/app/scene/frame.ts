// The projection from the document to the renderer: mirror rows in, a SceneFrame out.
// Pure, so it is tested without a window. Object model: guidance
// projects/map-and-territory/design/object-model.md, "The mirror and the SceneFrame".
import { DefaultPalette } from '@/palettes/defaults';
import type { MapPalette, TerrainCategory } from '@/palettes/types';
import type { PaperSpec, SceneFrame, SceneLayer } from '@/render/types';

/** The part of a `@preset.nz/pom` row the frame reads. A pom `Row` fits it as it is. */
export interface FrameRow {
  id: string;
  type: string;
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

const hex2 = (x: number) =>
  Math.round(Math.min(1, Math.max(0, x)) * 255)
    .toString(16)
    .padStart(2, '0');

/** A rhizome colour (`[r, g, b, a]`, 0 to 1) as CSS: `#rrggbb`, or `#rrggbbaa` when translucent. */
export function cssColour(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const [r, g, b, a] = value as number[];
  const rgb = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a >= 1 ? rgb : `${rgb}${hex2(a)}`;
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

export interface FrameBuilder {
  build(
    rows: RowSource,
    mapId: string | null,
    size: { w: number; h: number },
    pixelRatio: number,
  ): SceneFrame;
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

  const stateOf = (row: FrameRow): Record<string, unknown> => {
    const known = states.get(row);
    if (known) return known;
    const keys = colours.get(row.type);
    const state: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row.values ?? {})) {
      state[k] = keys?.has(k) ? cssColour(v) : v;
    }
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
    build(rows, mapId, size, pixelRatio) {
      const map = mapId ? rows.node(mapId) : undefined;
      if (!map) {
        return { size, pixelRatio, paper: DEFAULT_PAPER, camera: IDENTITY_CAMERA, layers: [] };
      }
      let paper = DEFAULT_PAPER;
      const layers: SceneLayer[] = [];
      for (const id of map.orders?.layers ?? []) {
        const row = rows.node(id);
        if (!row) continue;
        const state = stateOf(row);
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
        camera: IDENTITY_CAMERA,
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
