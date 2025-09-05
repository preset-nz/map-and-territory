import { describe, it, expect } from "vitest";
import {
  neighbors,
  diagonals,
  ring,
  range,
  line,
  distance,
  axialToOffset,
  offsetToAxial,
} from "@/lib/hex";

describe("hex lib advanced", () => {
  it("neighbors returns 6 adjacent hexes", () => {
    const ns = neighbors({ q: 0, r: 0 });
    expect(ns).toHaveLength(6);
    // distances are 1
    for (const h of ns) expect(distance(h, { q: 0, r: 0 })).toBe(1);
  });

  it("diagonals returns 6 cells at distance 2", () => {
    const ds = diagonals({ q: 0, r: 0 });
    expect(ds).toHaveLength(6);
    for (const h of ds) expect(distance(h, { q: 0, r: 0 })).toBe(2);
  });

  it("ring size is 6r for r>0", () => {
    expect(ring({ q: 0, r: 0 }, 1)).toHaveLength(6);
    expect(ring({ q: 0, r: 0 }, 2)).toHaveLength(12);
    expect(ring({ q: 0, r: 0 }, 3)).toHaveLength(18);
  });

  it("range size follows 1 + 3r(r+1)", () => {
    const count = (r: number) => 1 + 3 * r * (r + 1);
    for (let r = 0; r <= 4; r++) {
      expect(range({ q: 0, r: 0 }, r)).toHaveLength(count(r));
    }
  });

  it("line endpoints and step counts are correct", () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -3 };
    const path = line(a, b);
    expect(path[0]).toEqual(a);
    expect(path[path.length - 1]).toEqual(b);
    expect(path.length).toBe(distance(a, b) + 1);
    // consecutive steps are neighbors (distance 1)
    for (let i = 1; i < path.length; i++) {
      expect(distance(path[i - 1], path[i])).toBe(1);
    }
  });

  it("line handles zero-length (a==b)", () => {
    const a = { q: 2, r: -1 };
    const path = line(a, a);
    expect(path).toEqual([a]);
  });

  it("ring returns empty for radius <= 0", () => {
    expect(ring({ q: 0, r: 0 }, 0)).toEqual([]);
    expect(ring({ q: 0, r: 0 }, -1)).toEqual([]);
  });

  it("offset roundtrip for odd-r and even-r", () => {
    const variants = ["odd-r", "even-r"] as const;
    for (const v of variants) {
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          const a = { q, r };
          const off = axialToOffset(a, "pointy", v);
          const back = offsetToAxial(off, "pointy", v);
          expect(back).toEqual(a);
        }
      }
    }
  });

  it("offset roundtrip for odd-q and even-q", () => {
    const variants = ["odd-q", "even-q"] as const;
    for (const v of variants) {
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          const a = { q, r };
          const off = axialToOffset(a, "flat", v);
          const back = offsetToAxial(off, "flat", v);
          expect(back).toEqual(a);
        }
      }
    }
  });
});
