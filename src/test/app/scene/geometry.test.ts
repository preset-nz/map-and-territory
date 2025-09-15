import { describe, it, expect } from "vitest";
import { computePaperRect } from "@/app/scene/geometry";

describe("computePaperRect", () => {
  it("maintains 16:10 aspect within canvas bounds", () => {
    const rect = computePaperRect({
      canvasSize: { w: 1200, h: 800 },
      paper: { aspect: "16:10" },
    });
    expect(rect.w).toBeCloseTo(1080);
    expect(rect.h).toBeCloseTo(675);
    expect(rect.x).toBeCloseTo(60);
    expect(rect.y).toBeCloseTo(12);
    expect((rect.w / rect.h).toFixed(2)).toBe("1.60");
  });

  it("centers square aspect when height constrains layout", () => {
    const rect = computePaperRect({
      canvasSize: { w: 1200, h: 800 },
      paper: { aspect: "square" },
    });
    expect(rect.w).toBeCloseTo(rect.h);
    expect(rect.w).toBeCloseTo(776);
    expect(rect.x).toBeCloseTo(212);
    expect(rect.y).toBeCloseTo(12);
  });

  it("handles tiny canvases without negative sizes", () => {
    const rect = computePaperRect({
      canvasSize: { w: 100, h: 80 },
      paper: { aspect: "4:3" },
    });
    expect(rect.w).toBeGreaterThanOrEqual(0);
    expect(rect.h).toBeGreaterThanOrEqual(0);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });
});
