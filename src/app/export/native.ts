// The native half of the export: the Save dialog and the file write, both in Rust
// (src-tauri/src/export.rs). The webview has no fs plugin and no fs permission.
import { invoke } from '@tauri-apps/api/core';
import type { ExportFormat, PdfSheet } from './command';

/** The Save dialog, starting in `dir`: the path chosen, or null when cancelled. */
export function chooseExportFile(
  name: string,
  dir: string | undefined,
  format: ExportFormat,
): Promise<string | null> {
  return invoke<string | null>('export_choose_file', { name, dir, format });
}

/** Writes the bytes to `path` (the body goes raw; the path travels percent-encoded in a header). */
export async function writeExportFile(path: string, bytes: Uint8Array): Promise<void> {
  await invoke('export_write_file', bytes, { headers: { path: encodeURIComponent(path) } });
}

/**
 * Has Rust build the PDF from the maps and write it to `path`. The body is the PNGs end to
 * end, `sizes` their byte lengths; `layout` is each map's `pageW,pageH,x,y,w,h` in points from
 * the page's top-left and `map` each map's path, both `;`-separated (src-tauri/src/export.rs).
 */
export async function writeExportPdf(path: string, sheets: PdfSheet[]): Promise<void> {
  const body = new Uint8Array(sheets.reduce((n, s) => n + s.png.byteLength, 0));
  let at = 0;
  for (const s of sheets) {
    body.set(s.png, at);
    at += s.png.byteLength;
  }
  const headers = {
    path: encodeURIComponent(path),
    sizes: sheets.map((s) => s.png.byteLength).join(','),
    layout: sheets
      .map(({ placement: { pagePt, mapPt } }) =>
        [pagePt.w, pagePt.h, mapPt.x, mapPt.y, mapPt.w, mapPt.h].join(','),
      )
      .join(';'),
    map: sheets.map((s) => encodeURIComponent(s.mapPath ?? '')).join(';'),
  };
  await invoke('export_write_pdf', body, { headers });
}

/** The campaign file's path, or null while Untitled. */
export async function currentDocumentPath(): Promise<string | null> {
  const state = await invoke<{ path: string | null }>('app_kit_document');
  return state.path;
}
