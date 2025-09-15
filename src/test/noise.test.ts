import { describe, it, expect } from "vitest";
import { createPerlinNoise } from "../lib/noise";

describe("Perlin noise (seeded)", () => {
  it("is deterministic per seed (1D)", () => {
    const n1 = createPerlinNoise("seedX");
    const n2 = createPerlinNoise("seedX");
    const xs = [0.0, 0.1, 0.5, 1.2, 3.7, 10.01];
    const a = xs.map((x) => n1.noise1D(x));
    const b = xs.map((x) => n2.noise1D(x));
    expect(b).toEqual(a);
  });

  it("is deterministic per seed (2D)", () => {
    const n1 = createPerlinNoise(1337);
    const n2 = createPerlinNoise(1337);
    const pts: [number, number][] = [
      [0, 0],
      [0.25, 0.5],
      [1.1, 2.3],
      [5.5, 6.75],
      [10.0, 10.0],
    ];
    const a = pts.map(([x, y]) => n1.noise2D(x, y));
    const b = pts.map(([x, y]) => n2.noise2D(x, y));
    expect(b).toEqual(a);
  });

  it("normalized outputs are in [0,1]", () => {
    const n = createPerlinNoise("rng");
    const vals = [
      n.normalized1D(0.2),
      n.normalized2D(1.2, 3.4),
      n.normalized3D(0.1, 0.2, 0.3),
    ];
    expect(vals.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it("different seeds produce different fields (likely)", () => {
    const a = createPerlinNoise("A");
    const b = createPerlinNoise("B");
    // Sample a small grid and compare sums; not strictly guaranteed but very likely
    const sample = (n: ReturnType<typeof createPerlinNoise>) => {
      let s = 0;
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) s += n.noise2D(i * 0.3, j * 0.3);
      return s;
    };
    const sa = sample(a);
    const sb = sample(b);
    expect(Math.abs(sa - sb)).toBeGreaterThan(1e-6);
  });
});
