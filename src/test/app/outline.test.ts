import { describe, expect, it } from 'vitest';
import { createFrameBuilder } from '@/app/scene/frame';
import { click, openPath, outlineDraft, type StoredPath } from '@/app/tools/outline';
import type { Layout } from '@/lib/hex';
import { cornerPoint } from '@/lib/outline/geometry';
import type { OutlineCorner } from '@/lib/outline/types';

const layout: Layout = { size: 24, orientation: 'pointy', origin: { x: 0, y: 0 } };
const at = (q: number, r: number, corner: number): OutlineCorner => ({
  hex: { q, r },
  corner: corner as OutlineCorner['corner'],
});

describe('the outline click', () => {
  it('starts a path, extends it and closes it on the first corner', () => {
    let paths: StoredPath[] = [];
    let active = false;
    let step = click(paths, active, at(0, 0, 0), layout)!;
    expect(step.paths).toEqual([{ corners: [{ q: 0, r: 0, corner: 0 }], closed: false }]);
    expect(step.active).toBe(true);
    ({ paths, active } = step);

    step = click(paths, active, at(0, 0, 2), layout)!;
    // the walk between two corners is filled in, so the path stays connected
    expect(step.paths[0]!.corners.length).toBeGreaterThan(2);
    ({ paths, active } = step);
    step = click(paths, active, at(0, 0, 4), layout)!;
    ({ paths, active } = step);

    step = click(paths, active, at(0, 0, 0), layout)!;
    expect(step.paths[0]!.closed).toBe(true);
    expect(step.active).toBe(false);
  });

  it('starts a second path once the first is closed', () => {
    const closed: StoredPath[] = [{ corners: [{ q: 0, r: 0, corner: 0 }], closed: true }];
    const step = click(closed, true, at(3, 3, 1), layout)!;
    expect(step.paths).toHaveLength(2);
    expect(step.paths[0]).toBe(closed[0]);
  });

  it('ends an open path when its last corner is clicked again, and drops a lone corner', () => {
    const two: StoredPath[] = [
      {
        corners: [
          { q: 0, r: 0, corner: 0 },
          { q: 0, r: 0, corner: 1 },
        ],
        closed: false,
      },
    ];
    const ended = click(two, true, at(0, 0, 1), layout)!;
    expect(ended.paths).toBe(two);
    expect(ended.active).toBe(false);

    const lone: StoredPath[] = [{ corners: [{ q: 0, r: 0, corner: 0 }], closed: false }];
    expect(click(lone, true, at(0, 0, 0), layout)!.paths).toEqual([]);
  });

  it('knows an open path only for the layer the draft belongs to', () => {
    const open: StoredPath[] = [{ corners: [{ q: 0, r: 0, corner: 0 }], closed: false }];
    const d = { layerId: 'a', active: true, hover: null };
    expect(openPath(open, d, 'a')).toBe(true);
    expect(openPath(open, d, 'b')).toBe(false);
    expect(openPath([{ ...open[0]!, closed: true }], d, 'a')).toBe(false);
  });
});

describe('the outline layer in the frame', () => {
  const rows = {
    layer: {
      id: 'o',
      type: 'outline',
      values: {
        paths: [{ corners: [{ q: 1, r: 2, corner: 3 }], closed: false }],
        strokeWidth: 4,
        visible: true,
      },
    },
    map: { id: 'm', type: 'map', orders: { layers: ['o'] }, values: {} },
  };
  const source = {
    node: (id: string) => (id === 'o' ? rows.layer : id === 'm' ? rows.map : undefined),
    nodeAt: () => undefined,
  };
  const size = { w: 100, h: 100 };

  it('nests the hexes for the adapter and keeps the preview out of the stored state', () => {
    const b = createFrameBuilder(null);
    const plain = b.build(source, 'm', size, 1);
    const state = plain.layers[0]!.state as { paths: { corners: { hex: unknown }[] }[] };
    expect(state.paths[0]!.corners[0]!.hex).toEqual({ q: 1, r: 2 });

    const drawing = b.build(source, 'm', size, 1, {
      layerId: 'o',
      active: true,
      hover: at(1, 2, 4),
    });
    const withPreview = drawing.layers[0]!.state as { activePathId: string; hoverCorner: unknown };
    expect(withPreview.activePathId).toBe('path-0');
    expect(withPreview.hoverCorner).toEqual(at(1, 2, 4));

    const after = b.build(source, 'm', size, 1);
    expect(after.layers[0]!.state).toBe(plain.layers[0]!.state);
    expect(cornerPoint(at(0, 0, 0), layout)).toBeDefined();
  });

  it('is idle by default', () => {
    expect(outlineDraft.get().layerId).toBeNull();
  });
});
