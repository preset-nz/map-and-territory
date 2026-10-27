import { describe, expect, it } from 'vitest';
import { computePaperRect, paperSize, paperView } from '@/render/geometry';

describe('computePaperRect', () => {
  it('maintains 16:10 aspect within canvas bounds', () => {
    const rect = computePaperRect({
      canvasSize: { w: 1200, h: 800 },
      paper: { aspect: '16:10' },
    });
    expect(rect.w).toBeCloseTo(1080);
    expect(rect.h).toBeCloseTo(675);
    expect(rect.x).toBeCloseTo(60);
    expect(rect.y).toBeCloseTo(12);
    expect((rect.w / rect.h).toFixed(2)).toBe('1.60');
  });

  it('centers square aspect when height constrains layout', () => {
    const rect = computePaperRect({
      canvasSize: { w: 1200, h: 800 },
      paper: { aspect: 'square' },
    });
    expect(rect.w).toBeCloseTo(rect.h);
    expect(rect.w).toBeCloseTo(776);
    expect(rect.x).toBeCloseTo(212);
    expect(rect.y).toBeCloseTo(12);
  });

  it('handles tiny canvases without negative sizes', () => {
    const rect = computePaperRect({
      canvasSize: { w: 100, h: 80 },
      paper: { aspect: '4:3' },
    });
    expect(rect.w).toBeGreaterThanOrEqual(0);
    expect(rect.h).toBeGreaterThanOrEqual(0);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });
});

// epic 07 story 6: the map has a size, from its aspect alone
describe('paperSize', () => {
  it('is 1200 paper px on the long side', () => {
    expect(paperSize('16:10')).toEqual({ w: 1200, h: 750 });
    expect(paperSize('4:3')).toEqual({ w: 1200, h: 900 });
    expect(paperSize('square')).toEqual({ w: 1200, h: 1200 });
  });
});

describe('paperView', () => {
  it('places the paper as computePaperRect does and scales paper space into it', () => {
    const canvas = { w: 1200, h: 800 };
    const v = paperView(canvas, '16:10');
    expect(v.rect).toEqual(computePaperRect({ canvasSize: canvas, paper: { aspect: '16:10' } }));
    expect(v.size).toEqual({ w: 1200, h: 750 });
    expect(v.fit).toBeCloseTo(1080 / 1200);
    expect(v.size.h * v.fit).toBeCloseTo(v.rect.h);
  });

  it('has no fit when the canvas has no room for the paper', () => {
    expect(paperView({ w: 10, h: 10 }, '4:3').fit).toBe(0);
  });
});
