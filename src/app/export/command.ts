// File ▸ Export ▸ Map as PNG… (epic 07 story 4) and Map as PDF… (story 5): choose a file, draw
// the active map, then write it as a PNG with 300 dpi stamped in, or place it in a PDF.
// Campaign as PDF… (epic 32 story 2) draws every map and writes them as one PDF. Rust lays
// the pages out (epic 33 story 3); the flow here only draws and hands over.
// The steps are injected so the flow is tested without a window; `native.ts` supplies the real ones.
import { setPngDpi } from './png';
import type { ExportedMap } from './render';

/** The resolution a map is drawn at: Rust sizes the drawing by it (`PRINT_DPI`), and the PNG
 * says so. */
export const EXPORT_DPI = 300;

export type ExportFormat = 'png' | 'pdf';

/** One map for the PDF: its PNG and its path, by which Rust lays out its page and key. */
export interface PdfSheet {
  png: Uint8Array;
  mapPath: string;
}

/** Rust lays out each map's page with its key, builds the PDF and writes it. */
export type WritePdf = (path: string, sheets: PdfSheet[]) => Promise<void>;

export interface ExportDeps {
  /** The suggested file name's stem: the map's name. */
  mapName: string | null;
  /** The map's path, so Rust can lay out its page and key in a PDF (epic 28). */
  mapPath: string | null;
  /** The campaign file's path, or null while Untitled. */
  documentPath: () => Promise<string | null>;
  /** The Save dialog: the chosen path, or null when cancelled. */
  chooseFile: (
    name: string,
    dir: string | undefined,
    format: ExportFormat,
  ) => Promise<string | null>;
  render: () => Promise<ExportedMap | null>;
  writeFile: (path: string, bytes: Uint8Array) => Promise<void>;
  writePdf: WritePdf;
  /** Status-bar message. */
  notify: (text: string, kind: 'info' | 'error') => void;
}

export type ExportResult = 'saved' | 'cancelled' | 'failed';

/** A file name from a map's name: no path separators or control characters, "Map" if empty. */
export function exportFileName(
  mapName: string | null | undefined,
  format: ExportFormat = 'png',
): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
  const stem = (mapName ?? '').replace(/[/\\:\u0000-\u001f]/g, ' ').trim();
  return `${stem === '' ? 'Map' : stem}.${format}`;
}

/** The folder of a path, or undefined. */
function dirOf(path: string | null): string | undefined {
  if (!path) return undefined;
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return cut > 0 ? path.slice(0, cut) : undefined;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function exportMap(format: ExportFormat, deps: ExportDeps): Promise<ExportResult> {
  try {
    const dir = dirOf(await deps.documentPath());
    const path = await deps.chooseFile(exportFileName(deps.mapName, format), dir, format);
    if (path === null) return 'cancelled';
    const exported = await deps.render();
    if (!exported || (format === 'pdf' && deps.mapPath === null)) {
      deps.notify('Could not export: there is no map to draw.', 'error');
      return 'failed';
    }
    if (format === 'pdf' && deps.mapPath !== null) {
      // The PNG goes in as drawn: the PDF places its pixels, so there is no pHYs to stamp.
      await deps.writePdf(path, [{ png: new Uint8Array(exported.png), mapPath: deps.mapPath }]);
      deps.notify(
        exported.clamped
          ? `Exported PDF. The map was larger than the export limit, so it is below ${EXPORT_DPI} dpi.`
          : 'Exported PDF.',
        exported.clamped ? 'error' : 'info',
      );
      return 'saved';
    }
    await deps.writeFile(path, setPngDpi(exported.png, EXPORT_DPI));
    const { w, h } = exported.size;
    deps.notify(
      exported.clamped
        ? `Exported ${w} × ${h} px. The map was larger than the export limit, so it was drawn smaller than its size on the page.`
        : `Exported ${w} × ${h} px at ${EXPORT_DPI} dpi.`,
      exported.clamped ? 'error' : 'info',
    );
    return 'saved';
  } catch (e) {
    deps.notify(`Could not export the map: ${message(e)}`, 'error');
    return 'failed';
  }
}

export interface CampaignExportDeps {
  /** The suggested file name's stem: the campaign's name. */
  campaignName: string | null;
  documentPath: () => Promise<string | null>;
  chooseFile: ExportDeps['chooseFile'];
  /** Every map in order, drawn on its page, with its path. */
  render: () => Promise<(ExportedMap & { mapPath: string })[]>;
  writePdf: WritePdf;
  notify: ExportDeps['notify'];
}

/** File ▸ Export ▸ Campaign as PDF…: every map, each with its layout, in one PDF. */
export async function exportCampaign(deps: CampaignExportDeps): Promise<ExportResult> {
  try {
    const dir = dirOf(await deps.documentPath());
    const name = exportFileName(deps.campaignName?.trim() || 'Campaign', 'pdf');
    const path = await deps.chooseFile(name, dir, 'pdf');
    if (path === null) return 'cancelled';
    const maps = await deps.render();
    if (maps.length === 0) {
      deps.notify('Could not export: the campaign has no map to draw.', 'error');
      return 'failed';
    }
    await deps.writePdf(
      path,
      maps.map(({ png, mapPath }) => ({ png: new Uint8Array(png), mapPath })),
    );
    const clamped = maps.some((m) => m.clamped);
    const count = maps.length === 1 ? '1 map' : `${maps.length} maps`;
    deps.notify(
      clamped
        ? `Exported ${count} as PDF. A map was larger than the export limit, so it is below ${EXPORT_DPI} dpi.`
        : `Exported ${count} as PDF.`,
      clamped ? 'error' : 'info',
    );
    return 'saved';
  } catch (e) {
    deps.notify(`Could not export the campaign: ${message(e)}`, 'error');
    return 'failed';
  }
}
