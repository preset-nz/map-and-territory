import { hitTest } from '@/app/scene/pointer';
import {
  clampCamera,
  FIT,
  MAX_ZOOM,
  panBy,
  panByView,
  toPaper,
  zoomAt,
  zoomAtView,
} from '@/app/view/camera';
import { toPoint } from '@/lib/hex/layout';
import { paperView } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';

const paper = { w: 800, h: 500 };

describe('the camera', () => {
  it('keeps the paper point under the cursor fixed while zooming', () => {
    const at = { x: 300, y: 120 };
    const before = toPaper(FIT, at);
    const c = zoomAt(FIT, 2, at, paper);
    expect(c.zoom).toBe(2);
    const after = toPaper(c, at);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps zoom to 1..MAX and the view to the paper', () => {
    expect(zoomAt(FIT, 0.1, { x: 0, y: 0 }, paper)).toEqual(FIT);
    expect(zoomAt(FIT, 100, { x: 400, y: 250 }, paper).zoom).toBe(MAX_ZOOM);
    const c = clampCamera({ x: -50, y: 9999, zoom: 2 }, paper);
    expect(c).toEqual({ x: 0, y: 250, zoom: 2 });
  });

  it('cannot pan at fit, and pans in paper units when zoomed', () => {
    expect(panBy(FIT, 40, 40, paper)).toEqual(FIT);
    const c = panBy({ x: 0, y: 0, zoom: 2 }, 100, 60, paper);
    expect(c).toEqual({ x: 50, y: 30, zoom: 2 });
  });

  it('zooming out to fit returns to the whole paper', () => {
    const z = zoomAt(FIT, 4, { x: 700, y: 400 }, paper);
    expect(zoomAt(z, 1 / 4, { x: 100, y: 100 }, paper)).toEqual(FIT);
  });
});

// epic 07 story 6: the camera is in paper px; view px are divided by the fit on the way in
describe('the camera on a paper drawn at a fit other than 1', () => {
  // a 1000 px wide canvas: the 16:10 paper is 900 CSS px wide for its 1200 paper px
  const view = paperView({ w: 1000, h: 700 }, '16:10');

  it('is clamped to the paper size, not the screen rect', () => {
    expect(view.fit).toBeCloseTo(0.75);
    expect(view.size).toEqual({ w: 1200, h: 750 });
    const c = clampCamera({ x: 9999, y: 9999, zoom: 2 }, view.size);
    expect(c).toEqual({ x: 600, y: 375, zoom: 2 });
  });

  it('pans by view px over the fit: a drag moves the paper with the pointer', () => {
    const c = panByView({ x: 0, y: 0, zoom: 2 }, view, 90, 45);
    // 90 CSS px at fit 0.75 and zoom 2 is 60 paper px
    expect(c.x).toBeCloseTo(60);
    expect(c.y).toBeCloseTo(30);
  });

  it('zooms about the canvas point under the cursor', () => {
    const at = { x: view.rect.x + 300, y: view.rect.y + 120 };
    const before = { x: 300 / view.fit, y: 120 / view.fit };
    const c = zoomAtView(FIT, 2, view, at.x, at.y);
    const after = toPaper(c, { x: 300 / view.fit, y: 120 / view.fit });
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAtView(FIT, 100, view, at.x, at.y).zoom).toBe(MAX_ZOOM);
  });
});

describe('pointer to hex under a camera', () => {
  const frame = (camera: SceneFrame['camera']): SceneFrame => ({
    size: { w: 1000, h: 700 },
    pixelRatio: 1,
    paper: { aspect: '16:10', color: '#fff' },
    camera,
    layers: [
      { id: 'g', type: 'hexgrid', visible: true, state: { size: 24, orientation: 'pointy' } },
    ],
  });

  it('finds the hex the renderer drew under the pointer', () => {
    const cam = { x: 120, y: 40, zoom: 2 };
    const f = frame(cam);
    const { rect: p, size, fit } = paperView(f.size, '16:10');
    const layout = {
      size: 24,
      orientation: 'pointy' as const,
      origin: { x: size.w / 2, y: size.h / 2 },
    };
    for (const h of [
      { q: 3, r: -1 },
      { q: -2, r: -1 },
    ]) {
      const c = toPoint(h, layout);
      // where the renderer draws it: (paper point - camera) * zoom * fit, from the paper's corner
      const k = cam.zoom * fit;
      const screen = { x: p.x + (c.x - cam.x) * k, y: p.y + (c.y - cam.y) * k };
      expect(hitTest(f, screen.x, screen.y)?.hex).toEqual(h);
    }
  });
});
