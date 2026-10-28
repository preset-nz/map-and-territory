import {
  createFrameBuilder,
  type FrameRow,
  type FrameSchema,
  MARKS,
  type RowSource,
} from '@/app/scene/frame';
import { activeMapId } from '@/app/selection';
import { addedPath, locationAt, locationsTarget, reshapeTarget } from '@/app/tools/pointer-tools';
import type { PlacedLocation } from '@/layers/adapters/locations';

const schema: FrameSchema = {
  types: [
    { name: 'paper', values: [{ key: 'color', kind: 'colour' }] },
    { name: 'hexgrid', values: [{ key: 'color', kind: 'colour' }] },
  ],
};

type Row = FrameRow & { path: string; parent?: string };

/** What Rust's `Derived` says for `doc()`: the upper layer `b` numbers first. */
const NUMBERS: Record<string, number> = { b1: 1, a1: 2, a2: 3 };

function source(
  rows: Record<string, Row>,
  projection: unknown = { numbers: NUMBERS },
): RowSource & { node(id: string): Row | undefined } {
  const byPath = new Map(Object.values(rows).map((r) => [r.path, r]));
  return { node: (id) => rows[id], nodeAt: (p) => byPath.get(p), projection };
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
  it('come from the projection, not from the rows', () => {
    const rows = doc();
    const numbers = (projection: unknown) =>
      createFrameBuilder(schema)
        .build(source(rows, projection), 'm', { w: 800, h: 600 }, 1)
        .layers.filter((l) => l.type === 'locations' && !l.id.endsWith(MARKS))
        .flatMap((l) => (l.state as { locations: PlacedLocation[] }).locations)
        .map((p) => [p.id, p.number]);
    expect(numbers({ numbers: { a1: 7, a2: 8, b1: 9 } })).toEqual([
      ['a1', 7],
      ['a2', 8],
      ['b1', 9],
    ]);
    // before the mirror has a projection there are no numbers to show
    expect(numbers(null).map(([, n]) => n)).toEqual([null, null, null]);
  });

  it('remake a layer’s state when the projection renumbers it', () => {
    const rows = doc();
    const builder = createFrameBuilder(schema);
    const state = (projection: unknown) =>
      builder
        .build(source(rows, projection), 'm', { w: 800, h: 600 }, 1)
        .layers.find((l) => l.id === 'a')?.state;
    const first = state({ numbers: NUMBERS });
    expect(state({ numbers: { ...NUMBERS } })).toBe(first);
    expect(state({ numbers: { ...NUMBERS, a1: 5 } })).not.toBe(first);
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

  it('draws the areas in the layer’s place and the names after the grid', () => {
    const rows = doc();
    rows.a = { ...rows.a, values: { ...rows.a.values, visible: false } };
    const builder = createFrameBuilder(schema);
    const frame = builder.build(source(rows), 'm', { w: 800, h: 600 }, 1);
    expect(frame.layers.map((l) => l.id)).toEqual(['p', 'a', 'b', 'g', `a${MARKS}`, `b${MARKS}`]);
    const passes = frame.layers.map((l) => (l.state as { pass?: string }).pass);
    expect(passes).toEqual([undefined, 'areas', 'areas', undefined, 'marks', 'marks']);
    // a hidden layer hides both halves; the halves are kept from frame to frame
    expect(frame.layers.filter((l) => l.id.startsWith('a')).map((l) => l.visible)).toEqual([
      false,
      false,
    ]);
    const again = builder.build(source(rows), 'm', { w: 800, h: 600 }, 1);
    expect(again.layers[4].state).toBe(frame.layers[4].state);
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

  it('finds the place on a hex, the topmost layer’s first, and none in a hidden layer', () => {
    const rows = doc();
    rows.b1 = { ...rows.b1, values: { ...rows.b1.values, hexes: [{ q: 0, r: 0 }] } };
    const builder = createFrameBuilder(schema);
    const frame = builder.build(source(rows), 'm', { w: 800, h: 600 }, 1);
    // a1, a2 and b1 all sit on 0,0: b is above a, and within a layer the later one is on top
    expect(locationAt(frame, { q: 0, r: 0 })).toBe('b1');
    expect(locationAt(frame, { q: 5, r: 5 })).toBeNull();
    rows.b = { ...rows.b, values: { ...rows.b.values, visible: false } };
    const hidden = builder.build(source(rows), 'm', { w: 800, h: 600 }, 1);
    expect(locationAt(hidden, { q: 0, r: 0 })).toBe('a2');
  });

  it('grows or shrinks only a selected place', () => {
    const rows = source(doc());
    expect(reshapeTarget(rows, { kind: 'layer', id: 'a2' })).toBe('/maps/map/a/a2');
    expect(reshapeTarget(rows, { kind: 'layer', id: 'a' })).toBeNull();
    expect(reshapeTarget(rows, { kind: 'none' })).toBeNull();
  });
});
