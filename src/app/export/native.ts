// The native half of the export: the Save dialog and the file write, both in Rust
// (src-tauri/src/export.rs). The webview has no fs plugin and no fs permission.
import { invoke } from '@tauri-apps/api/core';
import type { ExportFormat, PdfSheet } from './command';
import type { SheetSize } from './render';

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
 * Where Rust puts the map at `map` on the campaign's page: the size to draw it at (src-tauri/
 * src/export.rs). The page is laid out in Rust alone; the webview only draws to this size.
 */
export function exportSheet(map: string): Promise<SheetSize> {
  return invoke<SheetSize>('export_sheet', { map });
}

/**
 * Has Rust build the PDF from the maps and write it to `path`. The body is the PNGs end to
 * end; the `manifest` header (percent-encoded JSON) lists each one's map path and byte length.
 * Rust lays every page out from the document (src-tauri/src/export.rs).
 */
export async function writeExportPdf(path: string, sheets: PdfSheet[]): Promise<void> {
  const body = new Uint8Array(sheets.reduce((n, s) => n + s.png.byteLength, 0));
  let at = 0;
  for (const s of sheets) {
    body.set(s.png, at);
    at += s.png.byteLength;
  }
  const manifest = sheets.map((s) => ({ map: s.mapPath, size: s.png.byteLength }));
  const headers = {
    path: encodeURIComponent(path),
    manifest: encodeURIComponent(JSON.stringify(manifest)),
  };
  await invoke('export_write_pdf', body, { headers });
}

/** The campaign file's path, or null while Untitled. */
export async function currentDocumentPath(): Promise<string | null> {
  const state = await invoke<{ path: string | null }>('app_kit_document');
  return state.path;
}
