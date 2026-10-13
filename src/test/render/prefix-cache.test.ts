import { describe, expect, it } from 'vitest';
import { PrefixPlanner } from '@/render/prefixCache';
import type { SceneFrame } from '@/render/types';

const states = [{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }];
const frame = (over: Partial<SceneFrame> = {}, layers = states): SceneFrame => ({
  size: { w: 10, h: 10 },
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers: layers.map((state, i) => ({ id: `l${i}`, type: 't', visible: true, state })),
  ...over,
});
const edited = (k: number) => states.map((s, i) => (i === k ? { ...s } : s));

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

  it('keeps the top layer out of the cache and survives drop()', () => {
    const p = new PrefixPlanner();
    p.plan(frame());
    expect(p.plan(frame({}, edited(3)))).toEqual({ reuse: 0, snapshotAt: 3 });
    p.snapshotTaken();
    p.drop();
    expect(p.plan(frame({}, edited(3))).reuse).toBe(0);
  });
});
