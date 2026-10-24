import { describe, expect, it, vi } from 'vitest';
import { HexgridAdapter, type HexgridState } from '@/layers/adapters/hexgrid';
import {
  cornerKey,
  cornerOffset,
  fitDashPattern,
  misregistrationShift,
  ownedEdges,
  seedBase,
} from '@/layers/hex-lines';
import { hexTiles } from '@/layers/hex-utils';
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

// ---- story 2: misregistration and corner jitter ----

/** Records each stroke: the dash in force and the edges queued since beginPath. */
function recorder() {
  const strokes: { dash: number[]; offset: number; edges: number[][][] }[] = [];
  let dash: number[] = [];
  let edges: number[][][] = [];
  let from: number[] = [];
  const c = ctx();
  c.beginPath = vi.fn(() => {
    edges = [];
  });
  c.moveTo = vi.fn((x: number, y: number) => {
    from = [x, y];
  });
  c.lineTo = vi.fn((x: number, y: number) => {
    edges.push([from, [x, y]]);
  });
  c.setLineDash = vi.fn((d: number[]) => {
    dash = d;
  });
  c.stroke = vi.fn(() => {
    strokes.push({ dash, offset: c.lineDashOffset, edges });
  });
  return Object.assign(c, { strokes });
}

const allEdges = (c: ReturnType<typeof recorder>) => c.strokes.flatMap((s) => s.edges);

