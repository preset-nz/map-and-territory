import { neighbors } from "@/lib/hex/coords";
import { toPoint, corners, fromPoint } from "@/lib/hex/layout";
import type { Layout, Point } from "@/lib/hex";
import type { OutlineCorner, OutlineCornerIndex } from "@/lib/outline/types";
import { cornersEqual } from "@/lib/outline/types";

const DEFAULT_TOLERANCE = 14;

export function cornerPoint(corner: OutlineCorner, layout: Layout): Point {
  const center = toPoint(corner.hex, layout);
  const pts = corners(center, layout);
  return pts[corner.corner]!;
}

export function findNearestCorner(
  point: Point,
  layout: Layout,
  tolerance: number = DEFAULT_TOLERANCE,
): OutlineCorner | null {
  const baseHex = fromPoint(point, layout);
  const candidates = [baseHex, ...neighbors(baseHex)];
  let best: { corner: OutlineCorner; distance: number } | null = null;

  for (const hex of candidates) {
    const pts = corners(toPoint(hex, layout), layout);
    for (let i = 0; i < pts.length; i++) {
      const target = pts[i]!;
      const dx = point.x - target.x;
      const dy = point.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tolerance && (!best || dist < best.distance)) {
        best = {
          corner: { hex, corner: i as OutlineCornerIndex },
          distance: dist,
        };
      }
    }
  }

  return best?.corner ?? null;
}

function cornerKey(corner: OutlineCorner): string {
  return `${corner.hex.q},${corner.hex.r},${corner.corner}`;
}

function samePointCorners(
  corner: OutlineCorner,
  layout: Layout,
): OutlineCorner[] {
  const point = cornerPoint(corner, layout);
  const eps = layout.size * 0.001;
  const results: OutlineCorner[] = [];
  for (const neighbor of neighbors(corner.hex)) {
    const pts = corners(toPoint(neighbor, layout), layout);
    for (let i = 0; i < pts.length; i++) {
      const target = pts[i]!;
      const dx = point.x - target.x;
      const dy = point.y - target.y;
      if (Math.sqrt(dx * dx + dy * dy) <= eps) {
        results.push({ hex: neighbor, corner: i as OutlineCornerIndex });
      }
    }
  }
  return results;
}

function adjacentCorners(
  corner: OutlineCorner,
  layout: Layout,
): OutlineCorner[] {
  const neighborsList: OutlineCorner[] = [];
  neighborsList.push({
    hex: corner.hex,
    corner: ((corner.corner + 1) % 6) as OutlineCornerIndex,
  });
  neighborsList.push({
    hex: corner.hex,
    corner: ((corner.corner + 5) % 6) as OutlineCornerIndex,
  });
  neighborsList.push(...samePointCorners(corner, layout));
  return neighborsList;
}

export function shortestCornerPath(
  from: OutlineCorner,
  to: OutlineCorner,
  layout: Layout,
): OutlineCorner[] {
  if (cornersEqual(from, to)) return [];
  const queue: OutlineCorner[] = [from];
  const visited = new Set<string>([cornerKey(from)]);
  const parents = new Map<string, OutlineCorner>();

  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacentCorners(current, layout)) {
      const key = cornerKey(next);
      if (visited.has(key)) continue;
      visited.add(key);
      parents.set(key, current);
      if (cornersEqual(next, to)) {
        const path: OutlineCorner[] = [];
        let cursor: OutlineCorner | undefined = next;
        while (cursor && !cornersEqual(cursor, from)) {
          path.push(cursor);
          const prev = parents.get(cornerKey(cursor));
          cursor = prev;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return [to];
}

export function interpolateCorners(
  from: OutlineCorner | null,
  to: OutlineCorner,
  layout: Layout,
): OutlineCorner[] {
  if (!from) return [to];
  return shortestCornerPath(from, to, layout);
}
