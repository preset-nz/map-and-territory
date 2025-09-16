import type { Axial, Layout, Point } from "@/lib/hex/types";
import { toPoint, corners } from "@/lib/hex/layout";

// Stable axial key for sparse maps
export function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function axialKeyFrom(a: Axial): string {
  return axialKey(a.q, a.r);
}

export function parseAxialKey(key: string): Axial {
  const [qs, rs] = key.split(",");
  const q = Number(qs);
  const r = Number(rs);
  if (!Number.isFinite(q) || !Number.isFinite(r)) {
    throw new Error(`Invalid axial key: ${key}`);
  }
  return { q, r };
}

// Center point for an axial hex given a layout
export function centerFor(ax: Axial, layout: Layout): Point {
  return toPoint(ax, layout);
}

// Build a hex path around a given center
export function hexPath(
  ctx: CanvasRenderingContext2D,
  center: Point,
  layout: Pick<Layout, "size" | "orientation">,
) {
  const pts = corners(center, { ...layout, origin: { x: 0, y: 0 } });
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

// Configuration for hex tiling generation
export interface HexTilingConfig {
  size: number;
  orientation: "pointy" | "flat";
  center: Point;
  bounds: { w: number; h: number };
  padding?: number; // extra hexes beyond bounds
}

// Position data for a single hex tile
export interface HexTilePosition {
  center: Point;
  axial: Axial; // for noise/data lookups
  gridCoords: { col: number; row: number }; // for offset calculations
}

// Iterator for hex positions in a region
export function* hexTiles(config: HexTilingConfig): Generator<HexTilePosition> {
  const { size, orientation, center, bounds, padding = 2 } = config;
  const r = size;
  const sqrt3 = Math.sqrt(3);

  if (orientation === "flat") {
    const colStep = 1.5 * r;
    const rowStep = sqrt3 * r;
    const cols = Math.ceil(bounds.w / colStep) + padding;
    const rows = Math.ceil(bounds.h / rowStep) + padding;

    const cmin = -Math.ceil(cols / 2);
    const cmax = Math.ceil(cols / 2);
    const rmin = -Math.ceil(rows / 2);
    const rmax = Math.ceil(rows / 2);

    for (let c = cmin; c <= cmax; c++) {
      const yOffset = c & 1 ? rowStep / 2 : 0;
      for (let rr = rmin; rr <= rmax; rr++) {
        const x = c * colStep + center.x;
        const y = rr * rowStep + yOffset + center.y;

        yield {
          center: { x, y },
          axial: { q: c, r: rr },
          gridCoords: { col: c, row: rr },
        };
      }
    }
  } else {
    // pointy orientation
    const colStep = sqrt3 * r;
    const rowStep = 1.5 * r;
    const cols = Math.ceil(bounds.w / colStep) + padding;
    const rows = Math.ceil(bounds.h / rowStep) + padding;

    const rmin = -Math.ceil(rows / 2);
    const rmax = Math.ceil(rows / 2);
    const cmin = -Math.ceil(cols / 2);
    const cmax = Math.ceil(cols / 2);

    for (let rr = rmin; rr <= rmax; rr++) {
      const xOffset = rr & 1 ? colStep / 2 : 0;
      for (let c = cmin; c <= cmax; c++) {
        const x = c * colStep + xOffset + center.x;
        const y = rr * rowStep + center.y;

        yield {
          center: { x, y },
          axial: { q: c, r: rr },
          gridCoords: { col: c, row: rr },
        };
      }
    }
  }
}

// Shared layout creation helper
export function createHexLayout(
  size: number,
  orientation: "pointy" | "flat",
): Pick<Layout, "size" | "orientation"> {
  return { size, orientation };
}
