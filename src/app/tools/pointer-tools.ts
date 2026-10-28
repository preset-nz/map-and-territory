// What the active tool does with a pointer on the paper. Paint, erase and fill work on the
// selected freeform layer; the other tools arrive with their layers.
import { useMirror } from '@preset.nz/pom';
import { useCallback, useEffect, useRef } from 'react';
import type { PlacedLocation } from '@/layers/adapters/locations';
import { floodFill } from '@/lib/flood-fill';
import type { SceneFrame } from '@/render/types';
import type { OnPointer } from '../canvas-host';
import { useChannel } from '../document';
import { gridOf, hitTest, type PointerHit } from '../scene/pointer';
import { activeMapId, selection } from '../selection';
import { brush } from './brush';
import { click, cornerAt, openPath, outlineDraft, type StoredPath } from './outline';
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
  zoomed: SceneFrame,
  layerId: string,
  from: { q: number; r: number },
): { q: number; r: number }[] {
  // the paper is judged whole, whatever the view shows
  const frame = { ...zoomed, camera: { x: 0, y: 0, zoom: 1 } };
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
import { type PaperAspect, paperView } from '@/render/geometry';

/** A hex centre in canvas pixels at zoom 1, or null with no grid. */
function hexCentre(frame: SceneFrame, q: number, r: number): { x: number; y: number } | null {
  const grid = gridOf(frame);
  if (!grid) return null;
  const { rect, size, fit } = paperView(frame.size, frame.paper.aspect as PaperAspect);
  const c = toPoint({ q, r }, { ...grid, origin: { x: size.w / 2, y: size.h / 2 } });
  // paper px to canvas px: the fit, from the paper's corner
  const x = rect.x + c.x * fit;
  const y = rect.y + c.y * fit;
  return x < rect.x || y < rect.y || x > rect.x + rect.w || y > rect.y + rect.h ? null : { x, y };
}

/**
 * Where the location tool adds (epic 28): the selected locations layer, the layer of the
 * selected location, else the topmost locations layer on the active map.
 */
export function locationsTarget(
  rows: Pick<ReturnType<typeof useMirror>, 'node'>,
  selected: ReturnType<typeof selection.get>,
  mapId: string | null,
): string | null {
  if (selected.kind === 'layer') {
    const row = rows.node(selected.id) as { type: string; path: string; parent?: string | null };
    if (row?.type === 'locations') return row.path;
    const parent = row?.parent ? rows.node(row.parent) : undefined;
    if (row?.type === 'location' && parent?.type === 'locations') return parent.path ?? null;
  }
  const map = mapId ? rows.node(mapId) : undefined;
  for (const id of [...(map?.orders?.layers ?? [])].reverse()) {
    const row = rows.node(id);
    if (row?.type === 'locations') return row.path ?? null;
  }
  return null;
}

/** The place drawn on hex `(q, r)`, topmost first, from the frame the pointer hit. */
export function locationAt(frame: SceneFrame, hex: { q: number; r: number }): string | null {
  for (const layer of [...frame.layers].reverse()) {
    if (layer.type !== 'locations' || !layer.visible) continue;
    const places = (layer.state as { locations?: PlacedLocation[] }).locations ?? [];
    for (const p of [...places].reverse()) {
      if (p.hexes.some((h) => h.q === hex.q && h.r === hex.r)) return p.id;
    }
  }
  return null;
}

/** The selected place's path, which a shift-click grows or shrinks; null with none selected. */
export function reshapeTarget(
  rows: Pick<ReturnType<typeof useMirror>, 'node'>,
  selected: ReturnType<typeof selection.get>,
): string | null {
  if (selected.kind !== 'layer') return null;
  const row = rows.node(selected.id) as { type: string; path?: string } | undefined;
  return row?.type === 'location' ? (row.path ?? null) : null;
}

type Hex = { q: number; r: number };

/** A place's hexes moved by the step from `from` to `to`, so an area keeps its shape. */
export function movedHexes(hexes: readonly Hex[], from: Hex, to: Hex): Hex[] {
  return hexes.map((h) => ({ q: h.q + to.q - from.q, r: h.r + to.r - from.r }));
}

/** The path of the node of `type` a command added, from its commit. */
export function addedPath(ran: unknown, type: string): string | null {
  const changes = (ran as { committed?: { changes?: unknown[] } })?.committed?.changes ?? [];
  for (const c of changes as { change?: string; type?: string; path?: string }[]) {
    if (c.change === 'added' && c.type === type && c.path) return c.path;
  }
  return null;
}

/** The selected layer's id and path, when it is an outline layer. */
function outlineTarget(mirror: ReturnType<typeof useMirror>) {
  const s = selection.get();
  if (s.kind !== 'layer') return null;
  const row = mirror.node(s.id);
  return row?.type === 'outline' ? { id: s.id, at: row.path, paths: row.values?.paths } : null;
}

/** An outline tool event: hover shows the corner a click would take; a click extends the path. */
function outlineEvent(
  kind: 'down' | 'move',
  hit: PointerHit | null,
  frame: SceneFrame,
  target: NonNullable<ReturnType<typeof outlineTarget>>,
  run: (paths: StoredPath[]) => void,
) {
  const grid = gridOf(frame);
  const corner = hit && grid ? cornerAt(hit.point, layoutOf(frame, grid)) : null;
  if (kind === 'move') {
    outlineDraft.hover(target.id, corner);
    return;
  }
  if (!corner || !grid) return;
  const paths = (Array.isArray(target.paths) ? target.paths : []) as unknown as StoredPath[];
  const draft = outlineDraft.get();
  const step = click(paths, openPath(paths, draft, target.id), corner, layoutOf(frame, grid));
  if (!step) return;
  outlineDraft.set({ layerId: target.id, active: step.active, hover: null });
  if (step.paths !== paths) run(step.paths);
}

function layoutOf(frame: SceneFrame, grid: NonNullable<ReturnType<typeof gridOf>>) {
  const { size } = paperView(frame.size, frame.paper.aspect as PaperAspect);
  return { ...grid, origin: { x: size.w / 2, y: size.h / 2 } };
}

export function useToolPointer(): OnPointer {
  const mirror = useMirror();
  const channel = useChannel();
  const stroke = useRef<Stroke | null>(null);
  // a place being dragged: one undo step from pointer-down to pointer-up
  // its hexes and the hex it was picked up on, as they were on pointer-down
  const drag = useRef<{
    token: Promise<number>;
    at: string;
    hexes: Hex[];
    from: Hex;
    q: number;
    r: number;
  } | null>(null);

  // leaving the outline tool drops its preview
  useEffect(
    () =>
      tools.subscribe(() => {
        if (tools.get() !== 'outline') outlineDraft.reset();
      }),
    [],
  );

  /**
   * The Select tool and the location tools (epic 28). Select picks a place; Add puts one on
   * a hex, and with a place selected a shift-click grows it into a hex or shrinks it out of
   * one; Move drags a place, one undo step; Delete takes the place clicked.
   */
  const locationEvent = useCallback(
    (
      tool: ReturnType<typeof tools.get>,
      kind: 'down' | 'move',
      hit: PointerHit | null,
      frame: SceneFrame,
      e: { button: number; shiftKey: boolean },
    ) => {
      if (!hit?.hex) return;
      const { q, r } = hit.hex;
      const fail = (err: unknown) => console.error('[location]', err);
      const moving = drag.current;
      if (kind === 'move') {
        if (!moving || (moving.q === q && moving.r === r)) return;
        // drag a place to another hex: every step is in the one gesture
        drag.current = { ...moving, q, r };
        const value = movedHexes(moving.hexes, moving.from, { q, r });
        channel.run('value.set', { at: moving.at, key: 'hexes', value }).catch(fail);
        return;
      }
      if (e.button !== 0) return;
      if (tool === 'location' && e.shiftKey) {
        const at = reshapeTarget(mirror, selection.get());
        if (at) channel.run('locations.hex', { at, q, r }).catch(fail);
        return;
      }
      const placed = locationAt(frame, hit.hex);
      const row = placed ? mirror.node(placed) : undefined;
      if (placed && row?.path) {
        if (tool === 'location-delete') {
          channel.run('edit.delete', { at: row.path }).catch(fail);
          if (selection.get().kind === 'layer' && (selection.get() as { id: string }).id === placed)
            selection.clear();
          return;
        }
        // Select, Add and Move pick a place up; only Move drags it
        selection.selectLayer(placed);
        if (tool !== 'location-move') return;
        const hexes = (Array.isArray(row.values?.hexes) ? row.values.hexes : []) as Hex[];
        drag.current = {
          token: channel.begin('Move Location'),
          at: row.path,
          hexes,
          from: { q, r },
          q,
          r,
        };
        return;
      }
      if (tool !== 'location') return;
      const mapId = activeMapId(selection.get(), mirror);
      const at = locationsTarget(mirror, selection.get(), mapId);
      const map = mapId ? mirror.node(mapId)?.path : undefined;
      // with no locations layer on the map, the first click makes one (its own undo step)
      const ready: Promise<string | null> = at
        ? Promise.resolve(at)
        : map
          ? channel
              .run('node.add', { parent: map, type: 'locations' })
              .then((ran) => addedPath(ran, 'locations'))
          : Promise.resolve(null);
      ready
        .then((layer) => (layer ? channel.run('locations.add', { at: layer, q, r }) : null))
        .catch(fail);
    },
    [mirror, channel],
  );

  return useCallback<OnPointer>(
    (kind, hit, frame, e) => {
      const tool = tools.get();
      if (kind === 'up' || kind === 'cancel') {
        stroke.current?.end();
        stroke.current = null;
        if (drag.current) {
          const { token } = drag.current;
          drag.current = null;
          token.then((t) => channel.end(t)).catch((err) => console.error('[location]', err));
        }
        return;
      }
      if (tool === 'outline') {
        const target = outlineTarget(mirror);
        if (!target || (kind !== 'down' && kind !== 'move')) return;
        if (kind === 'down' && e.button !== 0) return;
        outlineEvent(kind, hit, frame, target, (paths) =>
          channel
            .run('outline.draw', { at: target.at, paths })
            .catch((err) => console.error('[outline]', err)),
        );
        return;
      }
      if (tool === 'select' || tool.startsWith('location')) {
        locationEvent(tool, kind, hit, frame, e);
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
    [mirror, channel, locationEvent],
  );
}
