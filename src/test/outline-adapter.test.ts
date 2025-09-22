import { describe, it, expect } from "vitest";
import { OutlineAdapter } from "@/layers/adapters/outline";
import type { OutlineState } from "@/lib/outline/types";
import type { RenderEnv } from "@/layers/types";

class MockContext implements Partial<CanvasRenderingContext2D> {
  public moves: Array<[number, number]> = [];
  public lines: Array<[number, number]> = [];
  public beginCount = 0;
  public strokeCount = 0;
  public saveCount = 0;
  public restoreCount = 0;
  public globalAlpha = 1;
  public strokeStyle: string | CanvasGradient | CanvasPattern = "#000";
  public lineWidth = 1;
  public lineJoin: CanvasLineJoin = "miter";
  public lineCap: CanvasLineCap = "butt";
  public dash: number[] = [];

  beginPath() {
    this.beginCount++;
  }
  moveTo(x: number, y: number) {
    this.moves.push([x, y]);
  }
  lineTo(x: number, y: number) {
    this.lines.push([x, y]);
  }
  closePath() {
    // no-op for test
  }
  stroke() {
    this.strokeCount++;
  }
  save() {
    this.saveCount++;
  }
  restore() {
    this.restoreCount++;
  }

  setLineDash(segments: number[]) {
    this.dash = segments.slice();
  }
}

const env: RenderEnv = {
  zoom: 1,
  pixelRatio: 1,
  size: { w: 400, h: 400 },
  paperRect: { x: 0, y: 0, w: 400, h: 400 },
  camera: { x: 0, y: 0, zoom: 1 },
  grid: { size: 16, orientation: "pointy" },
};

describe("OutlineAdapter", () => {
  it("strokes paths for at least two corners", () => {
    const ctx = new MockContext();
    const state: OutlineState = {
      paths: [
        {
          id: "p1",
          closed: false,
          corners: [
            { hex: { q: 0, r: 0 }, corner: 0 },
            { hex: { q: 0, r: 0 }, corner: 1 },
            { hex: { q: 1, r: 0 }, corner: 2 },
          ],
        },
      ],
      activePathId: null,
      opacity: 0.8,
      strokeColor: "#112233",
      strokeWidth: 3,
      strokePattern: "solid",
      roughness: 0,
      hoverCorner: null,
    };

    OutlineAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    expect(ctx.saveCount).toBeGreaterThan(0);
    expect(ctx.beginCount).toBe(1);
    expect(ctx.moves.length).toBe(1);
    expect(ctx.lines.length).toBe(2);
    expect(ctx.strokeCount).toBe(1);
    expect(ctx.strokeStyle).toBe("#112233");
    expect(ctx.lineWidth).toBe(3);
    expect(ctx.globalAlpha).toBeCloseTo(0.8);
    expect(ctx.dash.length).toBe(0);
  });
});
