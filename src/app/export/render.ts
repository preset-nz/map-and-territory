// The map at print size (epic 07 story 3): the active map drawn by the render worker into a
// buffer as big as its rectangle on the page. The page layout is story 2's; the PNG and PDF
// writers are stories 4 and 5.
import { type PaperAspect, paperSize } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';
import { readCampaignPage } from '../scene/campaign-page';
import type { RowSource } from '../scene/frame';
import { layoutPage, type PageLayout, type PageSize, paperAspectRatio } from './layout';

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

/** An export with where it sits on the page, for the PDF. */
export interface ExportedPage extends ExportedMap {
  /** The page's size name and its physical size and the map's rectangle on it, in mm. */
  page: { size: PageSize; pageMm: PageLayout['pageMm']; mapMm: PageLayout['mapMm'] };
}

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
 * Draws `frame` at the map rectangle's pixel size. `logical` is the map's paper size in paper
 * px (story 6): the export is the paper scaled to the page, so the hex count is the screen's
 * at any window size and lines, noise and textures scale with the page. The camera is set to 1×.
 */
export async function renderMapForExport(
  target: ExportTarget,
  frame: SceneFrame,
  logical: { w: number; h: number },
  layout: Pick<PageLayout, 'mapPx'>,
): Promise<ExportedMap> {
  const { size, clamped } = exportSize(layout.mapPx);
  const atFit: SceneFrame = { ...frame, camera: { x: 0, y: 0, zoom: 1 } };
  const png = await target.exportPng(atFit, logical, size);
  return { png, size, clamped };
}

/**
 * The active map, ready to export: its frame (no camera, no tool preview) and the paper's
 * logical size. Registered by the canvas host while it is mounted; null without a canvas.
 */
export interface MapExporter {
  /** null when there is no active map to draw. */
  current(): { frame: SceneFrame; logical: { w: number; h: number } } | null;
  target: ExportTarget;
}

/** What an export of `frame` draws: the frame at Fit, on the map's paper size, not the window's. */
export function exportFrame(frame: SceneFrame): {
  frame: SceneFrame;
  logical: { w: number; h: number };
} {
  return {
    frame: { ...frame, camera: { x: 0, y: 0, zoom: 1 } },
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
export async function exportActiveMap(rows: RowSource): Promise<ExportedPage | null> {
  const current = exporter?.current();
  if (!exporter || !current) return null;
  const page = readCampaignPage(rows);
  const layout = layoutPage({
    size: page.size,
    orientation: page.orientation,
    marginMm: page.marginMm,
    aspect: paperAspectRatio(current.frame.paper.aspect),
  });
  const exported = await renderMapForExport(
    exporter.target,
    current.frame,
    current.logical,
    layout,
  );
  return { ...exported, page: { size: page.size, pageMm: layout.pageMm, mapMm: layout.mapMm } };
}
