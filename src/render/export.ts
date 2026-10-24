import type { Canvas2DBackend } from '@/render/backends/canvas2d';
import type { ExportMessage } from '@/render/types';

/**
 * Draws an export request into a canvas of its own at `out` pixels and encodes it as PNG
 * bytes. The backend is the worker's, so the textures it already holds are drawn.
 */
export async function renderExportPng(
  backend: Pick<Canvas2DBackend, 'renderExport'>,
  msg: Pick<ExportMessage, 'frame' | 'logical' | 'out'>,
): Promise<ArrayBuffer> {
  const w = Math.max(1, Math.floor(msg.out.w));
  const h = Math.max(1, Math.floor(msg.out.h));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D context for the export canvas');
  backend.renderExport(ctx, msg.frame, msg.logical, { w, h });
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blob.arrayBuffer();
}
