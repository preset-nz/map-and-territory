// File ▸ Export ▸ Map as PNG… (epic 07 story 4): choose a file, draw the active map, stamp
// 300 dpi into the PNG and write it. The steps are injected so the flow is tested without a
// window; `native.ts` supplies the real ones.
import { setPngDpi } from './png';
import type { ExportedMap } from './render';

export const EXPORT_DPI = 300;

export interface ExportDeps {
  /** The suggested file name's stem: the map's name. */
  mapName: string | null;
  /** The campaign file's path, or null while Untitled. */
  documentPath: () => Promise<string | null>;
  /** The Save dialog: the chosen path, or null when cancelled. */
  chooseFile: (name: string, dir: string | undefined) => Promise<string | null>;
  render: () => Promise<ExportedMap | null>;
  writeFile: (path: string, bytes: Uint8Array) => Promise<void>;
  /** Status-bar message. */
  notify: (text: string, kind: 'info' | 'error') => void;
}

export type ExportResult = 'saved' | 'cancelled' | 'failed';

/** A file name from a map's name: no path separators or control characters, "Map" if empty. */
export function exportFileName(mapName: string | null | undefined): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
  const stem = (mapName ?? '').replace(/[/\\:\u0000-\u001f]/g, ' ').trim();
  return `${stem === '' ? 'Map' : stem}.png`;
}

/** The folder of a path, or undefined. */
function dirOf(path: string | null): string | undefined {
  if (!path) return undefined;
  const cut = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return cut > 0 ? path.slice(0, cut) : undefined;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function exportMapAsPng(deps: ExportDeps): Promise<ExportResult> {
  try {
    const dir = dirOf(await deps.documentPath());
    const path = await deps.chooseFile(exportFileName(deps.mapName), dir);
    if (path === null) return 'cancelled';
    const exported = await deps.render();
    if (!exported) {
      deps.notify('Could not export: there is no map to draw.', 'error');
      return 'failed';
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
