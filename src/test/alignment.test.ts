import { describe, it, expect } from "vitest";
import { HexgridAdapter, type HexgridState } from "@/layers/adapters/hexgrid";
import {
  HexNoiseAdapter,
  type HexNoiseState,
} from "@/layers/adapters/hex-noise";
import {
  FreeformAdapter,
  type FreeformState,
} from "@/layers/adapters/freeform-hex";
import type { RenderEnv } from "@/layers/types";

type Pt = { x: number; y: number };

class Mock2DContext implements Partial<CanvasRenderingContext2D> {
  public paths: Pt[][] = [];
  public current: Pt[] | null = null;
  public stroked: Pt[][] = [];
  public filled: Pt[][] = [];
  public globalAlpha = 1;
  public lineWidth = 1;

  public strokeStyle: any = "#000";

  public fillStyle: any = "#000";
  save() {}
  restore() {}
  beginPath() {
    this.current = [];
  }
  moveTo(x: number, y: number) {
    this.current?.push({ x, y });
  }
  lineTo(x: number, y: number) {
    this.current?.push({ x, y });
  }
  closePath() {}
  stroke() {
    if (this.current) {
      this.paths.push([...this.current]);
      this.stroked.push([...this.current]);
      this.current = null;
    }
  }
  fill() {
    if (this.current) {
      this.paths.push([...this.current]);
      this.filled.push([...this.current]);
      this.current = null;
    }
  }
}

function makeEnv(
  w: number,
  h: number,
  grid: { size: number; orientation: "pointy" | "flat" },
): RenderEnv {
  return {
    zoom: 1,
    pixelRatio: 1,
    size: { w, h },
    paperRect: { x: 0, y: 0, w, h },
    camera: { x: 0, y: 0, zoom: 1 },
    grid,
    palette: undefined,
  };
}

function centroid(points: Pt[]): Pt {
  const n = points.length || 1;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / n, y: sum.y / n };
}

function bbox(points: Pt[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function approx(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

function expectCenterHexPresent(
  paths: Pt[][],
  center: Pt,
  r: number,
  orientation: "pointy" | "flat",
) {
  const match = paths.find((poly) => {
    if (poly.length < 6) return false;
    const c = centroid(poly);
    return approx(c.x, center.x, 1e-3) && approx(c.y, center.y, 1e-3);
  });
  expect(match, "expected a hex centered at canvas center").toBeTruthy();
  if (!match) return;
  const bb = bbox(match);
  const sqrt3 = Math.sqrt(3);
  const expectedW = orientation === "pointy" ? sqrt3 * r : 2 * r;
  const expectedH = orientation === "pointy" ? 2 * r : sqrt3 * r;
  // Allow small tolerance due to float rounding in trig
  expect(Math.abs(bb.w - expectedW)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(bb.h - expectedH)).toBeLessThanOrEqual(0.01);
}

describe("Alignment with master grid", () => {
  const w = 240;
  const h = 200;
  const sizes = [12, 24] as const;
  const orientations: Array<"pointy" | "flat"> = ["pointy", "flat"];

  for (const r of sizes) {
    for (const orientation of orientations) {
      it(`HexgridAdapter draws center-aligned hex (r=${r}, ${orientation})`, () => {
        const ctx = new Mock2DContext();
        const env = makeEnv(w, h, { size: r, orientation });
        const state: HexgridState = {
          size: r,
          orientation,
          color: "#000",
          alpha: 1,
          lineWidth: 1,
        };
        HexgridAdapter.drawMain?.(
          ctx as unknown as CanvasRenderingContext2D,
          state,
          env,
        );
        expectCenterHexPresent(
          ctx.paths,
          { x: w / 2, y: h / 2 },
          r,
          orientation,
        );
      });

      it(`HexNoiseAdapter tiles aligned to grid (r=${r}, ${orientation})`, () => {
        const ctx = new Mock2DContext();
        const env = makeEnv(w, h, { size: r, orientation });
        const state: HexNoiseState = {
          seed: "seed",
          frequency: 0.15,
          offsetX: 0,
          offsetY: 0,
          intensity: 1,
          gamma: 1,
          min: 0,
          max: 1,
          mode: "shape",
          terrain: "plains",
          terrainId: undefined,
          paintColor: undefined,
        };
        HexNoiseAdapter.drawMain?.(
          ctx as unknown as CanvasRenderingContext2D,
          state,
          env,
        );
        expect(ctx.filled.length).toBeGreaterThan(0);
        expectCenterHexPresent(
          ctx.paths,
          { x: w / 2, y: h / 2 },
          r,
          orientation,
        );
      });

      it(`FreeformAdapter centers axial (0,0) at grid origin (r=${r}, ${orientation})`, () => {
        const ctx = new Mock2DContext();
        const env = makeEnv(w, h, { size: r, orientation });
        const state: FreeformState = {
          cells: { "0,0": { terrainId: "plains" } },
          opacity: 1,
          brushTerrainId: "plains",
          brushColor: undefined,
        };
        FreeformAdapter.drawMain?.(
          ctx as unknown as CanvasRenderingContext2D,
          state,
          env,
        );
        // Should have drawn exactly one filled hex
        expect(ctx.filled.length).toBe(1);
        expectCenterHexPresent(
          ctx.paths,
          { x: w / 2, y: h / 2 },
          r,
          orientation,
        );
      });
    }
  }
});
