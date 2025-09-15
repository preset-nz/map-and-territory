import type { Axial, Cube } from "./types";

// Axial <-> Cube conversions
export function axialToCube(a: Axial): Cube {
  const x = a.q;
  const z = a.r;
  const y = -x - z;
  return { x, y, z };
}

export function cubeToAxial(c: Cube): Axial {
  return { q: c.x, r: c.z };
}

// Round a fractional cube coordinate to the nearest axial coordinate
export function round(frac: Cube): Axial {
  let rx = Math.round(frac.x);
  let ry = Math.round(frac.y);
  let rz = Math.round(frac.z);

  const xDiff = Math.abs(rx - frac.x);
  const yDiff = Math.abs(ry - frac.y);
  const zDiff = Math.abs(rz - frac.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return cubeToAxial({ x: rx, y: ry, z: rz });
}

export function distance(a: Axial, b: Axial): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (
    (Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y) + Math.abs(ac.z - bc.z)) / 2
  );
}

// Neighbor directions for axial coords (pointy and flat share these axial deltas)
const DIRS: Axial[] = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

export function neighbors(h: Axial): Axial[] {
  return DIRS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}

// Diagonals (optional utility)
const DIAGS: Axial[] = [
  { q: +2, r: -1 },
  { q: +1, r: -2 },
  { q: -1, r: -1 },
  { q: -2, r: +1 },
  { q: -1, r: +2 },
  { q: +1, r: +1 },
];

export function diagonals(h: Axial): Axial[] {
  return DIAGS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}
