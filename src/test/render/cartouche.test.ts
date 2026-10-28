import { describe, expect, it } from 'vitest';
import {
  CartoucheAdapter,
  type CartoucheState,
  LINE_GAP,
  LINE_HEIGHT,
  PAD_X,
  PAD_Y,
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
  fills: { x: number; y: number; w: number; h: number; style: string }[] = [];
  strokes: { x: number; y: number; w: number; h: number }[] = [];
  texts: { text: string; x: number; y: number; font: string; style: string; align: string }[] = [];
  save() {}
  restore() {}
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
      { ink: '#000000' },
      { titleInk: '#00000073' },
      { paper: '#ffffff' },
    ];
    const keys = changes.map(key);
    for (const [i, c] of keys.entries()) expect(c, JSON.stringify(changes[i])).not.toBe(k);
    expect(new Set(keys).size).toBe(keys.length);
    // the override reaches the drawing only through resolvedTitle, which the projection sets
    expect(key({ title: 'typed' })).toBe(k);
  });
});
