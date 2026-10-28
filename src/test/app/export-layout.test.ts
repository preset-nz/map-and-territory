import { layoutPage, mapAlign, mmToPt, mmToPx, paperAspectRatio } from '@/app/export/layout';

const ASPECTS = ['square', '4:3', '16:10'] as const;

describe('page layout', () => {
  it('sizes A4 portrait at 300 dpi as 2480 x 3508 px', () => {
    const l = layoutPage({ size: 'a4', orientation: 'portrait', marginMm: 10, aspect: 1 });
    expect(l.pageMm).toEqual({ w: 210, h: 297 });
    expect(l.pagePx).toEqual({ w: 2480, h: 3508 });
  });

  it('sizes A5 and swaps for landscape', () => {
    const p = layoutPage({ size: 'a5', orientation: 'portrait', marginMm: 10, aspect: 1 });
    const l = layoutPage({ size: 'a5', orientation: 'landscape', marginMm: 10, aspect: 1 });
    expect(p.pageMm).toEqual({ w: 148, h: 210 });
    expect(l.pageMm).toEqual({ w: 210, h: 148 });
    expect(l.pagePx).toEqual({ w: mmToPx(210), h: mmToPx(148) });
  });

  it('puts a wide map at the top margin, full width inside the margins', () => {
    const l = layoutPage({ size: 'a4', orientation: 'portrait', marginMm: 10, aspect: 16 / 10 });
    expect(l.mapMm.x).toBe(10);
    expect(l.mapMm.y).toBe(10);
    expect(l.mapMm.w).toBeCloseTo(190);
    expect(l.mapMm.h).toBeCloseTo(118.75);
  });

  it('puts the map at the foot or centres it alone, by its layout (epic 32)', () => {
    const at = (layout: string) =>
      layoutPage({
        size: 'a4',
        orientation: 'portrait',
        marginMm: 10,
        aspect: 16 / 9,
        align: mapAlign(layout),
      }).mapMm;
    const h = 190 / (16 / 9);
    expect(at('map-top').y).toBe(10);
    expect(at('map-top-3col').y).toBe(10);
    expect(at('map-bottom').y).toBeCloseTo(297 - 10 - h);
    expect(at('map-full').y).toBeCloseTo((297 - h) / 2);
    expect(at('key-after').y).toBeCloseTo((297 - h) / 2);
    // the shape is the map's whatever the layout
    expect(at('map-bottom').h).toBeCloseTo(h);
  });

  it.each(['a5', 'a4'] as const)('keeps every paper aspect on the page (%s)', (size) => {
    for (const orientation of ['portrait', 'landscape'] as const) {
      for (const a of ASPECTS) {
        const l = layoutPage({ size, orientation, marginMm: 10, aspect: paperAspectRatio(a) });
        for (const [r, page] of [
          [l.mapMm, l.pageMm],
          [l.mapPx, l.pagePx],
        ] as const) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(page.w + 1e-9);
          expect(r.y + r.h).toBeLessThanOrEqual(page.h + 1e-9);
        }
        // Aspect holds in mm.
        expect(l.mapMm.w / l.mapMm.h).toBeCloseTo(paperAspectRatio(a));
      }
    }
  });

  it('reads the paper aspect choices as ratios', () => {
    expect(paperAspectRatio('square')).toBe(1);
    expect(paperAspectRatio('4:3')).toBeCloseTo(4 / 3);
    expect(paperAspectRatio('16:10')).toBeCloseTo(1.6);
  });

  it('fits the height and centres across when the map is too tall', () => {
    const l = layoutPage({ size: 'a4', orientation: 'landscape', marginMm: 10, aspect: 1 });
    // Landscape A4 is 297 x 210: inside the margins 277 x 190, so a square is 190 wide.
    expect(l.mapMm.h).toBeCloseTo(190);
    expect(l.mapMm.w).toBeCloseTo(190);
    expect(l.mapMm.y).toBe(10);
    expect(l.mapMm.x).toBeCloseTo(10 + (277 - 190) / 2);
    expect(l.mapMm.x + l.mapMm.w / 2).toBeCloseTo(297 / 2);
  });

  it('handles a very tall map', () => {
    const l = layoutPage({ size: 'a5', orientation: 'portrait', marginMm: 10, aspect: 0.25 });
    expect(l.mapMm.h).toBeCloseTo(190);
    expect(l.mapMm.w).toBeCloseTo(47.5);
    expect(l.mapMm.x + l.mapMm.w / 2).toBeCloseTo(74);
  });

  it('fills the page with zero margin when the aspect matches', () => {
    const l = layoutPage({ size: 'a4', orientation: 'portrait', marginMm: 0, aspect: 210 / 297 });
    expect(l.mapMm).toEqual({ x: 0, y: 0, w: 210, h: 297 });
    expect(l.mapPx).toEqual({ x: 0, y: 0, w: 2480, h: 3508 });
  });

  it('starts a wide map at the page edge with zero margin', () => {
    const l = layoutPage({ size: 'a4', orientation: 'portrait', marginMm: 0, aspect: 1 });
    expect(l.mapMm).toEqual({ x: 0, y: 0, w: 210, h: 210 });
  });

  it('rounds the rect edges, not its size, so it never exceeds the page', () => {
    // 148 mm at 300 dpi is 1748.03 px; a 10 mm margin is 118.11 px.
    const l = layoutPage({ size: 'a5', orientation: 'portrait', marginMm: 10, aspect: 1 });
    expect(l.mapPx.x).toBe(mmToPx(10));
    expect(l.mapPx.x + l.mapPx.w).toBe(mmToPx(138));
    expect(l.mapPx.w).toBe(mmToPx(138) - mmToPx(10));
    expect(l.mapPx.x + l.mapPx.w).toBeLessThanOrEqual(l.pagePx.w);
  });

  it('rounds every mm edge to the nearest whole pixel', () => {
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(mmToPx(0.04, 300)).toBe(0); // 0.47 px
    expect(mmToPx(0.05, 300)).toBe(1); // 0.59 px
  });

  it('scales with dpi', () => {
    const l = layoutPage({ size: 'a4', orientation: 'portrait', marginMm: 0, aspect: 1, dpi: 150 });
    expect(l.dpi).toBe(150);
    expect(l.pagePx).toEqual({ w: 1240, h: 1754 });
  });

  it('clamps a margin larger than the page to a zero-size map inside it', () => {
    const l = layoutPage({ size: 'a5', orientation: 'portrait', marginMm: 500, aspect: 1.6 });
    expect(l.mapMm.w).toBe(0);
    expect(l.mapMm.h).toBe(0);
    expect(l.mapMm.x).toBeLessThanOrEqual(l.pageMm.w);
  });

  it('converts mm to PDF points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72);
    expect(mmToPt(210)).toBeCloseTo(595.28, 2);
    expect(mmToPt(297)).toBeCloseTo(841.89, 2);
  });
});
