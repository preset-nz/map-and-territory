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

// ---- story 3: width noise ----

/** Records each outline (moveTo, lineTo..., closePath) and counts fills and strokes. */
function inkRecorder() {
  const polys: number[][][] = [];
  const c = ctx();
  const extra = c as unknown as Record<string, unknown>;
  extra.fill = vi.fn();
  extra.closePath = vi.fn();
  c.beginPath = vi.fn(() => {
    polys.length = 0;
  });
  c.moveTo = vi.fn((x: number, y: number) => {
    polys.push([[x, y]]);
  });
  c.lineTo = vi.fn((x: number, y: number) => {
    polys[polys.length - 1]!.push([x, y]);
  });
  return Object.assign(c, { polys, fill: extra.fill as ReturnType<typeof vi.fn> });
}

const CAP = 6; // vertices per cap are CAP - 1; matches CAP_STEPS in hex-lines
const ink = (over: Partial<HexgridState> = {}, e = env()) => {
  const c = inkRecorder();
  HexgridAdapter.drawMain?.(c, state(over), e);
  return c;
};

/** The half-widths at each end of every outline, with the end points they sit at. */
function ends(c: ReturnType<typeof inkRecorder>, over: Partial<HexgridState>, e = env()) {
  const plain = allEdges(
    (() => {
      const r = recorder();
      HexgridAdapter.drawMain?.(r, state({ ...over, widthNoise: 0 }), e);
      return r;
    })(),
  );
  expect(c.polys.length).toBe(plain.length);
  return c.polys.map((poly, i) => {
    const [a, b] = plain[i]!;
    const segs = (poly.length - 2 - 2 * (CAP - 1)) / 2;
    const first = poly[0]!;
    const last = poly[segs]!;
    return {
      a,
      b,
      ha: Math.hypot(first[0]! - a![0]!, first[1]! - a![1]!),
      hb: Math.hypot(last[0]! - b![0]!, last[1]! - b![1]!),
    };
  });
}

