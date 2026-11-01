import { describe, expect, it } from 'vitest';
import { PrefixPlanner } from '@/render/prefixCache';
import type { SceneFrame } from '@/render/types';

// real layer types, so the keys are the adapters': each state draws differently
const states = [0, 1, 2, 3].map((n) => ({ file: `f${n}.png` }));
const frame = (over: Partial<SceneFrame> = {}, layers = states): SceneFrame => ({
  size: { w: 10, h: 10 },
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers: layers.map((state, i) => ({ id: `l${i}`, type: 'image', visible: true, state })),
  ...over,
});
const edited = (k: number) => states.map((s, i) => (i === k ? { file: `edited${k}.png` } : s));

describe('PrefixPlanner', () => {
  it('draws everything first and snapshots below the changed layer', () => {
    const p = new PrefixPlanner();
    expect(p.plan(frame())).toEqual({ reuse: 0, snapshotAt: null });
  });

  it('reuses the prefix across a stroke on one layer', () => {
    const p = new PrefixPlanner();
    p.plan(frame());
    const a = p.plan(frame({}, edited(2)));
    expect(a).toEqual({ reuse: 0, snapshotAt: 2 });
    p.snapshotTaken();
    const b = p.plan(frame({}, edited(2)));
    expect(b.reuse).toBe(2);
    expect(b.snapshotAt).toBeNull();
    p.snapshotTaken();
    expect(p.plan(frame({}, edited(2))).reuse).toBe(2);
  });

  it('invalidates for an edit below the prefix, a camera or a visibility change', () => {
    const p = new PrefixPlanner();
    p.plan(frame());
    p.plan(frame({}, edited(2)));
    p.snapshotTaken();
    expect(p.plan(frame({}, edited(1))).reuse).toBe(0);
    p.snapshotTaken();
    expect(p.plan(frame({ camera: { x: 1, y: 0, zoom: 1 } }, edited(1))).reuse).toBe(0);
    p.snapshotTaken();
    const hidden = frame({ camera: { x: 1, y: 0, zoom: 1 } }, edited(1));
    hidden.layers[0].visible = false;
    expect(p.plan(hidden).reuse).toBe(0);
  });

  it('invalidates when the hex grid changes size, though the grid is the top layer', () => {
    const grid = (size: number) => ({
      id: 'grid',
      type: 'hexgrid',
      visible: true,
      state: { size },
    });
    const withGrid = (size: number, layers = edited(2)): SceneFrame => {
      const f = frame({}, layers);
      return { ...f, layers: [...f.layers, grid(size)] };
    };
    const p = new PrefixPlanner();
    p.plan(withGrid(16, states));
    p.plan(withGrid(16));
    p.snapshotTaken();
    expect(p.plan(withGrid(16)).reuse).toBe(2);
    p.snapshotTaken();
    expect(p.plan(withGrid(24)).reuse).toBe(0);
  });

  it('keeps the top layer out of the cache', () => {
    const p = new PrefixPlanner();
    p.plan(frame());
    expect(p.plan(frame({}, edited(3)))).toEqual({ reuse: 0, snapshotAt: 3 });
  });

  it('reuses the prefix when a state is replaced by an equal copy', () => {
    const p = new PrefixPlanner();
    p.plan(frame());
    p.plan(frame({}, edited(2)));
    p.snapshotTaken();
    const copies = edited(2).map((s) => ({ ...s }));
    expect(p.plan(frame({}, copies)).reuse).toBe(2);
  });

  it('draws whole when a resource arrives, though no layer changed', () => {
    const p = new PrefixPlanner();
    p.plan(frame(), 0);
    p.plan(frame({}, edited(2)), 0);
    p.snapshotTaken();
    expect(p.plan(frame({}, edited(2)), 0).reuse).toBe(2);
    p.snapshotTaken();
    expect(p.plan(frame({}, edited(2)), 1).reuse).toBe(0);
  });

  it('tells a layer’s over-grid entry from its own place', () => {
    const p = new PrefixPlanner();
    const loc = { locations: [] };
    const base = frame({}, states);
    const at = (pass?: 'over-grid') =>
      frame({
        layers: [
          ...base.layers,
          { id: 'x', type: 'locations', visible: true, state: loc, ...(pass ? { pass } : {}) },
        ],
      });
    p.plan(at());
    p.snapshotTaken();
    // the same id and state, but as the over-grid entry: not the same layer
    expect(p.plan(at('over-grid')).snapshotAt).toBe(4);
  });
});
