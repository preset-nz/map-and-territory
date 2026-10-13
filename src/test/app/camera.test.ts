import { hitTest } from '@/app/scene/pointer';
import { clampCamera, FIT, MAX_ZOOM, panBy, toPaper, zoomAt } from '@/app/view/camera';
import { toPoint } from '@/lib/hex/layout';
import { computePaperRect } from '@/render/geometry';
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
    const p = computePaperRect({ canvasSize: f.size, paper: { aspect: '16:10' } });
    const layout = { size: 24, orientation: 'pointy' as const, origin: { x: p.w / 2, y: p.h / 2 } };
    for (const h of [
      { q: 3, r: -1 },
      { q: -2, r: -1 },
    ]) {
      const c = toPoint(h, layout);
      // where the renderer draws it: (paper point - camera) * zoom, from the paper's corner
      const screen = { x: p.x + (c.x - cam.x) * cam.zoom, y: p.y + (c.y - cam.y) * cam.zoom };
      expect(hitTest(f, screen.x, screen.y)?.hex).toEqual(h);
    }
  });
});
