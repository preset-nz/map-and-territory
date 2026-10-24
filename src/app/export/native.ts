// The native half of the export: the Save dialog and the file write, both in Rust
// (src-tauri/src/export.rs). The webview has no fs plugin and no fs permission.
import { invoke } from '@tauri-apps/api/core';
import type { ExportFormat, PdfPlacement } from './command';

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
 * Has Rust build the one-page PDF around the PNG and write it to `path`. The layout header is
 * `pageW,pageH,x,y,w,h` in points from the page's top-left (src-tauri/src/pdf.rs).
 */
export async function writeExportPdf(
  path: string,
  png: Uint8Array,
  { pagePt, mapPt }: PdfPlacement,
): Promise<void> {
  const layout = [pagePt.w, pagePt.h, mapPt.x, mapPt.y, mapPt.w, mapPt.h].join(',');
  await invoke('export_write_pdf', png, { headers: { path: encodeURIComponent(path), layout } });
}

/** The campaign file's path, or null while Untitled. */
export async function currentDocumentPath(): Promise<string | null> {
  const state = await invoke<{ path: string | null }>('app_kit_document');
  return state.path;
}
