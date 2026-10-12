import { hitTest } from '@/app/scene/pointer';
import { toPoint } from '@/lib/hex/layout';
import { computePaperRect } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';

const frame = (orientation: 'pointy' | 'flat', size = 24): SceneFrame => ({
  size: { w: 1000, h: 700 },
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers: [
    { id: 'p', type: 'paper', visible: true, state: {} },
    { id: 'g', type: 'hexgrid', visible: true, state: { size, orientation } },
  ],
});

describe('pointer to hex', () => {
  for (const orientation of ['pointy', 'flat'] as const) {
    it(`finds the hex under the pointer, ${orientation}`, () => {
      const f = frame(orientation);
      const paper = computePaperRect({ canvasSize: f.size, paper: { aspect: '16:10' } });
      const layout = { size: 24, orientation, origin: { x: paper.w / 2, y: paper.h / 2 } };
      for (const h of [
        { q: 0, r: 0 },
        { q: 3, r: -2 },
        { q: -4, r: 5 },
      ]) {
        const c = toPoint(h, layout);
        expect(hitTest(f, paper.x + c.x + 2, paper.y + c.y - 1)?.hex).toEqual(h);
      }
    });
  }

  it('is nothing off the paper', () => {
    expect(hitTest(frame('pointy'), 1, 1)).toBeNull();
  });

  it('gives a point but no hex when the map has no grid', () => {
    const f = { ...frame('pointy'), layers: [] };
    const hit = hitTest(f, 500, 350);
    expect(hit?.hex).toBeNull();
    expect(hit?.point).toBeTruthy();
  });
});