describe('width noise', () => {
  const sigOf = (c: { polys: number[][][] }) =>
    JSON.stringify(c.polys.map((p) => p.map((v) => v.map((n) => Math.round(n * 1e6)))));

  it('draws exactly story 2 at 0, for any scale or join, including jitter', () => {
    for (const orientation of ['pointy', 'flat'] as const) {
      for (const extra of [
        {},
        { misregistration: 5, cornerJitter: 3, seed: 's' },
        { lineStyle: 'dashed' as const, cornerJitter: 4 },
      ]) {
        const a = recorder();
        const b = recorder();
        HexgridAdapter.drawMain?.(a, state({ orientation, ...extra }), env());
        HexgridAdapter.drawMain?.(
          b,
          state({ orientation, ...extra, widthNoise: 0, noiseScale: 5, joinCorners: false }),
          env(),
        );
        expect(JSON.stringify(b.strokes)).toBe(JSON.stringify(a.strokes));
        expect(b.stroke).toHaveBeenCalledTimes(a.stroke.mock.calls.length);
      }
    }
  });

  it('draws one fill and no stroke, with the stroke colour', () => {
    const c = ink({ widthNoise: 0.7, color: '#123456', alpha: 0.5 });
    expect(c.fill).toHaveBeenCalledTimes(1);
    expect(c.stroke).not.toHaveBeenCalled();
    expect((c as unknown as { fillStyle: string }).fillStyle).toBe('#123456');
    expect(c.globalAlpha).toBe(0.5);
  });

  it('draws one outline per edge, each edge once', () => {
    const plain = allEdges(
      (() => {
        const r = recorder();
        HexgridAdapter.drawMain?.(r, state(), env());
        return r;
      })(),
    );
    expect(ink({ widthNoise: 1 }).polys.length).toBe(plain.length);
  });

  it('keeps every width between a floor and double, and reaches both ends of that range', () => {
    const w0 = 2;
    const c = ink({ widthNoise: 1, lineWidth: w0, size: 20 }, env(600, 500));
    const widths = ends(c, { lineWidth: w0, size: 20 }, env(600, 500)).flatMap((e) => [
      e.ha * 2,
      e.hb * 2,
    ]);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(w0 * 0.05 - 1e-9);
    expect(Math.max(...widths)).toBeLessThanOrEqual(w0 * 2 + 1e-9);
    expect(Math.min(...widths)).toBeLessThan(w0 * 0.6);
    expect(Math.max(...widths)).toBeGreaterThan(w0 * 1.4);
    // a thin line never breaks: every outline has width at all samples
    for (const poly of c.polys) expect(poly.every((p) => p.every(Number.isFinite))).toBe(true);
  });

  it('is deterministic, and a different seed or amount gives different ink', () => {
    const o = { widthNoise: 0.8, seed: 'a' };
    expect(sigOf(ink(o))).toBe(sigOf(ink(o)));
    expect(sigOf(ink(o))).not.toBe(sigOf(ink({ ...o, seed: 'b' })));
    expect(sigOf(ink(o))).not.toBe(sigOf(ink({ ...o, widthNoise: 0.4 })));
    expect(sigOf(ink(o))).not.toBe(sigOf(ink({ ...o, noiseScale: 60 })));
  });

  it('with join on, every edge meeting at a corner has the same width there', () => {
    for (const over of [{}, { cornerJitter: 3, misregistration: 4, seed: 'q' }]) {
      const o = { widthNoise: 1, lineWidth: 3, ...over };
      const c = ink(o, env(300, 240));
      const widths = new Map<string, number[]>();
      const count = new Map<string, number>();
      for (const e of ends(c, o, env(300, 240))) {
        // the corner as it is drawn: the jittered, shifted point, which is the plain end
        // plus the same move for every edge, so key on the plain point
        for (const [p, h] of [
          [e.a, e.ha],
          [e.b, e.hb],
        ] as const) {
          const k = `${p![0]!.toFixed(2)},${p![1]!.toFixed(2)}`;
          (widths.get(k) ?? widths.set(k, []).get(k)!).push(h);
          count.set(k, (count.get(k) ?? 0) + 1);
        }
      }
      let shared = 0;
      for (const [k, hs] of widths) {
        if (hs.length < 2) continue;
        shared++;
        for (const h of hs) expect(h, k).toBeCloseTo(hs[0]!, 9);
      }
      expect(shared).toBeGreaterThan(20);
    }
  });

  it('with join off, edges meeting at a corner differ in width there', () => {
    const o = { widthNoise: 1, lineWidth: 3, joinCorners: false };
    const c = ink(o, env(300, 240));
    const widths = new Map<string, number[]>();
    for (const e of ends(c, o, env(300, 240))) {
      for (const [p, h] of [
        [e.a, e.ha],
        [e.b, e.hb],
      ] as const) {
        const k = `${p![0]!.toFixed(2)},${p![1]!.toFixed(2)}`;
        (widths.get(k) ?? widths.set(k, []).get(k)!).push(h);
      }
    }
    let differ = 0;
    let total = 0;
    for (const hs of widths.values()) {
      if (hs.length < 2) continue;
      total++;
      if (Math.abs(hs[0]! - hs[1]!) > 1e-6) differ++;
    }
    expect(total).toBeGreaterThan(20);
    expect(differ / total).toBeGreaterThan(0.8);
  });

  it('draws only solid lines this way; dashed and dotted draw as before', () => {
    for (const lineStyle of ['dashed', 'dotted', 'dash-dot'] as const) {
      const c = ink({ lineStyle, widthNoise: 1 });
      expect(c.fill).not.toHaveBeenCalled();
      expect(c.stroke).toHaveBeenCalled();
    }
  });

  it('shares the misregistration: the ink pattern travels with the grid', () => {
    const o = { widthNoise: 1, seed: 'm', lineWidth: 3 };
    const plain = ends(ink(o), o);
    const moved = ends(ink({ ...o, misregistration: 6 }), { ...o, misregistration: 6 });
    plain.forEach((e, i) => {
      expect(moved[i]!.ha).toBeCloseTo(e.ha, 9);
      expect(moved[i]!.hb).toBeCloseTo(e.hb, 9);
    });
  });

  it('puts a lattice corner at the same width when the paper is resized or panned', () => {
    const r = 20;
    const dx = r * Math.sqrt(3) * 2;
    const o = { widthNoise: 1, lineWidth: 3, seed: 'x', cornerJitter: 3 };
    const widthsAt = (e: ReturnType<typeof env>, shift: number) => {
      const m = new Map<string, number>();
      for (const x of ends(ink(o, e), o, e)) {
        m.set(`${(x.a![0]! + shift).toFixed(2)},${x.a![1]!.toFixed(2)}`, x.ha);
      }
      return m;
    };
    const a = widthsAt(env(120, 100), dx);
    const b = widthsAt(env(120 + 2 * dx, 100), 0);
    let matched = 0;
    for (const [k, h] of a) {
      if (b.has(k)) {
        expect(b.get(k)!, k).toBeCloseTo(h, 6);
        matched++;
      }
    }
    expect(matched).toBeGreaterThan(5);
  });

  it('a pan is a different camera, not different ink', () => {
    const o = { widthNoise: 0.9 };
    const a = ink(o, env());
    const panned = { ...env(), camera: { x: 300, y: -40, zoom: 2.5 }, zoom: 2.5 };
    expect(sigOf(ink(o, panned))).toBe(sigOf(a));
  });
});

