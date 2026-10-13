import { describe, expect, it } from 'vitest';
import { createDeltaDecoder, createDeltaEncoder } from '@/render/delta';
import type { SceneFrame } from '@/render/types';

const frame = (over: Partial<SceneFrame> = {}): SceneFrame => ({
  size: { w: 100, h: 80 },
  pixelRatio: 2,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers: [
    { id: 'a', type: 'paper', visible: true, state: { n: 1 } },
    { id: 'b', type: 'freeform', visible: true, state: { n: 2 } },
  ],
  palette: { terrain: {}, grid: { line: '#000' } } as never,
  ...over,
});

describe('delta frames', () => {
  it('sends everything first, then only changed state', () => {
    const enc = createDeltaEncoder();
    const f = frame();
    const first = enc.encode(f);
    expect(first?.layers.every((l) => 'state' in l)).toBe(true);
    expect(first?.palette).toBe(f.palette);

    const b2 = { n: 3 };
    const second = enc.encode(
      frame({ layers: [f.layers[0], { ...f.layers[1], state: b2 }], palette: f.palette }),
    );
    expect('state' in (second?.layers[0] ?? {})).toBe(false);
    expect(second?.layers[1].state).toBe(b2);
    expect(second && 'palette' in second && second.palette !== undefined).toBe(false);
  });

  it('skips a frame that would draw the same', () => {
    const enc = createDeltaEncoder();
    const f = frame();
    enc.encode(f);
    expect(enc.encode(frame({ layers: f.layers, palette: f.palette }))).toBeNull();
  });

  it('redraws for camera, visibility, order and palette changes', () => {
    const enc = createDeltaEncoder();
    const f = frame();
    enc.encode(f);
    const same = { layers: f.layers, palette: f.palette };
    expect(enc.encode(frame({ ...same, camera: { x: 5, y: 0, zoom: 1 } }))).not.toBeNull();
    expect(
      enc.encode(
        frame({
          ...same,
          layers: [f.layers[0], { ...f.layers[1], visible: false }],
          camera: { x: 5, y: 0, zoom: 1 },
        }),
      ),
    ).not.toBeNull();
    expect(
      enc.encode(frame({ palette: undefined, layers: [f.layers[1], f.layers[0]] })),
    ).not.toBeNull();
  });

  it('decodes back to the same frame and drops removed ids', () => {
    const enc = createDeltaEncoder();
    const dec = createDeltaDecoder();
    const f = frame();
    expect(dec.decode(enc.encode(f) as never)).toEqual(f);
    const g = frame({ layers: [f.layers[1]], palette: f.palette });
    expect(dec.decode(enc.encode(g) as never)).toEqual(g);
    const h = frame({ layers: [f.layers[1], f.layers[0]], palette: f.palette });
    // `a` returned after being dropped, so its state is sent again
    expect(dec.decode(enc.encode(h) as never)).toEqual(h);
  });
});