describe('corner keys', () => {
  for (const orientation of ['pointy', 'flat'] as const) {
    it(`give a ${orientation} corner the same key from all three hexes that share it`, () => {
      const r = 17;
      const origin = { x: 61.5, y: 40.25 };
      const cfg = {
        size: r,
        orientation,
        center: origin,
        bounds: { w: 200, h: 160 },
        padding: 2,
      };
      const centres = [...hexTiles(cfg)].map((t) => t.center);
      // corner -> set of keys seen from every hex that has it, by position rounded to 1e-3
      const seen = new Map<string, Set<string>>();
      const hexesAt = new Map<string, number>();
      for (const c of centres) {
        const a0 = orientation === 'pointy' ? -Math.PI / 6 : 0;
        for (let i = 0; i < 6; i++) {
          const a = a0 + (i * Math.PI) / 3;
          const p = { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
          const pos = `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
          const k = cornerKey(p, origin, r, orientation);
          const set = seen.get(pos) ?? new Set<string>();
          set.add(`${k.u},${k.v}`);
          seen.set(pos, set);
          hexesAt.set(pos, (hexesAt.get(pos) ?? 0) + 1);
        }
      }
      const shared = [...hexesAt].filter(([, n]) => n === 3);
      expect(shared.length).toBeGreaterThan(20);
      for (const [pos] of shared) expect(seen.get(pos)!.size, pos).toBe(1);
      // and different corners never share a key
      const keys = new Set([...seen.values()].map((s) => [...s][0]));
      expect(keys.size).toBe(seen.size);
    });
  }

  it('gives the same offset for the same lattice corner whatever the tiling centre', () => {
    for (const orientation of ['pointy', 'flat'] as const) {
      const r = 20;
      const base = seedBase('grid');
      // the same lattice corner, reached from two tilings whose centres differ by whole
      // lattice steps (as when the paper is resized), has the same key relative to its centre
      const at = (o: { x: number; y: number }) => {
        const c = [...hexTiles({ size: r, orientation, center: o, bounds: { w: 80, h: 80 } })][0]!;
        return cornerOffset(base, cornerKey(c.center, o, r, orientation), 5);
      };
      const o1 = { x: 100, y: 100 };
      const o2 = { x: 150.5, y: 70 };
      expect(at(o1)).toEqual(at(o2));
    }
  });
});

describe('seeded wobble', () => {
  const wob = (over: Partial<HexgridState> = {}, e = env()) => {
    const c = recorder();
    HexgridAdapter.drawMain?.(c, state(over), e);
    return c;
  };
  const sig = (c: ReturnType<typeof recorder>) =>
    JSON.stringify(allEdges(c).map((e) => e.map((p) => p.map((n) => Math.round(n * 1e6)))));

  it('draws exactly story 1 at 0 and 0, whatever the seed', () => {
    for (const orientation of ['pointy', 'flat'] as const) {
      for (const lineStyle of ['solid', 'dashed'] as const) {
        const plain = wob({ orientation, lineStyle });
        const zero = wob({
          orientation,
          lineStyle,
          seed: 'anything',
          misregistration: 0,
          cornerJitter: 0,
        });
        expect(sig(zero)).toBe(sig(plain));
        expect(zero.strokes.map((s) => s.dash)).toEqual(plain.strokes.map((s) => s.dash));
        expect(zero.strokes.length).toBe(1);
      }
    }
  });

  it('is deterministic, and a different seed gives a different grid', () => {
    const o = { misregistration: 4, cornerJitter: 3 };
    expect(sig(wob({ ...o, seed: 'a' }))).toBe(sig(wob({ ...o, seed: 'a' })));
    expect(sig(wob({ ...o, seed: 'a' }))).not.toBe(sig(wob({ ...o, seed: 'b' })));
  });

  it('shifts every point by the misregistration, edges staying whole', () => {
    const plain = allEdges(wob());
    const moved = allEdges(wob({ seed: 's', misregistration: 7 }));
    const d = misregistrationShift('s', 7);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(7, 9);
    expect(moved.length).toBe(plain.length);
    plain.forEach((e, i) => {
      for (let j = 0; j < 2; j++) {
        expect(moved[i]![j]![0]).toBeCloseTo(e[j]![0]! + d.x, 9);
        expect(moved[i]![j]![1]).toBeCloseTo(e[j]![1]! + d.y, 9);
      }
    });
  });

  it('moves each corner by at most the jitter, and the edges that meet there move together', () => {
    const jitter = 3;
    const plain = allEdges(wob());
    const moved = allEdges(wob({ cornerJitter: jitter }));
    const byEnd = new Map<string, Set<string>>();
    plain.forEach((e, i) => {
      for (let j = 0; j < 2; j++) {
        const was = e[j]!;
        const now = moved[i]![j]!;
        expect(Math.hypot(now[0]! - was[0]!, now[1]! - was[1]!)).toBeLessThanOrEqual(jitter + 1e-9);
        const k = `${was[0]!.toFixed(3)},${was[1]!.toFixed(3)}`;
        const set = byEnd.get(k) ?? new Set<string>();
        set.add(`${now[0]!.toFixed(6)},${now[1]!.toFixed(6)}`);
        byEnd.set(k, set);
      }
    });
    for (const [k, set] of byEnd) expect(set.size, k).toBe(1);
    expect(sig(wob({ cornerJitter: jitter }))).not.toBe(sig(wob()));
  });

  it('keeps a lattice corner where it is when the paper is resized or its centre moves', () => {
    // Two papers whose centres differ by two whole hexes along x: the same grid, slid by dx,
    // so each jittered edge of the first must reappear in the second, shifted.
    const r = 20;
    const dx = r * Math.sqrt(3) * 2;
    const a = allEdges(wob({ cornerJitter: 4, seed: 'x' }, env(120, 100)));
    const b = allEdges(wob({ cornerJitter: 4, seed: 'x' }, env(120 + 2 * dx, 100)));
    const norm = (e: number[][], s: number) =>
      e
        .map((p) => `${(p[0]! + s).toFixed(3)},${p[1]!.toFixed(3)}`)
        .sort()
        .join('|');
    const inB = new Set(b.map((e) => norm(e, 0)));
    let matched = 0;
    for (const e of a) {
      if (inB.has(norm(e, dx))) matched++;
    }
    expect(matched).toBe(a.length);
  });

  it('fits every jittered edge to whole repeats, each stroke for its own length', () => {
    for (const lineStyle of ['dashed', 'dotted', 'dash-dot'] as const) {
      const c = wob({ lineStyle, cornerJitter: 6, lineWidth: 2, seed: 'fit' });
      expect(c.strokes.length).toBeGreaterThan(5);
      let checked = 0;
      for (const s of c.strokes) {
        const period = s.dash.reduce((x, y) => x + y, 0);
        for (const [p, q] of s.edges) {
          const len = Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!);
          const periods = len / period;
          // whole repeats to within the length bin (half a bin either way)
          expect(Math.abs(periods - Math.round(periods)) * period).toBeLessThanOrEqual(
            0.125 + 1e-9,
          );
          expect(s.offset).toBeCloseTo(s.dash[0]! / 2, 12);
          checked++;
        }
      }
      expect(checked).toBe(allEdges(c).length);
      // not one pattern for all: lengths differ
      expect(new Set(c.strokes.map((s) => s.dash.join(','))).size).toBeGreaterThan(5);
    }
  });

  it('stays a single stroke for solid with jitter and for dashed with misregistration only', () => {
    expect(wob({ cornerJitter: 5 }).strokes.length).toBe(1);
    expect(wob({ lineStyle: 'dashed', misregistration: 5 }).strokes.length).toBe(1);
  });

  it('keeps the number of strokes small on a large paper', () => {
    const big = env(4000, 3000);
    const t = performance.now();
    const c = wob({ size: 8, lineStyle: 'dashed', cornerJitter: 8, lineWidth: 2 }, big);
    const ms = performance.now() - t;
    expect(c.strokes.length).toBeLessThan(200);
    console.info(
      `size 8, 4000x3000: ${allEdges(c).length} edges, ${c.strokes.length} strokes, ${ms.toFixed(0)} ms`,
    );
  });
});

describe('hexgrid invalidation key, story 2', () => {
  it('changes with the seed, misregistration and corner jitter', () => {
    const base = state();
    const k = HexgridAdapter.getInvalidationKey(base);
    expect(HexgridAdapter.getInvalidationKey({ ...base, seed: 'other' })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, misregistration: 2 })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, cornerJitter: 2 })).not.toEqual(k);
  });
});
