import { describe, expect, it } from 'vitest';
import {
  CompassAdapter,
  type CompassState,
  GAP_NS,
  inkPast,
  LETTER_SIZE,
  WORD_SIZE,
} from '@/layers/adapters/compass';
import type { RenderEnv } from '@/layers/types';

// The mock measures every character as half the font's px size, and records paths in paper
// px: the compass turns its points, not the canvas, so positions are real coordinates.
class MockContext {
  font = '10px sans-serif';
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  arcs: { x: number; y: number; r: number; style: string }[] = [];
  texts: { text: string; x: number; y: number; rotation: number; style: string }[] = [];
  paths: { op: 'stroke' | 'fill'; pts: [number, number][]; style: string; width: number }[] = [];
  private pts: [number, number][] = [];
  private arc_: { x: number; y: number; r: number } | null = null;
  private rotation = 0;
  private at: [number, number] = [0, 0];
  private saved: { rotation: number; at: [number, number] }[] = [];
  save() {
    this.saved.push({ rotation: this.rotation, at: this.at });
  }
  restore() {
    const s = this.saved.pop();
    this.rotation = s?.rotation ?? 0;
    this.at = s?.at ?? [0, 0];
  }
  translate(x: number, y: number) {
    this.at = [this.at[0] + x, this.at[1] + y];
  }
  rotate(a: number) {
    this.rotation += a;
  }
  beginPath() {
    this.pts = [];
    this.arc_ = null;
  }
  moveTo(x: number, y: number) {
    this.pts.push([x, y]);
  }
  lineTo(x: number, y: number) {
    this.pts.push([x, y]);
  }
  arc(x: number, y: number, r: number) {
    this.arc_ = { x, y, r };
  }
  closePath() {}
  stroke() {
    this.paths.push({
      op: 'stroke',
      pts: this.pts,
      style: String(this.strokeStyle),
      width: this.lineWidth,
    });
  }
  fill() {
    if (this.arc_) this.arcs.push({ ...this.arc_, style: String(this.fillStyle) });
    else this.paths.push({ op: 'fill', pts: this.pts, style: String(this.fillStyle), width: 0 });
  }
  measureText(text: string) {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
    return { width: text.length * px * 0.5 } as TextMetrics;
  }
  fillText(text: string, x: number, y: number) {
    this.texts.push({
      text,
      x: x + this.at[0],
      y: y + this.at[1],
      rotation: this.rotation,
      style: String(this.fillStyle),
    });
  }
}

const env: RenderEnv = {
  zoom: 1,
  pixelRatio: 1,
  deviceScale: 1,
  size: { w: 1200, h: 750 },
  paperRect: { x: 0, y: 0, w: 1200, h: 750 },
  camera: { x: 0, y: 0, zoom: 1 },
};

const base: CompassState = {
  style: 'cross',
  labels: 'cardinal',
  north: 0,
  // a 160 px disc with the points at three quarters: 120 px across, as on the examples page
  size: 160,
  points: 0.75,
  anchor: 'top-right',
  inset: 24,
  backing: true,
  face: 'condensed',
  hand: 'clean',
  seed: 'c1',
  resolvedLabels: ['N', 'E', 'S', 'W'],
  ink: '#222222',
  paper: '#eeeeee',
};

function draw(state: Partial<CompassState>) {
  const ctx = new MockContext();
  CompassAdapter.drawMain?.(ctx as unknown as CanvasRenderingContext2D, { ...base, ...state }, env);
  return ctx;
}

/** The compass's centre: the backing disc's. */
const centre = (ctx: MockContext) => ctx.arcs[0];

