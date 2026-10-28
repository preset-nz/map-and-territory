import { describe, expect, it } from 'vitest';
import {
  CartoucheAdapter,
  type CartoucheState,
  DOUBLE_GAP,
  INNER_RULE,
  LINE_GAP,
  LINE_HEIGHT,
  MUTED_INK_ALPHA,
  PAD_X,
  PAD_Y,
  RULE_WIDTH,
  SUBTITLE_SCALE,
} from '@/layers/adapters/cartouche';
import type { RenderEnv } from '@/layers/types';

// The mock measures every character as half the font's px size: enough to place the box. Real
// text measurement in a face can't happen in Vitest; that is the window check's.
class MockContext {
  font = '10px sans-serif';
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  textAlign = 'start';
  textBaseline = 'alphabetic';
  lineCap = 'butt';
  globalAlpha = 1;
  fills: { x: number; y: number; w: number; h: number; style: string }[] = [];
  strokes: { x: number; y: number; w: number; h: number }[] = [];
  texts: {
    text: string;
    x: number;
    y: number;
    font: string;
    style: string;
    align: string;
    alpha: number;
    rotation: number;
  }[] = [];
  /** Paths stroked or filled by hand, with the style and width they were drawn in. */
  paths: { op: 'stroke' | 'fill'; pts: [number, number][]; style: string; width: number }[] = [];
  private pts: [number, number][] = [];
  private rotation = 0;
  private saved: number[] = [];
  save() {
    this.saved.push(this.rotation);
  }
  restore() {
    this.rotation = this.saved.pop() ?? 0;
  }
  translate() {}
  rotate(a: number) {
    this.rotation += a;
  }
  beginPath() {
    this.pts = [];
  }
  moveTo(x: number, y: number) {
    this.pts.push([x, y]);
  }
  lineTo(x: number, y: number) {
    this.pts.push([x, y]);
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
    this.paths.push({ op: 'fill', pts: this.pts, style: String(this.fillStyle), width: 0 });
  }
  measureText(text: string) {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
    return { width: text.length * px * 0.5 } as TextMetrics;
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.fills.push({ x, y, w, h, style: String(this.fillStyle) });
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.strokes.push({ x, y, w, h });
  }
  fillText(text: string, x: number, y: number) {
    this.texts.push({
      text,
      x,
      y,
      font: this.font,
      style: String(this.fillStyle),
      align: this.textAlign,
      alpha: this.globalAlpha,
      rotation: this.rotation,
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

const base: CartoucheState = {
  title: '',
  subtitle: '',
  credit: '',
  frame: 'rule',
  align: 'centre',
  titleSize: 30,
  anchor: 'top-left',
  inset: 24,
  backing: true,
  face: 'condensed',
  resolvedTitle: 'The Sallow Fen',
  ink: '#222222',
  titleInk: '#222222',
  paper: '#eeeeee',
};

function draw(state: Partial<CartoucheState>) {
  const ctx = new MockContext();
  CartoucheAdapter.drawMain?.(
    ctx as unknown as CanvasRenderingContext2D,
    { ...base, ...state },
    env,
  );
  return ctx;
}

// "The Sallow Fen" is 14 characters; at 30 px the mock measures it 14 × 15 = 210.
const BOX_W = 210 + 2 * PAD_X * 30;
const BOX_H = 2 * PAD_Y * 30 + 30 * LINE_HEIGHT;

describe('the cartouche adapter', () => {
  it('draws the backing plate, then the rule, then the title', () => {
    const ctx = draw({});
    expect(ctx.fills).toEqual([{ x: 24, y: 24, w: BOX_W, h: BOX_H, style: '#eeeeee' }]);
    expect(ctx.strokes).toHaveLength(1);
    expect(ctx.texts.map((t) => t.text)).toEqual(['THE SALLOW FEN']);
  });

  it('puts the box at its anchor, inset in from the paper edges', () => {
    const at = (anchor: CartoucheState['anchor'], inset = 24) => draw({ anchor, inset }).fills[0];
    expect(at('top-left')).toMatchObject({ x: 24, y: 24 });
    expect(at('top-left', 0)).toMatchObject({ x: 0, y: 0 });
    expect(at('bottom-right')).toMatchObject({ x: 1200 - 24 - BOX_W, y: 750 - 24 - BOX_H });
    expect(at('top-centre')).toMatchObject({ x: (1200 - BOX_W) / 2, y: 24 });
    expect(at('bottom-left', 100)).toMatchObject({ x: 100, y: 750 - 100 - BOX_H });
    expect(at('top-right', 60)).toMatchObject({ x: 1200 - 60 - BOX_W, y: 60 });
    expect(at('bottom-centre')).toMatchObject({ x: (1200 - BOX_W) / 2, y: 750 - 24 - BOX_H });
  });

  it('strokes no frame for none, and fills no plate without backing', () => {
    expect(draw({ frame: 'none' }).strokes).toEqual([]);
    expect(draw({ frame: 'none' }).fills).toHaveLength(1);
    expect(draw({ backing: false }).fills).toEqual([]);
    expect(draw({ backing: false }).strokes).toHaveLength(1);
  });

  it('sets condensed and marker in capitals, serif and blackletter as typed', () => {
    const text = (face: string) => draw({ face }).texts[0].text;
    expect(text('condensed')).toBe('THE SALLOW FEN');
    expect(text('marker')).toBe('THE SALLOW FEN');
    expect(text('serif')).toBe('The Sallow Fen');
    expect(text('blackletter')).toBe('The Sallow Fen');
    expect(draw({ face: 'serif' }).texts[0].font).toContain('MT IM Fell English');
    expect(draw({ face: 'marker' }).texts[0].font).toContain('MT Permanent Marker');
  });

  it('adds the subtitle and credit lines below, smaller, and leaves blank ones out', () => {
    const ctx = draw({ subtitle: 'Marches of the Drowned Bishop', credit: 'Surveyed 1347' });
    expect(ctx.texts.map((t) => t.text)).toEqual([
      'THE SALLOW FEN',
      'Marches of the Drowned Bishop',
      'Surveyed 1347',
    ]);
    expect(ctx.texts[1].font).toMatch(/^italic .*15px/);
    expect(ctx.texts[2].font).toContain('10px');
    expect(ctx.texts[1].y).toBeGreaterThan(ctx.texts[0].y);
    expect(ctx.texts[2].y).toBeGreaterThan(ctx.texts[1].y);
    // the box grows to the longest line (the subtitle, 29 × 7.5) and to three lines
    const sub = 29 * 15 * 0.5;
    const h = 2 * PAD_Y * 30 + (30 + 15 + 10) * LINE_HEIGHT + 2 * LINE_GAP * 30;
    expect(ctx.fills[0].w).toBeCloseTo(sub + 2 * PAD_X * 30);
    expect(ctx.fills[0].h).toBeCloseTo(h);
    expect(SUBTITLE_SCALE).toBe(0.5);
    expect(draw({ subtitle: '  ' }).texts).toHaveLength(1);
  });

  it('aligns the lines within the box', () => {
    const left = draw({ align: 'left' }).texts[0];
    const right = draw({ align: 'right' }).texts[0];
    const centre = draw({ align: 'centre' }).texts[0];
    expect(left).toMatchObject({ x: 24 + PAD_X * 30, align: 'left' });
    expect(right).toMatchObject({ x: 24 + BOX_W - PAD_X * 30, align: 'right' });
    expect(centre).toMatchObject({ x: 24 + BOX_W / 2, align: 'center' });
  });

  it('prints the title in its own ink and the rest in the ink', () => {
    const ctx = draw({ titleInk: '#22222273', subtitle: 'Sub' });
    expect(ctx.texts[0].style).toBe('#22222273');
    expect(ctx.texts[1].style).toBe('#222222');
  });

  it('changes its key with every value it draws', () => {
    const key = (s: Partial<CartoucheState>) =>
      CartoucheAdapter.getInvalidationKey({ ...base, ...s });
    const k = key({});
    const changes: Partial<CartoucheState>[] = [
      { resolvedTitle: 'Drowned Marches' },
      { subtitle: 'Sub' },
      { credit: 'Credit' },
      { frame: 'none' },
      { align: 'left' },
      { titleSize: 31 },
      { anchor: 'bottom-right' },
      { inset: 25 },
      { backing: false },
      { face: 'serif' },
      { hand: 'scratched' },
      { seed: 'other' },
      { ink: '#000000' },
      { titleInk: '#00000073' },
      { titleMuted: true },
      { paper: '#ffffff' },
    ];
    const keys = changes.map(key);
    for (const [i, c] of keys.entries()) expect(c, JSON.stringify(changes[i])).not.toBe(k);
    expect(new Set(keys).size).toBe(keys.length);
    // the override reaches the drawing only through resolvedTitle, which the projection sets
    expect(key({ title: 'typed' })).toBe(k);
  });
});

describe('the double frame', () => {
  const room = (DOUBLE_GAP + INNER_RULE * RULE_WIDTH) * 30;

  it('draws two rules and nothing else, and grows to keep the lines clear of them', () => {
    const ctx = draw({ frame: 'double' });
    expect(ctx.strokes).toHaveLength(2);
    const [outer, inner] = ctx.strokes;
    expect(inner.x).toBeGreaterThan(outer.x);
    expect(inner.w).toBeLessThan(outer.w);
    // the backing is the only fill: no corner blocks (Georg, 2026-10-28)
    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].w).toBeCloseTo(BOX_W + 2 * room);
    expect(ctx.fills[0].h).toBeCloseTo(BOX_H + 2 * room);
    // left-aligned text starts inside the inner rule
    expect(draw({ frame: 'double', align: 'left' }).texts[0].x).toBeCloseTo(24 + PAD_X * 30 + room);
  });
});

describe('the plate frame', () => {
  it('fills the box with the ink and reverses the lines out in the paper', () => {
    const ctx = draw({ frame: 'plate', subtitle: 'Sub' });
    // no backing under a plate: the plate is the only fill
    expect(ctx.fills).toEqual([
      { x: 24, y: 24, w: BOX_W + 0, h: expect.any(Number), style: '#222222' },
    ]);
    expect(ctx.strokes).toEqual([]);
    expect(ctx.texts.map((t) => t.style)).toEqual(['#eeeeee', '#eeeeee']);
  });

  it('reverses "Untitled map" out at the muted alpha', () => {
    const ctx = draw({ frame: 'plate', titleMuted: true, subtitle: 'Sub' });
    expect(ctx.texts.map((t) => t.alpha)).toEqual([MUTED_INK_ALPHA, 1]);
  });
});

describe('the cartouche by hand', () => {
  const pts = (s: Partial<CartoucheState>) => draw(s).paths.map((p) => p.pts);

  it('draws clean as exact rects and upright lines', () => {
    const ctx = draw({ hand: 'clean' });
    expect(ctx.paths).toEqual([]);
    expect(ctx.strokes).toHaveLength(1);
    expect(ctx.texts[0].rotation).toBe(0);
  });

  it('draws the rule as four wobbled strokes when drawn, and twice over when scratched', () => {
    const drawn = draw({ hand: 'drawn' });
    expect(drawn.strokes).toEqual([]);
    expect(drawn.paths.filter((p) => p.op === 'stroke')).toHaveLength(4);
    const scratched = draw({ hand: 'scratched' }).paths;
    expect(scratched).toHaveLength(8);
    expect(scratched[1].width).toBeCloseTo(scratched[0].width * 0.6);
  });

  it('keeps the backing clean', () => {
    expect(draw({ hand: 'scratched' }).fills).toEqual([
      { x: 24, y: 24, w: BOX_W, h: BOX_H, style: '#eeeeee' },
    ]);
  });

  it('fills a plate through its wobbled outline', () => {
    const ctx = draw({ frame: 'plate', hand: 'drawn' });
    expect(ctx.fills).toEqual([]);
    const plate = ctx.paths.filter((p) => p.op === 'fill');
    expect(plate).toHaveLength(1);
    expect(plate[0].style).toBe('#222222');
    expect(plate[0].pts.length).toBeGreaterThan(4);
  });

  it('draws the same wobble for the same seed, and a different one for a new id', () => {
    expect(pts({ hand: 'drawn', seed: 'a' })).toEqual(pts({ hand: 'drawn', seed: 'a' }));
    expect(pts({ hand: 'drawn', seed: 'a' })).not.toEqual(pts({ hand: 'drawn', seed: 'b' }));
    const lean = (seed: string) => draw({ hand: 'scratched', seed }).texts[0].rotation;
    expect(lean('a')).toBe(lean('a'));
    expect(lean('a')).not.toBe(lean('b'));
  });

  it('leans each line within the hand’s tilt', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const t = draw({ hand: 'drawn', seed, subtitle: 'Sub' }).texts;
      for (const l of t) expect(Math.abs(l.rotation)).toBeLessThanOrEqual((1.5 / 180) * Math.PI);
    }
  });
});
