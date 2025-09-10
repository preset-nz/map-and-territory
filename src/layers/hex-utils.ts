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
