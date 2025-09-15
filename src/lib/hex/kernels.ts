import type { Axial } from "./types";
import { axialToCube, cubeToAxial, distance } from "./coords";

export function ring(center: Axial, radius: number): Axial[] {
  if (radius <= 0) return [];
  const results: Axial[] = [];
  // start at (q + radius, r - 0)
  let cube = axialToCube({ q: center.q + radius, r: center.r });
  const dirs = [
    { x: 0, y: -1, z: +1 },
    { x: -1, y: 0, z: +1 },
    { x: -1, y: +1, z: 0 },
    { x: 0, y: +1, z: -1 },
    { x: +1, y: 0, z: -1 },
    { x: +1, y: -1, z: 0 },
  ];
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push(cubeToAxial(cube));
      cube = {
        x: cube.x + dirs[side].x,
        y: cube.y + dirs[side].y,
        z: cube.z + dirs[side].z,
      };
    }
  }
  return results;
}

export function range(center: Axial, radius: number): Axial[] {
  const results: Axial[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (
      let dr = Math.max(-radius, -dq - radius);
      dr <= Math.min(radius, -dq + radius);
      dr++
    ) {
      results.push({ q: center.q + dq, r: center.r + dr });
    }
  }
  return results;
}

export function line(a: Axial, b: Axial): Axial[] {
  const N = distance(a, b);
  const results: Axial[] = [];
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  for (let i = 0; i <= N; i++) {
    const t = N === 0 ? 0 : i / N;
    const x = ac.x + (bc.x - ac.x) * t;
    const y = ac.y + (bc.y - ac.y) * t;
    const z = ac.z + (bc.z - ac.z) * t;
    // cube rounding
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);
    let fx = rx,
      fy = ry,
      fz = rz;
    if (xDiff > yDiff && xDiff > zDiff) fx = -fy - fz;
    else if (yDiff > zDiff) fy = -fx - fz;
    else fz = -fx - fy;
    // normalize -0 to 0 for stable equality semantics
    const q = fx === 0 ? 0 : fx;
    const r = fz === 0 ? 0 : fz;
    results.push({ q, r });
  }
  return results;
}
