import type { Axial, Layout, Point } from './types';
import { axialToCube, round } from './coords';

const SQRT3 = Math.sqrt(3);

// Axial -> pixel center
export function toPoint(h: Axial, layout: Layout): Point {
  const { size, origin, orientation } = layout;
  if (orientation === 'pointy') {
    const x = size * (SQRT3 * (h.q + h.r / 2));
    const y = size * (1.5 * h.r);
    return { x: origin.x + x, y: origin.y + y };
  } else {
    // flat-top
    const x = size * (1.5 * h.q);
    const y = size * (SQRT3 * (h.r + h.q / 2));
    return { x: origin.x + x, y: origin.y + y };
  }
}

// Pixel -> axial using orientation-specific inverse, with cube rounding
export function fromPoint(p: Point, layout: Layout): Axial {
  const { size, origin, orientation } = layout;
  const px = p.x - origin.x;
  const py = p.y - origin.y;
  if (orientation === 'pointy') {
    const q = (SQRT3 / 3 * px - 1 / 3 * py) / size;
    const r = (2 / 3 * py) / size;
    return round({ x: q, y: -q - r, z: r });
  } else {
    const q = (2 / 3 * px) / size;
    const r = (-1 / 3 * px + SQRT3 / 3 * py) / size;
    return round({ x: q, y: -q - r, z: r });
  }
}

// Optional: polygon corners around center point (not required in MVP)
export function corners(center: Point, layout: Layout): Point[] {
  const { size, orientation } = layout;
  const start = orientation === 'pointy' ? -Math.PI / 6 : 0;
  const pts: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = start + i * (Math.PI / 3);
    pts.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) });
  }
  return pts;
}

