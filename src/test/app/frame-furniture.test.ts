import {
  createFrameBuilder,
  type FrameRow,
  type FrameSchema,
  MUTED_INK_ALPHA,
  type RowSource,
  UNTITLED_MAP,
  withAlpha,
} from '@/app/scene/frame';
import { DefaultPalette } from '@/palettes/defaults';

// The furniture order in the projection (epic 23 story 1): appended after `layers`, with the
// title's words and the grid's ink resolved into its state.

const schema: FrameSchema = {
  types: [
    {
      name: 'paper',
      values: [
        { key: 'aspect', kind: 'choice' },
        { key: 'color', kind: 'colour' },
      ],
    },
    { name: 'hexgrid', values: [{ key: 'color', kind: 'colour' }] },
    { name: 'palette', values: [{ key: 'gridLine', kind: 'colour' }] },
  ],
};

type Rows = Record<string, FrameRow & { path: string }>;

function source(rows: Rows): RowSource {
  const byPath = new Map(Object.values(rows).map((r) => [r.path, r]));
  return { node: (id) => rows[id], nodeAt: (p) => byPath.get(p) };
}

function doc(): Rows {
  return {
    campaign: { id: 'campaign', type: 'campaign', path: '/campaign/campaign' },
    maps: { id: 'maps', type: 'category', path: '/maps', orders: { maps: ['m'] } },
    m: {
      id: 'm',
      type: 'map',
      path: '/maps/map',
      values: { name: 'The Sallow Fen' },
      orders: { layers: ['p', 'f', 'g'], furniture: ['t'] },
    },
    p: {
      id: 'p',
      type: 'paper',
      path: '/maps/map/paper',
      values: { aspect: '16:10', color: [0.9, 0.9, 0.85, 1] },
    },
    f: { id: 'f', type: 'freeform', path: '/maps/map/freeform', values: { visible: true } },
    g: {
      id: 'g',
      type: 'hexgrid',
      path: '/maps/map/hexgrid',
      values: { color: [0, 0, 1, 1], usePaletteColor: false, visible: true },
    },
    t: {
      id: 't',
      type: 'cartouche',
      path: '/maps/map/cartouche',
      values: { title: '', visible: true, frame: 'rule' },
    },
  };
}

const SIZE = { w: 800, h: 600 };
const build = (rows: Rows, b = createFrameBuilder(schema)) => b.build(source(rows), 'm', SIZE, 1);
const title = (rows: Rows, b?: ReturnType<typeof createFrameBuilder>) =>
  build(rows, b).layers.find((l) => l.type === 'cartouche')?.state as Record<string, unknown>;

describe('furniture in the frame', () => {
  it('comes after the grid, which stays last of the layers', () => {
    const frame = build(doc());
    expect(frame.layers.map((l) => l.id)).toEqual(['p', 'f', 'g', 't']);
  });

  it('is absent when the map has no furniture order, as an old campaign has', () => {
    const rows = doc();
    rows.m = { ...rows.m, orders: { layers: ['p', 'f', 'g'] } };
    expect(build(rows).layers.map((l) => l.id)).toEqual(['p', 'f', 'g']);
  });

  it('prints the map name when the title is blank', () => {
    expect(title(doc())).toMatchObject({ resolvedTitle: 'The Sallow Fen', titleInk: '#0000ff' });
  });

  it('prints a typed title, and the map keeps its name', () => {
    const rows = doc();
    rows.t = { ...rows.t, values: { ...rows.t.values, title: 'Marches' } };
    expect(title(rows).resolvedTitle).toBe('Marches');
    expect(rows.m.values?.name).toBe('The Sallow Fen');
  });

  it('goes back to the map name when the title is cleared, and follows a rename', () => {
    const b = createFrameBuilder(schema);
    const rows = doc();
    rows.t = { ...rows.t, values: { ...rows.t.values, title: 'Marches' } };
    expect(title(rows, b).resolvedTitle).toBe('Marches');
    rows.t = { ...rows.t, values: { ...rows.t.values, title: '  ' } };
    expect(title(rows, b).resolvedTitle).toBe('The Sallow Fen');
    const before = title(rows, b);
    // a rename is a new map row; the title row is the same one
    rows.m = { ...rows.m, values: { name: 'Drowned Marches' } };
    const after = title(rows, b);
    expect(after.resolvedTitle).toBe('Drowned Marches');
    expect(after).not.toBe(before);
  });

  it('prints "Untitled map" in the muted ink when neither names it', () => {
    const rows = doc();
    rows.m = { ...rows.m, values: { name: '' } };
    const s = title(rows);
    expect(s.resolvedTitle).toBe(UNTITLED_MAP);
    expect(s.titleInk).toBe(withAlpha('#0000ff', MUTED_INK_ALPHA));
    expect(s.titleInk).not.toBe(s.ink);
    // the rule and the other lines keep the full ink
    expect(s.ink).toBe('#0000ff');
  });

  it("takes the grid's ink as drawn: its colour, or the palette's line when it follows it", () => {
    const rows = doc();
    expect(title(rows).ink).toBe('#0000ff');
    rows.g = { ...rows.g, values: { ...rows.g.values, usePaletteColor: true } };
    expect(title(rows).ink).toBe(DefaultPalette.grid.line);
    rows.palette = {
      id: 'palette',
      type: 'palette',
      path: '/themes/doom',
      values: { gridLine: [1, 0, 0, 1] },
    };
    rows.m = { ...rows.m, refs: { palette: { node: 'palette' } } };
    expect(title(rows).ink).toBe('#ff0000');
  });

  it("takes the paper's colour for its backing", () => {
    expect(title(doc()).paper).toBe('#e6e6d9');
  });

  it('keeps the same state object while nothing it draws changed', () => {
    const b = createFrameBuilder(schema);
    const rows = doc();
    const first = title(rows, b);
    expect(title(rows, b)).toBe(first);
    // an unrelated layer's change leaves it alone too
    rows.f = { ...rows.f, values: { visible: false } };
    expect(title(rows, b)).toBe(first);
  });
});

describe('withAlpha', () => {
  it('scales a hex colour’s alpha and leaves other colours as they are', () => {
    expect(withAlpha('#112233', 0.5)).toBe('#11223380');
    expect(withAlpha('#11223380', 0.5)).toBe('#11223340');
    expect(withAlpha('red', 0.5)).toBe('red');
  });
});
