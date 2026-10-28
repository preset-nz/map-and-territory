// The Export submenu's webview bindings. Rust declares the item and its chord
// (src-tauri/src/menu.rs); the webview enables it with an active map and runs the export.
import type { Binding } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useCallback, useMemo } from 'react';
import { notice } from '../notice';
import type { RowSource } from '../scene/frame';
import { displayName } from '../scene/tree';
import { useActiveMapId } from '../selection';
import { type ExportFormat, exportMap } from './command';
import { chooseExportFile, currentDocumentPath, writeExportFile, writeExportPdf } from './native';
import { exportActiveMap } from './render';

export const EXPORT_PNG = 'file.export-map-png';
export const EXPORT_PDF = 'file.export-pdf';

/** The bindings for the Export items: enabled only with an active map. */
export function exportBindings(
  mapId: string | null,
  run: (format: ExportFormat) => void,
): Record<string, Binding> {
  const enabled = mapId !== null;
  return {
    [EXPORT_PNG]: { enabled, run: () => run('png') },
    [EXPORT_PDF]: { enabled, run: () => run('pdf') },
  };
}

export function useExportBindings(): Record<string, Binding> {
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const run = useCallback(
    (format: ExportFormat) => {
      const rows = mirror as unknown as RowSource;
      const row = mapId ? rows.node(mapId) : undefined;
      exportMap(format, {
        mapName: row ? displayName(row as Parameters<typeof displayName>[0]) : null,
        mapPath: (row as { path?: string } | undefined)?.path ?? null,
        documentPath: currentDocumentPath,
        chooseFile: chooseExportFile,
        render: () => exportActiveMap(rows),
        writeFile: writeExportFile,
        writePdf: writeExportPdf,
        notify: notice.show,
      }).catch((e) => console.error('[export]', e));
    },
    [mirror, mapId],
  );
  return useMemo(() => exportBindings(mapId, run), [mapId, run]);
}
