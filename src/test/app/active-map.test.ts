import { addedMap } from '@/app/scene/active-map';
import type { FrameRow, RowSource } from '@/app/scene/frame';
import { activeMapId } from '@/app/selection';

function source(rows: (FrameRow & { path: string; parent?: string | null })[]): RowSource {
  return {
    node: (id) => rows.find((r) => r.id === id),
    nodeAt: (p) => rows.find((r) => r.path === p),
  };
}

const rows = source([
  { id: 'maps', type: 'category', path: '/maps', orders: { maps: ['a', 'b'] } },
  { id: 'a', type: 'map', path: '/maps/map', parent: 'maps' },
  { id: 'b', type: 'map', path: '/maps/map-2', parent: 'maps' },
  { id: 'g', type: 'hexgrid', path: '/maps/map-2/hexgrid', parent: 'b' },
]);

describe('the active map', () => {
  it('is the selected map, or the selected layer’s map', () => {
    expect(activeMapId({ kind: 'map', id: 'b' }, rows)).toBe('b');
    expect(activeMapId({ kind: 'layer', id: 'g' }, rows)).toBe('b');
  });

  it('falls back to the first map when nothing, the campaign, or a gone node is selected', () => {
    expect(activeMapId({ kind: 'none' }, rows)).toBe('a');
    expect(activeMapId({ kind: 'campaign' }, rows)).toBe('a');
    expect(activeMapId({ kind: 'map', id: 'gone' }, rows)).toBe('a');
    expect(activeMapId({ kind: 'layer', id: 'gone' }, rows)).toBe('a');
    expect(activeMapId({ kind: 'none' }, source([]))).toBeNull();
  });
});

describe('a map that has just been added', () => {
  it('is found when exactly one new map appears', () => {
    expect(addedMap([], ['a'])).toBe('a');
    expect(addedMap(['a'], ['a', 'b'])).toBe('b');
  });

  it('is nothing on a removal, a reorder or a wholesale change', () => {
    expect(addedMap(['a', 'b'], ['a'])).toBeNull();
    expect(addedMap(['a', 'b'], ['b', 'a'])).toBeNull();
    expect(addedMap(['a'], ['x', 'y'])).toBeNull();
  });
});
