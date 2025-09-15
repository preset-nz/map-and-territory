import { describe, it, expect } from "vitest";
import { createOpenSimplexNoise } from "../lib/open-simplex";

describe("OpenSimplex-like noise (seeded)", () => {
  it("is deterministic per seed (2D)", () => {
    const a = createOpenSimplexNoise("seed-os");
    const b = createOpenSimplexNoise("seed-os");
    const pts: [number, number][] = [
      [0, 0],
      [0.1, 0.2],
      [1.25, 2.5],
      [3.33, 4.44],
      [10, 10],
    ];
    const va = pts.map(([x, y]) => a.noise2D(x, y));
    const vb = pts.map(([x, y]) => b.noise2D(x, y));
    expect(vb).toEqual(va);
  });

  it("is deterministic per seed (3D)", () => {
    const a = createOpenSimplexNoise(12345);
    const b = createOpenSimplexNoise(12345);
    const pts: [number, number, number][] = [
      [0, 0, 0],
      [0.1, 0.2, 0.3],
      [1.1, 2.2, 3.3],
    ];
    const va = pts.map(([x, y, z]) => a.noise3D(x, y, z));
    const vb = pts.map(([x, y, z]) => b.noise3D(x, y, z));
    expect(vb).toEqual(va);
  });

  it("normalized outputs lie in [0,1]", () => {
    const n = createOpenSimplexNoise("rng");
    const v2 = n.normalized2D(1.2, 3.4);
    const v3 = n.normalized3D(0.1, 0.2, 0.3);
    expect(v2).toBeGreaterThanOrEqual(0);
    expect(v2).toBeLessThanOrEqual(1);
    expect(v3).toBeGreaterThanOrEqual(0);
    expect(v3).toBeLessThanOrEqual(1);
  });

  it("different seeds likely produce different fields", () => {
    const a = createOpenSimplexNoise("A");
    const b = createOpenSimplexNoise("B");
    let sa = 0,
      sb = 0;
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) sa += a.noise2D(i * 0.2, j * 0.2);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) sb += b.noise2D(i * 0.2, j * 0.2);
    expect(Math.abs(sa - sb)).toBeGreaterThan(1e-6);
  });
});
