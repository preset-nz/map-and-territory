import {
  createFrameBuilder,
  type FrameRow,
  type FrameSchema,
  locationNumbers,
  type RowSource,
} from '@/app/scene/frame';
import { activeMapId } from '@/app/selection';
import { addedPath, locationsTarget } from '@/app/tools/pointer-tools';
import type { PlacedLocation } from '@/layers/adapters/locations';

const schema: FrameSchema = {
  types: [
    { name: 'paper', values: [{ key: 'color', kind: 'colour' }] },
    { name: 'hexgrid', values: [{ key: 'color', kind: 'colour' }] },
  ],
};

type Row = FrameRow & { path: string; parent?: string };

function source(rows: Record<string, Row>): RowSource & { node(id: string): Row | undefined } {
  const byPath = new Map(Object.values(rows).map((r) => [r.path, r]));
  return { node: (id) => rows[id], nodeAt: (p) => byPath.get(p) };
}

const loc = (id: string, parent: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'location',
  path: `/maps/map/${parent}/${id}`,
  parent,
  values: { name, hexes: [{ q: 0, r: 0 }], hidden: false, ...extra },
});

/** A map with two locations layers, the upper one (`b`) above the lower (`a`) in the stack. */
function doc(a: Record<string, unknown> = {}): Record<string, Row> {
  return {
    campaign: { id: 'campaign', type: 'campaign', path: '/campaign/campaign' },
    maps: { id: 'maps', type: 'category', path: '/maps', orders: { maps: ['m'] } },
    m: { id: 'm', type: 'map', path: '/maps/map', orders: { layers: ['p', 'a', 'b', 'g'] } },
    p: {
      id: 'p',
      type: 'paper',
      path: '/maps/map/paper',
      parent: 'm',
      values: { color: [1, 1, 1, 1] },
    },
    g: {
      id: 'g',
      type: 'hexgrid',
      path: '/maps/map/hexgrid',
      parent: 'm',
      values: { color: [0, 0, 0, 1], usePaletteColor: false },
    },
    a: {
      id: 'a',
      type: 'locations',
      path: '/maps/map/a',
      parent: 'm',
      values: { numbered: true, marker: 'number', face: 'map', ...a },
      orders: { locations: ['a1', 'a2'] },
    },
    b: {
      id: 'b',
      type: 'locations',
      path: '/maps/map/b',
      parent: 'm',
      values: { numbered: true, marker: 'dot', face: 'map' },
      orders: { locations: ['b1'] },
    },
    a1: loc('a1', 'a', 'Reedwall Keep'),
    a2: loc('a2', 'a', 'Sunken Chapel', { hidden: true, marker: 'number' }),
    b1: loc('b1', 'b', 'Gallows Ford', { note: 'deep in spring' }),
  };
}

const placed = (rows: Record<string, Row>, layer: string): PlacedLocation[] => {
  const frame = createFrameBuilder(schema).build(source(rows), 'm', { w: 800, h: 600 }, 1);
  const state = frame.layers.find((l) => l.id === layer)?.state as
    | { locations: PlacedLocation[] }
    | undefined;
  return state?.locations ?? [];
};

describe('location numbers', () => {
  it('count down the stack, top layer first, skipping an unnumbered layer', () => {
    expect([...locationNumbers(source(doc()), ['p', 'a', 'b', 'g'])]).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    const rows = doc();
    rows.b = { ...rows.b, values: { ...rows.b.values, numbered: false } };
    expect(locationNumbers(source(rows), ['p', 'a', 'b', 'g']).get('a')).toBe(1);
  });

  it('reach the adapter with each place’s name, hex, marker and hidden', () => {
    const a = placed(doc(), 'a');
    expect(a.map((l) => [l.name, l.number, l.marker, l.hidden])).toEqual([
      ['Reedwall Keep', 2, 'number', false],
      ['Sunken Chapel', 3, 'number', true],
    ]);
    const b = placed(doc(), 'b');
    expect(b[0]).toMatchObject({
      name: 'Gallows Ford',
      number: 1,
      marker: 'dot',
      note: 'deep in spring',
    });
    expect(placed(doc({ numbered: false }), 'a')[0].number).toBeNull();
  });

  it('prints in the grid’s ink on the paper’s colour, in the map’s face', () => {
    const rows = doc();
    rows.m = { ...rows.m, values: { face: 'serif' } };
    const frame = createFrameBuilder(schema).build(source(rows), 'm', { w: 800, h: 600 }, 1);
    const state = frame.layers.find((l) => l.id === 'a')?.state as Record<string, unknown>;
    expect(state).toMatchObject({ face: 'serif', ink: '#000000', paper: '#ffffff' });
  });

  it('keeps the layer’s state while nothing under it changed, and remakes it when a place did', () => {
    const rows = doc();
    const builder = createFrameBuilder(schema);
    const state = () =>
      builder.build(source(rows), 'm', { w: 800, h: 600 }, 1).layers.find((l) => l.id === 'a')
        ?.state;
    const first = state();
    expect(state()).toBe(first);
    rows.a1 = { ...rows.a1, values: { ...rows.a1.values, name: 'Reedwall' } };
    expect(state()).not.toBe(first);
  });
});

describe('the location tool', () => {
  it('adds to the selected layer, the selected place’s layer, else the topmost', () => {
    const rows = source(doc());
    expect(locationsTarget(rows, { kind: 'layer', id: 'a' }, 'm')).toBe('/maps/map/a');
    expect(locationsTarget(rows, { kind: 'layer', id: 'a2' }, 'm')).toBe('/maps/map/a');
    expect(locationsTarget(rows, { kind: 'none' }, 'm')).toBe('/maps/map/b');
    expect(locationsTarget(rows, { kind: 'layer', id: 'g' }, 'm')).toBe('/maps/map/b');
  });

  it('finds the layer a command just added', () => {
    const ran = {
      committed: { changes: [{ change: 'added', type: 'locations', path: '/maps/map/locations' }] },
    };
    expect(addedPath(ran, 'locations')).toBe('/maps/map/locations');
    expect(addedPath('nothing', 'locations')).toBeNull();
  });

  it('keeps the map active with a location selected', () => {
    expect(activeMapId({ kind: 'layer', id: 'a1' }, source(doc()))).toBe('m');
  });
});