describe('the compass adapter', () => {
  it('turned to 90 puts N right of the centre, upright', () => {
    const ctx = draw({ north: 90 });
    const c = centre(ctx);
    const n = ctx.texts.find((t) => t.text === 'N');
    expect(n).toBeDefined();
    expect(n?.x).toBeGreaterThan(c.x + 60);
    expect(n?.y).toBeCloseTo(c.y);
    expect(n?.rotation).toBe(0);
    // E then sits below the centre
    const e = ctx.texts.find((t) => t.text === 'E');
    expect(e?.y).toBeGreaterThan(c.y + 60);
  });

  it('puts N above the centre at 0, its centre past the points by the gap', () => {
    const ctx = draw({});
    const c = centre(ctx);
    const n = ctx.texts.find((t) => t.text === 'N');
    expect(n?.x).toBeCloseTo(c.x);
    expect(n?.y).toBeCloseTo(c.y - 60 - inkPast(base) - GAP_NS * 120);
    expect(n?.style).toBe('#222222');
  });

  it('prints only the words it is given', () => {
    expect(draw({ resolvedLabels: ['Throne', '', '', ''] }).texts.map((t) => t.text)).toEqual([
      'THRONE',
    ]);
    expect(draw({ resolvedLabels: ['', '', '', ''] }).texts).toEqual([]);
  });

  it('sits top-right, inset from the paper, and stays put when north turns', () => {
    const c = centre(draw({}));
    const r = 160 / 2;
    expect(c.x).toBeLessThanOrEqual(1200 - 24 - r);
    expect(c.x).toBeGreaterThan(1200 - 24 - r - 10);
    expect(c.y).toBeGreaterThanOrEqual(24 + r);
    expect(c.r).toBeCloseTo(r);
    expect(centre(draw({ north: 37 }))).toEqual(c);
    const bl = centre(draw({ anchor: 'bottom-left' }));
    expect(bl.x).toBeCloseTo(1200 - c.x);
    expect(bl.y).toBeCloseTo(750 - c.y);
  });

  it('sizes the disc by Size and the points within it by Points', () => {
    const disc = centre(draw({ points: 0.5 }));
    expect(disc.r).toBeCloseTo(80);
    // half the disc's radius: the stem reaches 40 above the centre, and N follows it in
    const n = (s: Partial<CompassState>) => {
      const ctx = draw({ hand: 'clean', ...s });
      return centre(ctx).y - (ctx.texts.find((t) => t.text === 'N')?.y ?? 0);
    };
    expect(n({ points: 0.5 })).toBeLessThan(n({ points: 0.75 }));
    expect(n({ points: 0.5 })).toBeGreaterThan(40);
  });

  it('draws the backing disc in the paper, clean, and none when off', () => {
    const ctx = draw({ hand: 'scratched' });
    expect(ctx.arcs).toHaveLength(1);
    expect(ctx.arcs[0].style).toBe('#eeeeee');
    // the disc is still how the compass is placed, so turning it off doesn't move the points
    const off = draw({ backing: false });
    expect(off.arcs).toEqual([]);
    expect(off.paths).toEqual(draw({}).paths);
  });

  it('splits each of the cross’s four points into an inked and a paper half', () => {
    const fills = draw({}).paths.filter((p) => p.op === 'fill');
    expect(fills).toHaveLength(8);
    expect(fills.filter((f) => f.style === '#222222')).toHaveLength(4);
    expect(fills.filter((f) => f.style === '#eeeeee')).toHaveLength(4);
  });

  it('draws a rose: the ring, four short points, then four long ones over them', () => {
    const ctx = draw({ style: 'rose', ring: false });
    const c = centre(ctx);
    const fills = ctx.paths.filter((p) => p.op === 'fill');
    expect(fills).toHaveLength(16);
    expect(fills.filter((f) => f.style === '#222222')).toHaveLength(8);
    const reach = (p: (typeof fills)[number]) =>
      Math.max(...p.pts.map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
    // the short points reach 0.7 of the long, and come first, so the long lie over them
    expect(fills.slice(0, 8).every((f) => reach(f) <= 0.7 * 60 + 1e-6)).toBe(true);
    expect(fills.slice(8).every((f) => reach(f) >= 60 - 1e-6)).toBe(true);
    // the inner ring at 0.6 of the points' reach, stroked before any point is filled
    const first = ctx.paths[0];
    expect(first.op).toBe('stroke');
    expect(Math.hypot(first.pts[0][0] - c.x, first.pts[0][1] - c.y)).toBeCloseTo(36);
  });

  it('turns a rose by north, its long points on the turned directions', () => {
    const ctx = draw({ style: 'rose', ring: false, north: 90 });
    const c = centre(ctx);
    const pts = ctx.paths.filter((p) => p.op === 'fill').flatMap((p) => p.pts);
    const east = pts.reduce((a, b) => (b[0] > a[0] ? b : a));
    expect(east[0]).toBeCloseTo(c.x + 60);
    expect(east[1]).toBeCloseTo(c.y);
  });

  it('draws an arrow as two halves and a mark as two strokes', () => {
    const arrow = draw({ style: 'arrow', ring: false }).paths;
    expect(arrow.filter((p) => p.op === 'fill').map((p) => p.style)).toEqual([
      '#222222',
      '#eeeeee',
    ]);
    const mark = draw({ style: 'mark', ring: false }).paths;
    expect(mark.filter((p) => p.op === 'fill')).toEqual([]);
    expect(mark.filter((p) => p.op === 'stroke')).toHaveLength(2);
    // scratched goes over each stroke again
    expect(draw({ style: 'mark', hand: 'scratched', ring: false }).paths).toHaveLength(4);
  });

  it('sizes a letter and a longer word as fractions of the size', () => {
    const font = (word: string) => {
      const ctx = draw({ size: 320, resolvedLabels: [word, '', '', ''] });
      return ctx.font;
    };
    expect(font('N')).toContain(`${LETTER_SIZE * 240}px`);
    expect(font('Throne')).toContain(`${WORD_SIZE * 240}px`);
  });
});

describe('the ring and the words in a hand', () => {
  it('rings the disc in the ink, round twice when scratched, and not when off', () => {
    const rings = (s: Partial<CompassState>) =>
      draw({ style: 'mark', ...s }).paths.filter((p) => p.op === 'stroke' && p.pts.length > 100);
    expect(rings({})).toHaveLength(1);
    expect(rings({})[0].style).toBe('#222222');
    expect(rings({ hand: 'scratched' })).toHaveLength(2);
    expect(rings({ ring: false })).toEqual([]);
  });

  it('keeps N clear of the stem’s wobble and overshoot', () => {
    for (const hand of ['clean', 'drawn', 'scratched'] as const) {
      const ctx = draw({ style: 'mark', hand, resolvedLabels: ['N', '', '', ''] });
      const c = centre(ctx);
      const top = Math.min(
        ...ctx.paths.filter((p) => p.pts.length <= 100).flatMap((p) => p.pts.map(([, y]) => y)),
      );
      const n = ctx.texts[0];
      // the letter's lower edge sits above the highest ink of the stem
      expect(n.y + (LETTER_SIZE * 120) / 2, hand).toBeLessThan(top);
      expect(c).toBeDefined();
    }
  });
});

describe('the compass by hand', () => {
  const pts = (s: Partial<CompassState>) => draw(s).paths.map((p) => p.pts);

  it('wobbles the same for the same seed, and differently for a new id', () => {
    expect(pts({ hand: 'drawn', seed: 'a' })).toEqual(pts({ hand: 'drawn', seed: 'a' }));
    expect(pts({ hand: 'drawn', seed: 'a' })).not.toEqual(pts({ hand: 'drawn', seed: 'b' }));
    // clean: each half is its three sides' ends, exact
    expect(pts({ hand: 'clean', ring: false })[0]).toHaveLength(6);
  });

  it('fills both halves of a point along the same wobbled spine', () => {
    const fills = draw({ hand: 'scratched' }).paths.filter((p) => p.op === 'fill');
    const [ink, paper] = fills;
    // both halves start along spine 0, centre to tip, point for point
    const spine = (f: (typeof fills)[number]) => f.pts.slice(0, 10);
    expect(spine(ink)).toEqual(spine(paper));
  });

  it('leans the words in a hand, and keeps them upright clean', () => {
    const lean = (seed: string) => draw({ hand: 'scratched', seed }).texts[0].rotation;
    expect(lean('a')).not.toBe(0);
    expect(lean('a')).toBe(lean('a'));
    expect(draw({ hand: 'clean' }).texts.every((t) => t.rotation === 0)).toBe(true);
  });
});

describe('the compass invalidation key', () => {
  it('changes with every value that changes the drawing', () => {
    const key = (s: Partial<CompassState>) => CompassAdapter.getInvalidationKey({ ...base, ...s });
    const k = key({});
    const changes: Partial<CompassState>[] = [
      { style: 'arrow' },
      { labels: 'north-only' },
      { resolvedLabels: ['Throne', 'E', 'S', 'W'] },
      { north: 20 },
      { size: 80 },
      { points: 0.5 },
      { anchor: 'top-left' },
      { inset: 0 },
      { backing: false },
      { ring: false },
      { face: 'marker' },
      { hand: 'drawn' },
      { seed: 'c2' },
      { ink: '#000000' },
      { paper: '#ffffff' },
    ];
    const keys = changes.map(key);
    for (const [i, c] of keys.entries()) expect(c, JSON.stringify(changes[i])).not.toBe(k);
    expect(new Set(keys).size).toBe(keys.length);
    // the overrides reach the drawing only through resolvedLabels, which the projection sets
    expect(key({ labelN: 'typed' })).toBe(k);
  });
});
