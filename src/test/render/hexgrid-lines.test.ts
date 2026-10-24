import { describe, expect, it, vi } from 'vitest';
import { HexgridAdapter, type HexgridState } from '@/layers/adapters/hexgrid';
import { fitDashPattern, ownedEdges } from '@/layers/hex-lines';
import type { RenderEnv } from '@/layers/types';

const env = (w = 120, h = 100): RenderEnv => ({
  zoom: 1,
  pixelRatio: 1,
  size: { w, h },
  paperRect: { x: 0, y: 0, w, h },
  camera: { x: 0, y: 0, zoom: 1 },
});

function ctx() {
  const calls = { moves: [] as number[][], lines: [] as number[][] };
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => calls.moves.push([x, y])),
    lineTo: vi.fn((x: number, y: number) => calls.lines.push([x, y])),
    setLineDash: vi.fn(),
    lineDashOffset: 0,
    lineCap: 'butt',
    lineWidth: 1,
    strokeStyle: '',
    globalAlpha: 1,
  };
  return Object.assign(c as unknown as CanvasRenderingContext2D & typeof c, { calls });
}

const state = (over: Partial<HexgridState> = {}): HexgridState => ({
  size: 20,
  orientation: 'pointy',
  color: '#000000',
  usePaletteColor: false,
  ...over,
});

// An edge as a key that ignores direction and rounding.
const key = (a: number[], b: number[]) =>
  [a, b]
    .map((p) => p.map((n) => (Math.round(n! * 1000) / 1000 + 0).toFixed(3)).join(','))
    .sort()
    .join('|');

describe('hexgrid edges', () => {
  for (const orientation of ['pointy', 'flat'] as const) {
    it(`strokes every ${orientation} edge once, in one stroke`, () => {
      const c = ctx();
      HexgridAdapter.drawMain?.(c, state({ orientation }), env());
      expect(c.stroke).toHaveBeenCalledTimes(1);
      expect(c.calls.moves.length).toBe(c.calls.lines.length);
      const keys = c.calls.moves.map((m, i) => key(m, c.calls.lines[i]!));
      expect(new Set(keys).size).toBe(keys.length);
    });

    it(`leaves no ${orientation} edge missing inside the paper`, () => {
      const { w, h } = { w: 120, h: 100 };
      const c = ctx();
      HexgridAdapter.drawMain?.(c, state({ orientation }), env(w, h));
      const drawn = new Set(c.calls.moves.map((m, i) => key(m, c.calls.lines[i]!)));
      // every edge of every hex whose centre is near the paper, from all six sides
      const r = 20;
      const all = new Set<string>();
      const sqrt3 = Math.sqrt(3);
      for (let q = -12; q <= 12; q++) {
        for (let rr = -12; rr <= 12; rr++) {
          const x = orientation === 'pointy' ? r * sqrt3 * (q + rr / 2) : r * 1.5 * q;
          const y = orientation === 'pointy' ? r * 1.5 * rr : r * sqrt3 * (rr + q / 2);
          const cx = x + w / 2;
          const cy = y + h / 2;
          if (cx < -r || cx > w + r || cy < -r || cy > h + r) continue;
          const pts = [0, 1, 2, 3, 4, 5].map((i) => {
            const a = (orientation === 'pointy' ? -Math.PI / 6 : 0) + (i * Math.PI) / 3;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
          });
          for (let i = 0; i < 6; i++) all.add(key(pts[i]!, pts[(i + 1) % 6]!));
        }
      }
      expect(all.size).toBeGreaterThan(20);
      for (const e of all) expect(drawn.has(e), e).toBe(true);
    });

    it(`owns three of a ${orientation} hex's edges, none shared with its neighbour's three`, () => {
      const r = 10;
      const sqrt3 = Math.sqrt(3);
      const a = ownedEdges({ x: 0, y: 0 }, r, orientation);
      const nb =
        orientation === 'pointy'
          ? [
              { x: r * sqrt3, y: 0 },
              { x: (r * sqrt3) / 2, y: r * 1.5 },
              { x: (-r * sqrt3) / 2, y: r * 1.5 },
            ]
          : [
              { x: r * 1.5, y: (r * sqrt3) / 2 },
              { x: 0, y: r * sqrt3 },
              { x: -r * 1.5, y: (r * sqrt3) / 2 },
            ];
      const mine = a.map(([p, q]) => key([p.x, p.y], [q.x, q.y]));
      expect(new Set(mine).size).toBe(3);
      // the three neighbours across those edges each own three edges, none of them ours
      for (const n of nb) {
        for (const [p, q] of ownedEdges(n, r, orientation)) {
          expect(mine).not.toContain(key([p.x, p.y], [q.x, q.y]));
        }
      }
    });
  }

  it('draws solid with no dash and round caps', () => {
    const c = ctx();
    HexgridAdapter.drawMain?.(c, state(), env());
    expect(c.setLineDash).toHaveBeenCalledWith([]);
    expect(c.lineCap).toBe('round');
  });

  it('hands the fitted pattern to the context for a dashed grid, scaled by the line width', () => {
    const c = ctx();
    HexgridAdapter.drawMain?.(
      c,
      state({ lineStyle: 'dashed', lineWidth: 2, dashLength: 4, gapLength: 2 }),
      env(),
    );
    const plan = fitDashPattern('dashed', 4, 2, 2, 20);
    expect(c.setLineDash).toHaveBeenCalledWith(plan.pattern);
    expect(c.lineDashOffset).toBe(plan.offset);
    expect(c.stroke).toHaveBeenCalledTimes(1);
  });
});

