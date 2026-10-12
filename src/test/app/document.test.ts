import {
  createMirror,
  type PomBackend,
  PomProvider,
  type Row,
  type Status,
  type Update,
  type View,
} from '@preset.nz/pom';
import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import { useMapIds } from '@/app/scene/maps';

const row = (id: string, path: string, type: string, extra: Partial<Row> = {}): Row => ({
  id,
  path,
  name: path.split('/').pop() ?? '',
  type,
  role: 'node',
  parent: null,
  ...extra,
});

const status: Status = {
  title: 'Untitled',
  path: null,
  unsaved: false,
  undo: null,
  redo: null,
  gesture: false,
  generation: 0,
};

/** Just enough of the Rust document host: a view, then updates the test sends. */
function fakeBackend(initial: Row[]) {
  const updates = new Set<(u: Update) => void>();
  const backend: PomBackend = {
    connect: async () => null,
    view: async (): Promise<View> => ({
      seq: 0,
      generation: 0,
      schema: { categories: [], types: [] },
      rows: initial,
    }),
    status: async () => status,
    commands: async () => [],
    run: async () => 'nothing',
    begin: async () => 1,
    end: async () => undefined,
    cancel: async () => undefined,
    onUpdate: async (f) => {
      updates.add(f);
      return () => updates.delete(f);
    },
    onStatus: async () => () => undefined,
  };
  const send = (u: Update) => {
    for (const f of updates) f(u);
  };
  return { backend, send };
}

function MapList() {
  return createElement(
    'ul',
    null,
    ...useMapIds().map((id) => createElement('li', { key: id }, id)),
  );
}

describe('the webview on the document mirror', () => {
  it('shows a map once the update that adds it arrives', async () => {
    const maps = row('maps', '/maps', 'category', { role: 'category', orders: { maps: [] } });
    const { backend, send } = fakeBackend([maps]);
    const mirror = createMirror(backend);
    const view = render(createElement(PomProvider, { mirror }, createElement(MapList)));
    await act(async () => {
      await mirror.start();
    });
    expect(view.container.querySelectorAll('li')).toHaveLength(0);

    await act(async () => {
      send({
        seq: 1,
        label: 'New Map',
        changes: [],
        rows: [{ ...maps, orders: { maps: ['m1'] } }, row('m1', '/maps/map', 'map')],
        removed: [],
        generation: 0,
      });
    });
    expect([...view.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['m1']);
  });
});
