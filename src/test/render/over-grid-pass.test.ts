import { describe, expect, it } from 'vitest';
import { registerLayerType } from '@/layers/registry';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import type { SceneFrame } from '@/render/types';

const drawn: string[] = [];
registerLayerType({
  id: 'probe',
  title: 'Probe',
  defaultState: {},
  adapter: {
    title: 'Probe',
    drawMain: () => drawn.push('main'),
    drawOverGrid: () => drawn.push('over-grid'),
    getInvalidationKey: () => 'k',
  },
});

const ctx = new Proxy({} as Record<string | symbol, unknown>, {
  get: (t, k) => (k in t ? t[k] : () => undefined),
  set: (t, k, v) => {
    t[k] = v;
    return true;
  },
});

describe('the over-grid pass', () => {
  it('draws drawMain at the layer’s place and drawOverGrid for its over-grid entry, in an export too', () => {
    const state = {};
    const frame: SceneFrame = {
      size: { w: 100, h: 100 },
      pixelRatio: 1,
      paper: { aspect: '16:10', color: '#fff' },
      camera: { x: 0, y: 0, zoom: 1 },
      layers: [
        { id: 'a', type: 'probe', visible: true, state },
        { id: 'a', type: 'probe', visible: true, state, pass: 'over-grid' },
      ],
    };
    new Canvas2DBackend().renderExport(
      ctx as unknown as CanvasRenderingContext2D,
      frame,
      { w: 100, h: 100 },
      { w: 100, h: 100 },
    );
    expect(drawn).toEqual(['main', 'over-grid']);
  });
});
