import { HIDDEN_ALPHA, LocationsAdapter, type LocationsState } from '@/layers/adapters/locations';
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
  dash: number[] = [];
  dashes: number[][] = [];
  texts: { text: string; x: number; y: number; alpha: number }[] = [];
  private stack: number[] = [];
  save() {
    this.stack.push(this.globalAlpha);
  }
  restore() {
    this.globalAlpha = this.stack.pop() ?? 1;
  }
  beginPath() {}
  arc() {}
  fill() {}
  stroke() {
    this.dashes.push(this.dash);
  }
  setLineDash(d: number[]) {
    this.dash = d;
  }
  strokeText() {}
  fillText(text: string, x: number, y: number) {
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
});
