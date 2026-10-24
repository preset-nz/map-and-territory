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
import { actionsFor, displayName, layersTopFirst } from '@/app/scene/tree';
import { selection } from '@/app/selection';

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

  it('adds layers to the active map, above nothing when a map is selected', () => {
    const s = sceneCommandState({ kind: 'map', id: 'm' }, rows);
    expect(s.mapPath).toBe('/maps/map');
    expect(s.layerPath).toBeNull();
    expect(s.target?.title).toBe('Map');
  });
});

describe('the scene panel', () => {
  function mount() {
    const ran: { id: string; payload: unknown }[] = [];
    const backend: PomBackend = {
      connect: async () => null,
      view: async (): Promise<View> => ({
        seq: 0,
        generation: 0,
        schema: { categories: [], types: [] },
        rows: doc(),
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
});
