import { createFrameBuilder, type FrameRow, type RowSource } from '@/app/scene/frame';
import { chunkName, chunkOf, decodeChunk, decodeSlots } from '@/app/scene/voxels';
import { createStroke } from '@/app/tools/stroke';
import fixtures from '../../../src-tauri/src/object_model/voxels_fixtures.json';

describe('the voxel grid', () => {
  it('locates a hex by floor division, negatives included', () => {
    expect(chunkOf(0, 0)).toEqual({ cq: 0, cr: 0, slot: 0 });
    expect(chunkOf(17, 2)).toEqual({ cq: 1, cr: 0, slot: 2 * 16 + 1 });
    expect(chunkOf(-1, -16)).toEqual({ cq: -1, cr: -1, slot: 15 });
    expect(chunkName(-1, 3)).toBe('-1_3');
  });

  it('decodes a chunk into cells, keeping colour overrides', () => {
    const voxels = {
      palette: [{ terrainId: 'forest' }, { terrainId: 'water', color: [1, 0, 0, 1] }],
      cells: '1 0*16 2 0*238',
    };
    expect(decodeChunk('-1_2', voxels)).toEqual({
      '-16,32': { terrainId: 'forest' },
      '-15,33': { terrainId: 'water', color: '#ff0000' },
    });
    expect(decodeChunk('nope', voxels)).toEqual({});
  });

  it('decodes the shared fixtures to the grids Rust encodes them from', () => {
    for (const { name, grid, encoded } of fixtures) {
      const slots = decodeSlots(encoded);
      expect(slots, name).not.toBeNull();
      const want = Array<unknown>(256).fill(null);
      for (const [slot, voxel] of Object.entries(grid)) want[Number(slot)] = voxel;
      expect(slots, name).toEqual(want);
    }
  });

  it('reads nothing from a malformed value', () => {
    const palette = [{ terrainId: 'a' }];
    expect(decodeChunk('0_0', { palette, cells: '1 0*254' })).toEqual({});
    expect(decodeChunk('0_0', { palette, cells: '2 0*255' })).toEqual({});
    expect(decodeChunk('0_0', { palette, cells: 'x 0*255' })).toEqual({});
    expect(decodeChunk('0_0', Array(256).fill(null))).toEqual({});
    expect(decodeChunk('0_0', undefined)).toEqual({});
  });
});

describe('a freeform layer in the frame', () => {
  const chunk = (id: string, name: string, terrainId: string): FrameRow => {
    const voxels = { palette: [{ terrainId }], cells: '1 0*255' };
    return { id, type: 'chunk', path: `/maps/map/freeform/${name}`, values: { voxels } };
  };
  const rows = (extra: Record<string, FrameRow>): RowSource => {
    const all: Record<string, FrameRow & { path?: string }> = {
      m: { id: 'm', type: 'map', path: '/maps/map', orders: { layers: ['f'] } },
      f: {
        id: 'f',
        type: 'freeform',
        path: '/maps/map/freeform',
        values: { visible: true },
        orders: { chunks: ['c1', 'c2'] },
      },
      c1: chunk('c1', '0_0', 'forest'),
      c2: chunk('c2', '1_0', 'water'),
      ...extra,
    };
    return { node: (id) => all[id], nodeAt: (p) => Object.values(all).find((r) => r.path === p) };
  };

  it('gathers its chunks into cells, and keeps the state while no chunk changes', () => {
    const b = createFrameBuilder({ types: [] });
    const r = rows({});
    const first = b.build(r, 'm', { w: 100, h: 100 }, 1).layers[0].state as {
      cells: Record<string, unknown>;
    };
    expect(first.cells).toEqual({ '0,0': { terrainId: 'forest' }, '16,0': { terrainId: 'water' } });
    expect(b.build(r, 'm', { w: 100, h: 100 }, 1).layers[0].state).toBe(first);

    const changed = rows({ c2: chunk('c2', '1_0', 'hills') });
    const next = b.build(changed, 'm', { w: 100, h: 100 }, 1).layers[0].state as {
      cells: Record<string, { terrainId: string }>;
    };
    expect(next).not.toBe(first);
    expect(next.cells['16,0'].terrainId).toBe('hills');
  });
});

describe('a stroke', () => {
  function fakeChannel() {
    const calls: unknown[] = [];
    return {
      calls,
      channel: {
        begin: async (label: string) => {
          calls.push(['begin', label]);
          return 7;
        },
        run: async (id: string, payload?: unknown) => {
          calls.push(['run', id, payload]);
          return 'nothing' as const;
        },
        end: async (token: number | Promise<number>) => {
          calls.push(['end', await token]);
        },
      },
    };
  }

  it('sends the hexes gathered since the last frame as one command, then ends the step', async () => {
    const { calls, channel } = fakeChannel();
    const frames: (() => void)[] = [];
    const s = createStroke({
      channel,
      label: 'Paint',
      command: 'freeform.paint',
      at: '/maps/map/freeform',
      nextFrame: (f) => frames.push(f),
    });
    s.add({ q: 0, r: 0, terrainId: 'forest' });
    s.add({ q: 1, r: 0, terrainId: 'forest' });
    s.add({ q: 0, r: 0, terrainId: 'forest' }); // dragged back over: nothing new
    expect(frames).toHaveLength(1);
    frames[0]();
    s.add({ q: 2, r: 0, terrainId: 'forest' });
    s.end();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual([
      ['begin', 'Paint'],
      [
        'run',
        'freeform.paint',
        {
          at: '/maps/map/freeform',
          cells: [
            { q: 0, r: 0, terrainId: 'forest' },
            { q: 1, r: 0, terrainId: 'forest' },
          ],
        },
      ],
      [
        'run',
        'freeform.paint',
        { at: '/maps/map/freeform', cells: [{ q: 2, r: 0, terrainId: 'forest' }] },
      ],
      ['end', 7],
    ]);
  });

  it('sends erased hexes as pairs', () => {
    const { calls, channel } = fakeChannel();
    const s = createStroke({
      channel,
      label: 'Erase',
      command: 'freeform.erase',
      at: '/x',
      nextFrame: (f) => f(),
    });
    s.add({ q: 3, r: -1 });
    expect(calls[1]).toEqual(['run', 'freeform.erase', { at: '/x', cells: [[3, -1]] }]);
  });
});
