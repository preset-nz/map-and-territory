import { describe, it, expect } from "vitest";
import { toPoint, fromPoint, corners } from "@/lib/hex";

describe("hex lib coverage additions", () => {
  it("round-trips with non-zero origin for both orientations", () => {
    const pointy = {
      orientation: "pointy" as const,
      size: 30,
      origin: { x: 100, y: 50 },
    };
    const flat = {
      orientation: "flat" as const,
      size: 30,
      origin: { x: -120, y: 75 },
    };
    const h1 = { q: 3, r: -2 };
    const p1 = toPoint(h1, pointy);
    const back1 = fromPoint(p1, pointy);
    expect(back1).toEqual(h1);

    const h2 = { q: -4, r: 5 };
    const p2 = toPoint(h2, flat);
    const back2 = fromPoint(p2, flat);
    expect(back2).toEqual(h2);
  });

  it("computes 6 corners around center for both orientations", () => {
    const center = { x: 10, y: 20 };
    const pointy = {
      orientation: "pointy" as const,
      size: 24,
      origin: { x: 0, y: 0 },
    };
    const flat = {
      orientation: "flat" as const,
      size: 24,
      origin: { x: 0, y: 0 },
    };
    const c1 = corners(center, pointy);
    const c2 = corners(center, flat);
    expect(c1).toHaveLength(6);
    expect(c2).toHaveLength(6);
    // sanity: all points are finite numbers
    for (const p of [...c1, ...c2]) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