describe('fitDashPattern', () => {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  it('is empty for solid', () => {
    expect(fitDashPattern('solid', 4, 2, 1, 20).pattern).toEqual([]);
  });

  for (const style of ['dashed', 'dotted', 'dash-dot'] as const) {
    it(`fits whole ${style} repeats on the edge, from the middle of the first mark`, () => {
      for (const len of [8, 13.7, 20, 47, 120]) {
        for (const w of [1, 2.5, 6]) {
          const p = fitDashPattern(style, 4, 2, w, len);
          expect(p.periods).toBeGreaterThanOrEqual(1);
          expect(sum(p.pattern) * p.periods).toBeCloseTo(len, 9);
          expect(p.offset).toBeCloseTo(p.pattern[0]! / 2, 12);
        }
      }
    });
  }

  it('lays dashed as [dash, gap], dotted as dots and dash-dot as four parts', () => {
    // lineWidth 1, edge 6 = one exact period of [3, 3]: dash 4 → mark 3, gap 2 → space 3
    expect(fitDashPattern('dashed', 4, 2, 1, 6).pattern).toEqual([3, 3]);
    expect(fitDashPattern('dotted', 4, 2, 1, 3).pattern).toEqual([0, 3]);
    expect(fitDashPattern('dash-dot', 4, 2, 1, 12).pattern).toEqual([4, 4, 0, 4]);
  });

  it('keeps the visible gap at gap * width for dots when the edge fits exactly', () => {
    const w = 2;
    const p = fitDashPattern('dotted', 4, 3, w, 4 * w * 5); // period (3+1)*2 = 8, edge 40 = 5 periods
    expect(p.periods).toBe(5);
    // canvas gap minus the cap a round dot adds on each side (w/2 + w/2 = w)
    expect(p.pattern[1]! - w).toBeCloseTo(3 * w, 12);
  });

  it('puts at least one repeat on a short edge and is deterministic', () => {
    const a = fitDashPattern('dash-dot', 20, 20, 3, 10);
    expect(a.periods).toBe(1);
    expect(fitDashPattern('dash-dot', 20, 20, 3, 10)).toEqual(a);
  });
});

describe('hexgrid invalidation key', () => {
  it('changes with the line style, dash length and gap length', () => {
    const base = state();
    const k = HexgridAdapter.getInvalidationKey(base);
    expect(HexgridAdapter.getInvalidationKey({ ...base, lineStyle: 'dashed' })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, dashLength: 5 })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, gapLength: 3 })).not.toEqual(k);
  });
});
