import {
  createChannel,
  createMirror,
  type PomBackend,
  PomProvider,
  type Row,
  type View,
} from '@preset.nz/pom';
import { act, fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { ChannelProvider } from '@/app/document';
import { sceneCommandState } from '@/app/scene/commands';
import { ScenePanel } from '@/app/scene/scene-panel';
import {
  actionsFor,
  displayName,
  furnitureTopFirst,
  isBooklet,
  layersTopFirst,
  mapsOffPages,
  pageMap,
} from '@/app/scene/tree';
import { activeMapId, selection } from '@/app/selection';

const row = (id: string, path: string, type: string, extra: Partial<Row> = {}): Row => ({
  id,
  path,
  name: path.split('/').pop() ?? '',
  type,
  role: 'node',
  parent: null,
  ...extra,
});

const doc = (): Row[] => [
  row('c', '/campaign/campaign', 'campaign', { values: { name: 'Westmarch' } }),
  row('maps', '/maps', 'category', { role: 'category', orders: { maps: ['m'] } }),
  row('m', '/maps/map', 'map', {
    parent: 'maps',
    values: { name: 'Map 01', visible: true },
    orders: { layers: ['p', 'f', 'n', 'g'] },
  }),
  row('p', '/maps/map/paper', 'paper', { parent: 'm', values: { color: [1, 1, 1, 1] } }),
  row('f', '/maps/map/freeform', 'freeform', {
    parent: 'm',
    values: { name: 'Freeform 01', visible: true },
  }),
  row('n', '/maps/map/hex-noise', 'hex-noise', {
    parent: 'm',
    values: { name: 'Hex Noise 01', visible: false },
  }),
  row('g', '/maps/map/hexgrid', 'hexgrid', {
    parent: 'm',
    values: { name: 'Hex Grid', visible: true },
  }),
];

/** The map as a spine booklet: a cover, the map's page, a blank page and the back, and a second map on no page (epic 32). */
const booklet = (): Row[] =>
  doc()
    .map((r) =>
      r.id === 'c'
        ? { ...r, values: { ...r.values, booklet: 'spine' } }
        : r.id === 'maps'
          ? { ...r, orders: { maps: ['m', 'm2'] } }
          : r,
    )
    .concat([
      row('m2', '/maps/map-2', 'map', { parent: 'maps', values: { name: 'Map 02' } }),
      row('pages', '/pages', 'category', {
        role: 'category',
        orders: { pages: ['cover', 'p1', 'p2', 'back'] },
      }),
      row('cover', '/pages/page', 'page', { parent: 'pages', values: { name: 'Cover' } }),
      row('p1', '/pages/page-2', 'page', {
        parent: 'pages',
        values: { name: 'Page 01' },
        refs: { map: { node: 'm' } },
      }),
      row('p2', '/pages/page-3', 'page', { parent: 'pages', values: { name: 'Page 02' } }),
      row('back', '/pages/page-4', 'page', { parent: 'pages', values: { name: 'Back' } }),
    ]);

/** The same map with two titles in its `furniture`, the newer last. */
const withTitles = (): Row[] =>
  doc()
    .map((r) =>
      r.id === 'm'
        ? { ...r, orders: { layers: ['p', 'f', 'n', 'g'], furniture: ['t1', 't2'] } }
        : r,
    )
    .concat([
      row('t1', '/maps/map/cartouche', 'cartouche', {
        parent: 'm',
        values: { name: 'Title 01', visible: true },
      }),
      row('t2', '/maps/map/cartouche-2', 'cartouche', {
        parent: 'm',
        values: { name: 'Title 02', visible: true },
      }),
    ]);

function source(rows: Row[]) {
  return {
    node: (id: string) => rows.find((r) => r.id === id),
    nodeAt: (p: string) => rows.find((r) => r.path === p),
  };
}

describe('scene tree logic', () => {
  it('names rows by their name value, or their kind', () => {
    const rows = doc();
    expect(displayName(rows[0])).toBe('Westmarch');
    expect(displayName(rows[3])).toBe('Paper');
  });

  it('lists layers top first', () => {
    expect(layersTopFirst(doc()[2])).toEqual(['g', 'n', 'f', 'p']);
  });

  it('lists furniture top first, and none for a map without the order', () => {
    expect(furnitureTopFirst(withTitles().find((r) => r.id === 'm'))).toEqual(['t2', 't1']);
    expect(furnitureTopFirst(doc()[2])).toEqual([]);
  });

  it('names a title by its name and offers it what a layer has', () => {
    const t = withTitles().find((r) => r.id === 't1') as Row;
    expect(displayName(t)).toBe('Title 01');
    expect(displayName({ ...t, values: {} })).toBe('Title');
    expect(actionsFor(t)).toEqual({ rename: true, visible: true, duplicate: true, delete: true });
  });

  it('offers only show and hide on the grid, and nothing on the paper', () => {
    const [, , map, paper, freeform, , grid] = doc();
    expect(actionsFor(paper)).toEqual({
      rename: false,
      visible: undefined,
      duplicate: false,
      delete: false,
    });
    expect(actionsFor(grid)).toMatchObject({ visible: true, duplicate: false, delete: false });
    expect(actionsFor(freeform)).toMatchObject({ rename: true, duplicate: true, delete: true });
    expect(actionsFor(map)).toMatchObject({ rename: true, duplicate: true, delete: true });
  });
});

describe('a booklet in the scene (epic 32)', () => {
  const rows = booklet();
  const find = (id: string) => rows.find((r) => r.id === id);

  it('knows a booklet, a page’s map and the maps on no page', () => {
    expect(isBooklet(find('c'))).toBe(true);
    expect(isBooklet(doc()[0])).toBe(false);
    expect(pageMap(find('p1'))).toBe('m');
    expect(pageMap(find('cover'))).toBeNull();
    expect(
      mapsOffPages(
        ['m', 'm2'],
        rows.filter((r) => r.type === 'page'),
      ),
    ).toEqual(['m2']);
  });

  it('draws a page’s map, and Delete names it a Page', () => {
    expect(activeMapId({ kind: 'page', id: 'p1' }, source(rows))).toBe('m');
    // a blank page draws the first map until Booklet mode shows the page itself
    expect(activeMapId({ kind: 'page', id: 'cover' }, source(rows))).toBe('m');
    expect(sceneCommandState({ kind: 'page', id: 'p2' }, source(rows)).target?.title).toBe('Page');
    expect(actionsFor(find('p2') as Row)).toEqual({ rename: true, duplicate: false, delete: true });
  });
});

describe('scene command state', () => {
  const rows = source(doc());

  it('targets the selected layer and allows moves only between the anchors', () => {
    const top = sceneCommandState({ kind: 'layer', id: 'n' }, rows);
    expect(top.target).toEqual({ path: '/maps/map/hex-noise', title: 'Layer', anchor: false });
    expect(top.layerPath).toBe('/maps/map/hex-noise');
    expect(top.canMove).toEqual({ forward: false, backward: true });
    const bottom = sceneCommandState({ kind: 'layer', id: 'f' }, rows);
    expect(bottom.canMove).toEqual({ forward: true, backward: false });
  });

  it('never moves, duplicates or deletes an anchor', () => {
    const grid = sceneCommandState({ kind: 'layer', id: 'g' }, rows);
    expect(grid.target?.anchor).toBe(true);
    expect(grid.canMove).toEqual({ forward: false, backward: false });
  });

  it("adds a layer to the grid's map, just below the grid, when the grid is selected", () => {
    const grid = sceneCommandState({ kind: 'layer', id: 'g' }, rows);
    expect(grid.mapPath).toBe('/maps/map');
    expect(grid.layerPath).toBeNull();
  });

  it('never moves a title or adds a layer above it, and calls it a Title', () => {
    const s = sceneCommandState({ kind: 'layer', id: 't1' }, source(withTitles()));
    expect(s.target).toEqual({ path: '/maps/map/cartouche', title: 'Title', anchor: false });
    expect(s.mapPath).toBe('/maps/map');
    expect(s.layerPath).toBeNull();
    expect(s.canMove).toEqual({ forward: false, backward: false });
  });

  it('adds layers to the active map, above nothing when a map is selected', () => {
    const s = sceneCommandState({ kind: 'map', id: 'm' }, rows);
    expect(s.mapPath).toBe('/maps/map');
    expect(s.layerPath).toBeNull();
    expect(s.target?.title).toBe('Map');
  });
});

describe('the scene panel', () => {
  function mount(rows: Row[] = doc()) {
    const ran: { id: string; payload: unknown }[] = [];
    const backend: PomBackend = {
      connect: async () => null,
      view: async (): Promise<View> => ({
        seq: 0,
        generation: 0,
        schema: { categories: [], types: [] },
        rows,
      }),
      status: async () => ({
        title: 'Untitled',
        path: null,
        unsaved: false,
        undo: null,
        redo: null,
        gesture: false,
        generation: 0,
      }),
      commands: async () => [],
      run: async (id, payload) => {
        ran.push({ id, payload });
        return 'nothing';
      },
      begin: async () => 1,
      end: async () => undefined,
      cancel: async () => undefined,
      onUpdate: async () => () => undefined,
      onStatus: async () => () => undefined,
    };
    const mirror = createMirror(backend);
    const channel = createChannel(backend);
    const view = render(
      createElement(
        PomProvider,
        { mirror },
        createElement(ChannelProvider, { channel }, createElement(ScenePanel)),
      ),
    );
    return { view, mirror, ran };
  }

  beforeEach(() => selection.clear());

  it('lists the campaign, its map and the layers top first, and selects on click', async () => {
    const { view, mirror } = mount();
    await act(async () => {
      await mirror.start();
    });
    const items = view.getAllByRole('treeitem').map((el) => el.textContent);
    expect(items).toEqual([
      'Westmarch',
      'Map 01',
      'Hex Grid',
      'Hex Noise 01',
      'Freeform 01',
      'Paper',
    ]);

    fireEvent.click(view.getByText('Freeform 01'));
    expect(selection.get()).toEqual({ kind: 'layer', id: 'f' });
  });

  it('lists the furniture in its own section above the layers, and selects it', async () => {
    const { view, mirror } = mount(withTitles());
    await act(async () => {
      await mirror.start();
    });
    const items = view.getAllByRole('treeitem').map((el) => el.textContent);
    expect(items).toEqual([
      'Westmarch',
      'Map 01',
      'Title 02',
      'Title 01',
      'Hex Grid',
      'Hex Noise 01',
      'Freeform 01',
      'Paper',
    ]);
    const group = view.getByRole('group', { name: 'Furniture' });
    expect(group.textContent).toBe('Title 02Title 01');
    fireEvent.click(view.getByText('Title 01'));
    expect(selection.get()).toEqual({ kind: 'layer', id: 't1' });
  });

  it('has no furniture section on a map without furniture', async () => {
    const { view, mirror } = mount();
    await act(async () => {
      await mirror.start();
    });
    expect(view.queryByRole('group', { name: 'Furniture' })).toBeNull();
  });

  it('shows a hidden layer with the eye, as one command', async () => {
    const { view, mirror, ran } = mount();
    await act(async () => {
      await mirror.start();
    });
    await act(async () => {
      fireEvent.click(view.getByLabelText('Show Hex Noise 01'));
    });
    expect(ran).toEqual([
      { id: 'node.set-visible', payload: { at: '/maps/map/hex-noise', visible: true } },
    ]);
  });

  it('in a booklet lists the pages, each with its map, then the maps on no page', async () => {
    const { view, mirror } = mount(booklet());
    await act(async () => {
      await mirror.start();
    });
    const items = view.getAllByRole('treeitem').map((el) => el.textContent);
    expect(items).toEqual([
      'Westmarch',
      'Cover',
      'Page 01',
      'Map 01',
      'Hex Grid',
      'Hex Noise 01',
      'Freeform 01',
      'Paper',
      'Page 02',
      'Back',
      'Map 02',
    ]);
    expect(view.getByRole('group', { name: 'Not on a page' }).textContent).toContain('Map 02');
    fireEvent.click(view.getByText('Page 02'));
    expect(selection.get()).toEqual({ kind: 'page', id: 'p2' });
  });
});
