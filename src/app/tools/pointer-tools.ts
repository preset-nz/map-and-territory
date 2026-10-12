// What the active tool does with a pointer on the paper. Paint, erase and fill work on the
// selected freeform layer; the other tools arrive with their layers.
import { useMirror } from '@preset.nz/pom';
import { useCallback, useRef } from 'react';
import { floodFill } from '@/lib/flood-fill';
import type { SceneFrame } from '@/render/types';
import type { OnPointer } from '../canvas-host';
import { useChannel } from '../document';
import { hitTest } from '../scene/pointer';
import { selection } from '../selection';
import { brush } from './brush';
import { createStroke, type Stroke } from './stroke';
import { tools } from './tools';

/** The selected layer's path, when it is a freeform layer. */
function freeformTarget(mirror: ReturnType<typeof useMirror>): string | null {
  const s = selection.get();
  if (s.kind !== 'layer') return null;
  const row = mirror.node(s.id);
  return row?.type === 'freeform' ? row.path : null;
}

/** The fill region from a hex: same-terrain neighbours, never off the paper, at most 5000. */
export function fillRegion(
  frame: SceneFrame,
  layerId: string,
  from: { q: number; r: number },
): { q: number; r: number }[] {
  const layer = frame.layers.find((l) => l.id === layerId);
  const cells = ((layer?.state as { cells?: Record<string, { terrainId?: string }> })?.cells ??
    {}) as Record<string, { terrainId?: string }>;
  const OFF = '\u0000off-paper';
  const onPaper = (q: number, r: number) => {
    // a hex is on the paper when the pointer at its centre would hit it
    const probe = hexCentre(frame, q, r);
    return probe !== null && hitTest(frame, probe.x, probe.y)?.hex !== null;
  };
  const result = floodFill({
    origin: from,
    mode: 'same-value',
    maxCells: 5000,
    getCellValue: ({ q, r }) => (onPaper(q, r) ? cells[`${q},${r}`]?.terrainId : OFF),
  });
  return result.cells;
}

import { toPoint } from '@/lib/hex/layout';
import { computePaperRect, type PaperAspect } from '@/render/geometry';
import { gridOf } from '../scene/pointer';

/** A hex centre in canvas pixels, or null with no grid. */
function hexCentre(frame: SceneFrame, q: number, r: number): { x: number; y: number } | null {
  const grid = gridOf(frame);
  if (!grid) return null;
  const paper = computePaperRect({
    canvasSize: frame.size,
    paper: { aspect: frame.paper.aspect as PaperAspect },
  });
  const c = toPoint({ q, r }, { ...grid, origin: { x: paper.w / 2, y: paper.h / 2 } });
  const x = paper.x + c.x;
  const y = paper.y + c.y;
  return x < paper.x || y < paper.y || x > paper.x + paper.w || y > paper.y + paper.h
    ? null
    : { x, y };
}

export function useToolPointer(): OnPointer {
  const mirror = useMirror();
  const channel = useChannel();
  const stroke = useRef<Stroke | null>(null);

  return useCallback<OnPointer>(
    (kind, hit, frame, e) => {
      const tool = tools.get();
      if (kind === 'up' || kind === 'cancel') {
        stroke.current?.end();
        stroke.current = null;
        return;
      }
      if (tool !== 'paint' && tool !== 'erase' && tool !== 'fill') return;
      const at = freeformTarget(mirror);
      if (!at) return;
      const hex = hit?.hex;

      if (tool === 'fill') {
        if (kind !== 'down' || !hex) return;
        const s = selection.get();
        const layerId = s.kind === 'layer' ? s.id : '';
        const region = fillRegion(frame, layerId, hex);
        if (region.length === 0) return;
        const terrainId = brush.get();
        channel
          .run('freeform.fill', { at, cells: region.map((c) => ({ ...c, terrainId })) })
          .catch((err) => console.error('[fill]', err));
        return;
      }

      if (kind === 'down') {
        if (e.button !== 0) return;
        stroke.current = createStroke({
          channel,
          at,
          label: tool === 'paint' ? 'Paint' : 'Erase',
          command: tool === 'paint' ? 'freeform.paint' : 'freeform.erase',
        });
      }
      if (!stroke.current || !hex) return;
      stroke.current.add(tool === 'paint' ? { ...hex, terrainId: brush.get() } : hex);
    },
    [mirror, channel],
  );
}
