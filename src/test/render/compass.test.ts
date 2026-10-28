import { describe, expect, it } from 'vitest';
import {
  CompassAdapter,
  type CompassState,
  GAP_NS,
  LETTER_SIZE,
  WORD_SIZE,
} from '@/layers/adapters/compass';
import { BACKING } from '@/layers/adapters/compass-shapes';
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
  size: 120,
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
    expect(n?.y).toBeCloseTo(c.y - 60 - GAP_NS * 120);
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
    const r = (BACKING * 120) / 2;
    expect(c.x).toBeLessThanOrEqual(1200 - 24 - r);
    expect(c.y).toBeGreaterThanOrEqual(24 + r);
    expect(c.r).toBeCloseTo(r);
    expect(centre(draw({ north: 37 }))).toEqual(c);
    const bl = centre(draw({ anchor: 'bottom-left' }));
    expect(bl.x).toBeCloseTo(1200 - c.x);
    expect(bl.y).toBeCloseTo(750 - c.y);
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

  it('draws an arrow as two halves and a mark as two strokes', () => {
    const arrow = draw({ style: 'arrow' }).paths;
    expect(arrow.filter((p) => p.op === 'fill').map((p) => p.style)).toEqual([
      '#222222',
      '#eeeeee',
    ]);
    const mark = draw({ style: 'mark' }).paths;
    expect(mark.filter((p) => p.op === 'fill')).toEqual([]);
    expect(mark.filter((p) => p.op === 'stroke')).toHaveLength(2);
    // scratched goes over each stroke again
    expect(draw({ style: 'mark', hand: 'scratched' }).paths).toHaveLength(4);
  });

  it('sizes a letter and a longer word as fractions of the size', () => {
    const font = (word: string) => {
      const ctx = draw({ size: 240, resolvedLabels: [word, '', '', ''] });
      return ctx.font;
    };
    expect(font('N')).toContain(`${LETTER_SIZE * 240}px`);
    expect(font('Throne')).toContain(`${WORD_SIZE * 240}px`);
  });
});

describe('the compass by hand', () => {
  const pts = (s: Partial<CompassState>) => draw(s).paths.map((p) => p.pts);

  it('wobbles the same for the same seed, and differently for a new id', () => {
    expect(pts({ hand: 'drawn', seed: 'a' })).toEqual(pts({ hand: 'drawn', seed: 'a' }));
    expect(pts({ hand: 'drawn', seed: 'a' })).not.toEqual(pts({ hand: 'drawn', seed: 'b' }));
    // clean: each half is its three sides' ends, exact
    expect(pts({ hand: 'clean' })[0]).toHaveLength(6);
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
      { anchor: 'top-left' },
      { inset: 0 },
      { backing: false },
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