describe('hexgrid invalidation key, story 3', () => {
  it('changes with width noise, noise scale and join corners', () => {
    const base = state();
    const k = HexgridAdapter.getInvalidationKey(base);
    expect(HexgridAdapter.getInvalidationKey({ ...base, widthNoise: 0.5 })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, noiseScale: 40 })).not.toEqual(k);
    expect(HexgridAdapter.getInvalidationKey({ ...base, joinCorners: false })).not.toEqual(k);
  });
});

describe('width noise timing', () => {
  /** A mock context that does the work of a path without a canvas behind it. */
  const timed = (w: number, h: number, over: Partial<HexgridState>) => {
    const nop = () => {};
    const c = {
      save: nop,
      restore: nop,
      beginPath: nop,
      moveTo: nop,
      lineTo: nop,
      closePath: nop,
      fill: nop,
      stroke: nop,
      setLineDash: nop,
      lineDashOffset: 0,
      lineCap: 'butt',
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    const e = env(w, h);
    const t = performance.now();
    HexgridAdapter.drawMain?.(c, state(over), e);
    return performance.now() - t;
  };
  it('reports geometry-only times (no canvas in the test runner)', () => {
    const rows: string[] = [];
    for (const [w, h, size] of [
      [1600, 1000, 24],
      [4000, 3000, 8],
    ] as const) {
      timed(w, h, { size }); // warm up
      const best = (over: Partial<HexgridState>) =>
        Math.min(...Array.from({ length: 5 }, () => timed(w, h, { size, ...over })));
      const solid = best({});
      const on = best({ widthNoise: 1, joinCorners: true });
      const off = best({ widthNoise: 1, joinCorners: false });
      const jit = best({ widthNoise: 1, cornerJitter: 4, misregistration: 4 });
      rows.push(
        `${w}x${h} size ${size}: solid ${solid.toFixed(1)} ms, width noise join ${on.toFixed(1)} ms, no join ${off.toFixed(1)} ms, with jitter ${jit.toFixed(1)} ms`,
      );
    }
    console.info(rows.join('\n'));
    expect(rows.length).toBe(2);
  });
});
