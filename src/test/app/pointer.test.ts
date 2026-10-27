import { hitTest } from '@/app/scene/pointer';
import { toPoint } from '@/lib/hex/layout';
import { paperView } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';

const frame = (
  orientation: 'pointy' | 'flat',
  size = 24,
  canvas = { w: 1000, h: 700 },
  camera = { x: 0, y: 0, zoom: 1 },
): SceneFrame => ({
  size: canvas,
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#fff' },
  camera,
  layers: [
    { id: 'p', type: 'paper', visible: true, state: {} },
    { id: 'g', type: 'hexgrid', visible: true, state: { size, orientation } },
  ],
});

describe('pointer to hex', () => {
  for (const orientation of ['pointy', 'flat'] as const) {
    it(`finds the hex under the pointer, ${orientation}`, () => {
      const f = frame(orientation);
      const { rect, size, fit } = paperView(f.size, '16:10');
      const layout = { size: 24, orientation, origin: { x: size.w / 2, y: size.h / 2 } };
      for (const h of [
        { q: 0, r: 0 },
        { q: 3, r: -2 },
        { q: -4, r: 5 },
      ]) {
        const c = toPoint(h, layout);
        // a little off the centre, in paper px, then drawn at the fit
        expect(hitTest(f, rect.x + (c.x + 2) * fit, rect.y + (c.y - 1) * fit)?.hex).toEqual(h);
      }
    });
  }

  // epic 07 story 6: paper space is the paper's fixed size, so a window changes only the fit
  it('lands on the same hex for the same paper point at two window sizes and at zoom 2', () => {
    const point = { x: 812, y: 211 }; // paper px
    const hexAt = (canvas: { w: number; h: number }, camera = { x: 0, y: 0, zoom: 1 }) => {
      const f = frame('pointy', 24, canvas, camera);
      const { rect, fit } = paperView(canvas, '16:10');
      // where the renderer draws the paper point: (p - camera) * zoom * fit, from the corner
      const k = fit * camera.zoom;
      const hit = hitTest(f, rect.x + (point.x - camera.x) * k, rect.y + (point.y - camera.y) * k);
      expect(hit?.point.x).toBeCloseTo(point.x);
      expect(hit?.point.y).toBeCloseTo(point.y);
      return hit?.hex;
    };
    const small = hexAt({ w: 700, h: 500 });
    expect(paperView({ w: 700, h: 500 }, '16:10').fit).toBeLessThan(1);
    expect(paperView({ w: 2400, h: 1600 }, '16:10').fit).toBeGreaterThan(1);
    expect(small).not.toBeNull();
    expect(hexAt({ w: 2400, h: 1600 })).toEqual(small);
    expect(hexAt({ w: 700, h: 500 }, { x: 500, y: 100, zoom: 2 })).toEqual(small);
    expect(hexAt({ w: 2400, h: 1600 }, { x: 500, y: 100, zoom: 2 })).toEqual(small);
  });

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
