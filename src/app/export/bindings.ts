// The Export submenu's webview bindings. Rust declares the item and its chord
// (src-tauri/src/menu.rs); the webview enables it with an active map and runs the export.
import type { Binding } from '@preset.nz/app-kit/core';
import { useMirror } from '@preset.nz/pom';
import { useCallback, useMemo } from 'react';
import { notice } from '../notice';
import { CAMPAIGN_PATH, type RowSource } from '../scene/frame';
import { displayName } from '../scene/tree';
import { useActiveMapId } from '../selection';
import { type ExportFormat, exportCampaign, exportMap } from './command';
import { chooseExportFile, currentDocumentPath, writeExportFile, writeExportPdf } from './native';
import { exportActiveMap, exportCampaignMaps } from './render';

export const EXPORT_PNG = 'file.export-map-png';
export const EXPORT_PDF = 'file.export-pdf';
export const EXPORT_CAMPAIGN_PDF = 'file.export-campaign-pdf';

/** The bindings for the Export items: enabled only with an active map. */
export function exportBindings(
  mapId: string | null,
  run: (format: ExportFormat | 'campaign') => void,
): Record<string, Binding> {
  // with no map selected the first is active, so an active map means the campaign has one
  const enabled = mapId !== null;
  return {
    [EXPORT_PNG]: { enabled, run: () => run('png') },
    [EXPORT_PDF]: { enabled, run: () => run('pdf') },
    [EXPORT_CAMPAIGN_PDF]: { enabled, run: () => run('campaign') },
  };
}

export function useExportBindings(): Record<string, Binding> {
  const mirror = useMirror();
  const mapId = useActiveMapId();
  const run = useCallback(
    (format: ExportFormat | 'campaign') => {
      const rows = mirror as unknown as RowSource;
      if (format === 'campaign') {
        const name = rows.nodeAt(CAMPAIGN_PATH)?.values?.name;
        exportCampaign({
          campaignName: typeof name === 'string' ? name : null,
          documentPath: currentDocumentPath,
          chooseFile: chooseExportFile,
          render: () => exportCampaignMaps(rows),
          writePdf: writeExportPdf,
          notify: notice.show,
        }).catch((e) => console.error('[export]', e));
        return;
      }
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
