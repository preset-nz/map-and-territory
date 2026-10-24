// The Export submenu's webview bindings. Rust declares the item and its chord
// (src-tauri/src/menu.rs); the webview enables it with an active map and runs the export.
import type { Binding } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useCallback, useMemo } from 'react';
import { notice } from '../notice';
import type { RowSource } from '../scene/frame';
import { displayName } from '../scene/tree';
import { useActiveMapId } from '../selection';
import { exportMapAsPng } from './command';
import { chooseExportFile, currentDocumentPath, writeExportFile } from './native';
import { exportActiveMap } from './render';

export const EXPORT_PNG = 'file.export-map-png';

/** The bindings for the Export items: enabled only with an active map. */
export function exportBindings(mapId: string | null, run: () => void): Record<string, Binding> {
  return { [EXPORT_PNG]: { enabled: mapId !== null, run } };
}

export function useExportBindings(): Record<string, Binding> {
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const run = useCallback(() => {
    const rows = mirror as unknown as RowSource;
    const row = mapId ? rows.node(mapId) : undefined;
    exportMapAsPng({
      mapName: row ? displayName(row as Parameters<typeof displayName>[0]) : null,
      documentPath: currentDocumentPath,
      chooseFile: chooseExportFile,
      render: () => exportActiveMap(rows),
      writeFile: writeExportFile,
      notify: notice.show,
    }).catch((e) => console.error('[export]', e));
  }, [mirror, mapId]);
  return useMemo(() => exportBindings(mapId, run), [mapId, run]);
}
