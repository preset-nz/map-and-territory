import {
  createFrameBuilder,
  defaultMapId,
  type FrameRow,
  type FrameSchema,
  mapToFollow,
  type RowSource,
} from '@/app/scene/frame';
import { DefaultPalette } from '@/palettes/defaults';

const schema: FrameSchema = {
  types: [
    {
      name: 'paper',
      values: [
        { key: 'aspect', kind: 'choice' },
        { key: 'color', kind: 'colour' },
      ],
    },
    {
      name: 'hexgrid',
      values: [
        { key: 'size', kind: 'float' },
        { key: 'color', kind: 'colour' },
        { key: 'visible', kind: 'bool' },
      ],
    },
    { name: 'palette', values: [{ key: 'gridLine', kind: 'colour' }] },
  ],
};

function source(rows: Record<string, FrameRow & { path: string }>): RowSource {
  const byPath = new Map(Object.values(rows).map((r) => [r.path, r]));
  return { node: (id) => rows[id], nodeAt: (p) => byPath.get(p) };
}

function doc(overrides: Partial<Record<string, Partial<FrameRow>>> = {}) {
  const rows: Record<string, FrameRow & { path: string }> = {
    campaign: { id: 'campaign', type: 'campaign', path: '/campaign/campaign' },
    maps: { id: 'maps', type: 'category', path: '/maps', orders: { maps: ['m1', 'm2'] } },
    m1: { id: 'm1', type: 'map', path: '/maps/map', orders: { layers: ['p1', 'g1'] } },
    m2: { id: 'm2', type: 'map', path: '/maps/map-2', orders: { layers: [] } },
    p1: {
      id: 'p1',
      type: 'paper',
      path: '/maps/map/paper',
      values: { aspect: '4:3', color: [1, 1, 1, 1] },
    },
    g1: {
      id: 'g1',
      type: 'hexgrid',
      path: '/maps/map/hexgrid',
      values: { size: 24, color: [0, 0, 0, 0.5], visible: true },
    },
    t1: {
      id: 't1',
      type: 'palette',
      path: '/themes/doom',
      values: {
        gridLine: [1, 0, 0, 1],
        terrains: [
          { baseType: 'forest', name: 'Dead Wood', colour: [0, 0.2, 0, 1] },
          { baseType: 'forest', name: 'Second', colour: [1, 1, 1, 1] },
        ],
      },
    },
  };
  for (const [id, o] of Object.entries(overrides)) rows[id] = { ...rows[id], ...o } as never;
  return rows;
}

const SIZE = { w: 800, h: 600 };

describe('frame from the mirror', () => {
  it('walks the map layers in order, bottom first, with colours as CSS', () => {
    const frame = createFrameBuilder(schema).build(source(doc()), 'm1', SIZE, 2);
    expect(frame.layers.map((l) => l.type)).toEqual(['paper', 'hexgrid']);
    expect(frame.paper).toEqual({ aspect: '4:3', color: '#ffffff' });
    expect(frame.layers[1].state).toMatchObject({ size: 24, color: '#00000080' });
    expect(frame.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(frame.pixelRatio).toBe(2);
  });

  it('draws nothing for no map or a missing map', () => {
    const b = createFrameBuilder(schema);
    expect(b.build(source(doc()), null, SIZE, 1).layers).toEqual([]);
    expect(b.build(source(doc()), 'gone', SIZE, 1).layers).toEqual([]);
  });

  it('honours a hidden layer', () => {
    const rows = doc({ g1: { values: { size: 24, visible: false } } });
    const frame = createFrameBuilder(schema).build(source(rows), 'm1', SIZE, 1);
    expect(frame.layers[1].visible).toBe(false);
  });

  it('resolves the palette map first, then campaign, then the fallback', () => {
    const b = createFrameBuilder(schema);
    expect(b.build(source(doc()), 'm1', SIZE, 1).palette).toBe(DefaultPalette);

    const viaCampaign = doc({ campaign: { refs: { palette: { node: 't1' } } } });
    const p = b.build(source(viaCampaign), 'm1', SIZE, 1).palette;
    expect(p?.grid.line).toBe('#ff0000');
    expect(p?.terrain.forest).toEqual({ fill: '#003300', label: 'Dead Wood' });
    expect(p?.terrain.water).toEqual(DefaultPalette.terrain.water);

    const own = doc({
      campaign: { refs: { palette: { node: 'missing' } } },
      m1: { refs: { palette: { node: 't1' } } },
    });
    expect(b.build(source(own), 'm1', SIZE, 1).palette?.grid.line).toBe('#ff0000');
  });

  it('keeps an unchanged row’s state object and replaces a changed one', () => {
    const b = createFrameBuilder(schema);
    const rows = doc();
    const first = b.build(source(rows), 'm1', SIZE, 1);
    const again = b.build(source(rows), 'm1', SIZE, 1);
    expect(again.layers[0].state).toBe(first.layers[0].state);
    expect(again.layers[1].state).toBe(first.layers[1].state);

    const patched = { ...rows, g1: { ...rows.g1, values: { size: 32 } } };
    const next = b.build(source(patched), 'm1', SIZE, 1);
    expect(next.layers[0].state).toBe(first.layers[0].state);
    expect(next.layers[1].state).not.toBe(first.layers[1].state);
  });
});

describe('active map', () => {
  it('defaults to the first map in maps order', () => {
    expect(defaultMapId(source(doc()))).toBe('m1');
    expect(defaultMapId(source(doc({ maps: { orders: {} } })))).toBeNull();
  });

  it('follows an undo whose changes all lie under one other map', () => {
    const rows = source(doc());
    const under = (p: string) => ({ path: p });
    expect(mapToFollow([under('/maps/map-2'), under('/maps/map-2/paper')], rows, 'm1')).toBe('m2');
    expect(mapToFollow([under('/maps/map/hexgrid')], rows, 'm1')).toBeNull();
    expect(mapToFollow([under('/maps/map'), under('/maps/map-2')], rows, 'm1')).toBeNull();
    expect(mapToFollow([under('/themes/doom')], rows, 'm1')).toBeNull();
    expect(mapToFollow([], rows, 'm1')).toBeNull();
  });
});
