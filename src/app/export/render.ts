// The map at print size (epic 07 story 3): the active map drawn by the render worker into a
// buffer as big as its rectangle on the page. Rust lays the page out (`export_sheet`, epic 33
// story 3); this only draws to the size it gives.
import type { LocationsState } from '@/layers/adapters/locations';
import { type PaperAspect, paperSize } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';
import { MAPS_PATH, type RowSource } from '../scene/frame';

/** The longest side the export draws, in pixels. A4 at 300 dpi is about 2480 × 3508. */
export const MAX_EXPORT_SIDE = 8192;

/** What draws an export: the render service fits it. */
export interface ExportTarget {
  exportPng(
    frame: SceneFrame,
    logical: { w: number; h: number },
    out: { w: number; h: number },
  ): Promise<ArrayBuffer>;
}

export interface ExportedMap {
  png: ArrayBuffer;
  /** The PNG's size in pixels. */
  size: { w: number; h: number };
  /** True when the map rectangle was larger than MAX_EXPORT_SIDE and was drawn smaller. */
  clamped: boolean;
}

/** A map's place on its page as Rust lays it out: points from the page's top-left, and the pixel
 * size to draw the map at (300 dpi). */
export interface SheetSize {
  pagePt: { w: number; h: number };
  mapPt: { x: number; y: number; w: number; h: number };
  mapPx: { w: number; h: number };
}

/** Asks Rust for a map's sheet by the map's path (`export_sheet`); injected so no Tauri API is
 * imported here. */
export type SheetOf = (mapPath: string) => Promise<SheetSize>;

/** The map rectangle's pixel size, scaled down uniformly if a side is over `max`. */
export function exportSize(
  mapPx: { w: number; h: number },
  max: number = MAX_EXPORT_SIDE,
): { size: { w: number; h: number }; clamped: boolean } {
  const w = Math.max(1, Math.round(mapPx.w));
  const h = Math.max(1, Math.round(mapPx.h));
  const longest = Math.max(w, h);
  if (longest <= max) return { size: { w, h }, clamped: false };
  const f = max / longest;
  return {
    size: { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) },
    clamped: true,
  };
}

/**
 * Draws `frame` at the map rectangle's pixel size, `mapPx` from Rust. `logical` is the map's paper size in paper
 * px (story 6): the export is the paper scaled to the page, so the hex count is the screen's
 * at any window size and lines, noise and textures scale with the page. The camera is set to 1×.
 */
export async function renderMapForExport(
  target: ExportTarget,
  frame: SceneFrame,
  logical: { w: number; h: number },
  mapPx: { w: number; h: number },
): Promise<ExportedMap> {
  const { size, clamped } = exportSize(mapPx);
  const atFit: SceneFrame = { ...frame, camera: { x: 0, y: 0, zoom: 1 } };
  const png = await target.exportPng(atFit, logical, size);
  return { png, size, clamped };
}

/**
 * The active map, ready to export: its frame (no camera, no tool preview) and the paper's
 * logical size. Registered by the canvas host while it is mounted; null without a canvas.
 */
/** A map ready to draw for an export: its id, its frame and its paper's logical size. */
export interface Drawable {
  mapId: string;
  frame: SceneFrame;
  logical: { w: number; h: number };
}

export interface MapExporter {
  /** null when there is no active map to draw. */
  current(): Drawable | null;
  /** Any map by id, the same way; null when it has nothing to draw. */
  of(mapId: string): Drawable | null;
  /** Settles once the textures the frame names are loaded (or failed). */
  prepare(frame: SceneFrame): Promise<void>;
  target: ExportTarget;
}

/** A layer with its hidden places left out: they are the owner's secrets (epic 28). */
function withoutHidden(layer: SceneFrame['layers'][number]): SceneFrame['layers'][number] {
  if (layer.type !== 'locations') return layer;
  const state = layer.state as LocationsState;
  const locations = (state.locations ?? []).filter((l) => !l.hidden);
  return locations.length === state.locations?.length
    ? layer
    : { ...layer, state: { ...state, locations } };
}

/**
 * What an export of `frame` draws: the frame at Fit, on the map's paper size, not the window's,
 * without the hidden places. Their numbers stay, so the printed ones match the window's.
 */
export function exportFrame(frame: SceneFrame): {
  frame: SceneFrame;
  logical: { w: number; h: number };
} {
  return {
    frame: { ...frame, camera: { x: 0, y: 0, zoom: 1 }, layers: frame.layers.map(withoutHidden) },
    logical: paperSize(frame.paper.aspect as PaperAspect),
  };
}

let exporter: MapExporter | null = null;

export function setMapExporter(next: MapExporter | null) {
  exporter = next;
}

export function mapExporter(): MapExporter | null {
  return exporter;
}

/**
 * The active map drawn at its size on the campaign's page, or null with no canvas or no map.
 * The export commands call this: the PNG writes it alone, the PDF places it on the page.
 */
export async function exportActiveMap(
  rows: RowSource,
  sheetOf: SheetOf,
): Promise<ExportedMap | null> {
  const current = exporter?.current() ?? null;
  const path = current ? mapPathOf(rows, current.mapId) : null;
  return current && path ? exportOne(sheetOf, current, path) : null;
}

/**
 * Every map of the campaign in `maps` order, each drawn at its size on the campaign's page,
 * with its path for its key and layout (epic 32 story 2). Maps with nothing to draw are left
 * out; empty with no canvas.
 */
export async function exportCampaignMaps(
  rows: RowSource,
  sheetOf: SheetOf,
): Promise<(ExportedMap & { mapPath: string })[]> {
  const out: (ExportedMap & { mapPath: string })[] = [];
  for (const id of rows.nodeAt(MAPS_PATH)?.orders?.maps ?? []) {
    const path = mapPathOf(rows, id);
    const current = exporter?.of(id) ?? null;
    if (!path || !current) continue;
    const exported = await exportOne(sheetOf, current, path);
    if (exported) out.push({ ...exported, mapPath: path });
  }
  return out;
}

const mapPathOf = (rows: RowSource, id: string): string | null =>
  (rows.node(id) as { path?: string } | undefined)?.path ?? null;

async function exportOne(
  sheetOf: SheetOf,
  current: Drawable,
  path: string,
): Promise<ExportedMap | null> {
  if (!exporter) return null;
  // a map that isn't on screen may not have its textures in the worker yet
  await exporter.prepare(current.frame);
  const { mapPx } = await sheetOf(path);
  return renderMapForExport(exporter.target, current.frame, current.logical, mapPx);
}
