// File ▸ Export ▸ Map as PNG… (epic 07 story 4) and PDF… (story 5): choose a file, draw the
// active map, then write it as a PNG with 300 dpi stamped in, or place it in a one-page PDF.
// The steps are injected so the flow is tested without a window; `native.ts` supplies the real ones.
import { mmToPt, type Rect } from './layout';
import { setPngDpi } from './png';
import type { ExportedPage } from './render';

export const EXPORT_DPI = 300;

export type ExportFormat = 'png' | 'pdf';

/** Where the map goes on the PDF page, in points from the page's top-left. */
export interface PdfPlacement {
  pagePt: { w: number; h: number };
  mapPt: Rect;
}

/** The PDF's placement from the layout in mm. */
export function pdfPlacement({ pageMm, mapMm }: ExportedPage['page']): PdfPlacement {
  return {
    pagePt: { w: mmToPt(pageMm.w), h: mmToPt(pageMm.h) },
    mapPt: { x: mmToPt(mapMm.x), y: mmToPt(mapMm.y), w: mmToPt(mapMm.w), h: mmToPt(mapMm.h) },
  };
}

export interface ExportDeps {
  /** The suggested file name's stem: the map's name. */
  mapName: string | null;
  /** The map's path, so Rust can put its key after it in a PDF (epic 28). */
  mapPath: string | null;
  /** The campaign file's path, or null while Untitled. */
  documentPath: () => Promise<string | null>;
  /** The Save dialog: the chosen path, or null when cancelled. */
  chooseFile: (
    name: string,
    dir: string | undefined,
    format: ExportFormat,
  ) => Promise<string | null>;
  render: () => Promise<ExportedPage | null>;
  writeFile: (path: string, bytes: Uint8Array) => Promise<void>;
  /** Rust builds the PDF around the PNG, with the map's key after it, and writes it. */
  writePdf: (
    path: string,
    png: Uint8Array,
    placement: PdfPlacement,
    mapPath: string | null,
  ) => Promise<void>;
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
    if (!exported) {
      deps.notify('Could not export: there is no map to draw.', 'error');
      return 'failed';
    }
    if (format === 'pdf') {
      // The PNG goes in as drawn: the PDF places its pixels, so there is no pHYs to stamp.
      await deps.writePdf(
        path,
        new Uint8Array(exported.png),
        pdfPlacement(exported.page),
        deps.mapPath,
      );
      const { size } = exported.page;
      deps.notify(
        exported.clamped
          ? `Exported ${size.toUpperCase()} PDF. The map was larger than the export limit, so it is below ${EXPORT_DPI} dpi.`
          : `Exported ${size.toUpperCase()} PDF.`,
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
