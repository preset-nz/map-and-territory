import {
  AREA_TINT,
  areaEdges,
  HIDDEN_ALPHA,
  LocationsAdapter,
  type LocationsState,
} from '@/layers/adapters/locations';
import type { RenderEnv } from '@/layers/types';

/** Records the text drawn, with the alpha and line dash it was drawn under. */
class MockContext {
  font = '';
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  lineJoin = 'miter';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  globalAlpha = 1;
  shadowBlur = 0;
  shadowColor = '';
  rects = 0;
  glows = 0;
  dash: number[] = [];
  dashes: number[][] = [];
  texts: { text: string; x: number; y: number; alpha: number }[] = [];
  private stack: [number, number][] = [];
  save() {
    this.stack.push([this.globalAlpha, this.shadowBlur]);
  }
  restore() {
    [this.globalAlpha, this.shadowBlur] = this.stack.pop() ?? [1, 0];
  }
  lineCap = 'butt';
  segments = 0;
  fills: number[] = [];
  beginPath() {}
  arc() {}
  moveTo() {}
  lineTo() {
    this.segments++;
  }
  closePath() {}
  fill() {
    this.fills.push(this.globalAlpha);
  }
  stroke() {
    this.dashes.push(this.dash);
  }
  setLineDash(d: number[]) {
    this.dash = d;
  }
  strokes = 0;
  strokeText() {
    this.strokes++;
  }
  measureText(text: string) {
    return { width: text.length * 5 };
  }
  rectHeights: number[] = [];
  fillRect(_x: number, _y: number, _w: number, h: number) {
    this.rects++;
    this.rectHeights.push(h);
  }
  fillText(text: string, x: number, y: number) {
    if (this.shadowBlur > 0) {
      this.glows++;
      return;
    }
    this.texts.push({ text, x, y, alpha: this.globalAlpha });
  }
}

const env = {
  size: { w: 800, h: 600 },
  grid: { size: 20, orientation: 'pointy' },
} as unknown as RenderEnv;

const state: LocationsState = {
  face: 'serif',
  ink: '#111111',
  paper: '#eeeeee',
  locations: [
    {
      id: 'a',
      name: 'Reedwall Keep',
      hexes: [{ q: 0, r: 0 }],
      number: 1,
      marker: 'number',
      hidden: false,
    },
    {
      id: 'b',
      name: 'Sunken Chapel',
      hexes: [{ q: 2, r: 0 }],
      number: 2,
      marker: 'number',
      hidden: true,
    },
    {
      id: 'c',
      name: 'Gallows Ford',
      hexes: [{ q: 0, r: 2 }],
      number: null,
      marker: 'dot',
      hidden: false,
    },
  ],
};

function draw(s: LocationsState = state) {
  const ctx = new MockContext();
  LocationsAdapter.drawMain?.(ctx as unknown as CanvasRenderingContext2D, s, env);
  return ctx;
}

describe('the locations adapter', () => {
  it('numbers each place on its hex and names it to the right', () => {
    const ctx = draw();
    const one = ctx.texts.find((t) => t.text === '1');
    const keep = ctx.texts.find((t) => t.text === 'Reedwall Keep');
    // the paper's centre is hex 0,0
    expect(one).toMatchObject({ x: 400, y: 300 });
    expect(keep?.x).toBeGreaterThan(400);
    expect(ctx.texts.some((t) => t.text === 'Gallows Ford')).toBe(true);
  });

  it('draws a hidden place faint, its ring dashed', () => {
    const ctx = draw();
    expect(ctx.texts.find((t) => t.text === 'Sunken Chapel')?.alpha).toBeCloseTo(HIDDEN_ALPHA);
    expect(ctx.texts.find((t) => t.text === 'Reedwall Keep')?.alpha).toBe(1);
    expect(ctx.dashes.some((d) => d.length > 0)).toBe(true);
  });

  it('leaves the names off when Names is off', () => {
    const texts = draw({ ...state, showLabels: false }).texts.map((t) => t.text);
    expect(texts).toEqual(['1', '2']);
  });

  it('changes its key with any place', () => {
    const key = LocationsAdapter.getInvalidationKey(state);
    const moved = {
      ...state,
      locations: state.locations?.map((l, i) => (i ? l : { ...l, hexes: [{ q: 1, r: 0 }] })),
    };
    expect(LocationsAdapter.getInvalidationKey(moved)).not.toBe(key);
  });

  it('prints names plain by default, outlined, over a glow, or on a paper label', () => {
    const plain = draw();
    expect(plain.glows + plain.rects).toBe(0);
    const glow = draw({ ...state, labelStyle: 'glow' });
    expect(glow.glows).toBe(9);
    expect(glow.texts.filter((t) => t.text === 'Reedwall Keep')).toHaveLength(1);
    const label = draw({ ...state, labelStyle: 'label' });
    expect(label.rects).toBe(3);
    // as tall as the letters with a little room, not the font string's weight (600 px)
    expect(Math.max(...label.rectHeights)).toBeLessThan(20);
    expect(plain.strokes).toBe(0);
    expect(draw({ ...state, labelStyle: 'outline' }).strokes).toBe(3);
  });

  it('tints an area, dashes its edge and centres its name under the marker', () => {
    const mire: LocationsState = {
      ...state,
      locations: [
        {
          id: 'm',
          name: 'The Mire',
          hexes: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
          number: 4,
          marker: 'number',
          hidden: false,
        },
      ],
    };
    const ctx = draw(mire);
    expect(ctx.fills).toContain(AREA_TINT);
    expect(ctx.dashes.some((d) => d.length > 0)).toBe(true);
    const four = ctx.texts.find((t) => t.text === '4');
    const name = ctx.texts.find((t) => t.text === 'The Mire');
    // the middle hex of the three is 1,0: √3 × 20 right of the paper's centre
    expect(four?.x).toBeCloseTo(400 + Math.sqrt(3) * 20);
    expect(name?.x).toBeCloseTo(four?.x ?? 0);
    expect(name?.y).toBeGreaterThan(four?.y ?? 0);
    // the areas half draws the tint and no words; the marks half the words and no tint
    const areas = draw({ ...mire, pass: 'areas' });
    expect([areas.texts.length, areas.fills.includes(AREA_TINT)]).toEqual([0, true]);
    const marks = draw({ ...mire, pass: 'marks' });
    expect(marks.fills).not.toContain(AREA_TINT);
    expect(marks.texts.map((t) => t.text)).toEqual(['4', 'The Mire']);
  });
});

describe('an area’s edge', () => {
  const at = (orientation: 'pointy' | 'flat') => ({
    size: 10,
    orientation,
    origin: { x: 0, y: 0 },
  });

  it('runs round the outside of a line of three hexes only', () => {
    const line = [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ];
    // 18 sides, 2 shared by each of the two neighbouring pairs
    expect(areaEdges(line, at('pointy'))).toHaveLength(14);
    expect(areaEdges(line, at('flat'))).toHaveLength(14);
  });

  it('runs inside a ring round its hole too', () => {
    const ring = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    // 36 sides less 6 shared pairs: 12 outside, 6 round the hole
    for (const o of ['pointy', 'flat'] as const) expect(areaEdges(ring, at(o))).toHaveLength(24);
    expect(areaEdges([{ q: 0, r: 0 }], at('flat'))).toHaveLength(6);
  });
});
