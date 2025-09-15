// Seeded Perlin noise implementation (1D/2D/3D)
// Deterministic for a given seed across platforms.

import { createRNG, type Seed } from "./random";
import { fit01 } from "./math";

export interface PerlinNoise {
  noise1D: (x: number) => number; // in [-1, 1]
  noise2D: (x: number, y: number) => number; // in [-1, 1]
  noise3D: (x: number, y: number, z: number) => number; // in [-1, 1]
  // Convenience to get normalized [0,1]
  normalized1D: (x: number) => number;
  normalized2D: (x: number, y: number) => number;
  normalized3D: (x: number, y: number, z: number) => number;
}

function fade(t: number) {
  // 6t^5 - 15t^4 + 10t^3
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

function dot2(gx: number, gy: number, x: number, y: number) {
  return gx * x + gy * y;
}

function dot3(
  gx: number,
  gy: number,
  gz: number,
  x: number,
  y: number,
  z: number,
) {
  return gx * x + gy * y + gz * z;
}

function buildPermutation(seed: Seed): Uint8Array {
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  const rng = createRNG(seed);
  // Fisher-Yates shuffle for permutation table
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.float() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return new Uint8Array([...p, ...p]); // duplicate to avoid overflow checks
}

// Gradient directions for 2D and 3D
const grad2: ReadonlyArray<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, -Math.SQRT1_2],
];

const grad3: ReadonlyArray<[number, number, number]> = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

export function createPerlinNoise(seed: Seed): PerlinNoise {
  const perm = buildPermutation(seed);

  function noise1D(x: number): number {
    // Map to 2D with y=0 to reuse 2D implementation with gradients along x
    const X = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = fade(xf);
    const g0 = perm[X] % 2 === 0 ? 1 : -1; // gradient along x only
    const g1 = perm[X + 1] % 2 === 0 ? 1 : -1;
    const n0 = g0 * (xf - 0);
    const n1 = g1 * (xf - 1);
    return lerp(n0, n1, u); // already roughly in [-1,1]
  }

  function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[X] + Y;
    const ab = perm[X] + Y + 1;
    const ba = perm[X + 1] + Y;
    const bb = perm[X + 1] + Y + 1;

    const gAA = grad2[perm[aa] & 7];
    const gBA = grad2[perm[ba] & 7];
    const gAB = grad2[perm[ab] & 7];
    const gBB = grad2[perm[bb] & 7];

    const x1 = xf,
      y1 = yf;
    const x2 = xf - 1,
      y2 = yf;
    const x3 = xf,
      y3 = yf - 1;
    const x4 = xf - 1,
      y4 = yf - 1;

    const nAA = dot2(gAA[0], gAA[1], x1, y1);
    const nBA = dot2(gBA[0], gBA[1], x2, y2);
    const nAB = dot2(gAB[0], gAB[1], x3, y3);
    const nBB = dot2(gBB[0], gBB[1], x4, y4);

    const xLerp1 = lerp(nAA, nBA, u);
    const xLerp2 = lerp(nAB, nBB, u);
    const res = lerp(xLerp1, xLerp2, v);
    // Res is approximately in [-sqrt(2)/2, sqrt(2)/2]; keep as-is in [-1,1]
    return res;
  }

  function noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const A = perm[X] + Y;
    const B = perm[X + 1] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;

    const gAA = grad3[perm[AA] % 12];
    const gBA = grad3[perm[BA] % 12];
    const gAB = grad3[perm[AB] % 12];
    const gBB = grad3[perm[BB] % 12];
    const gAA1 = grad3[perm[AA + 1] % 12];
    const gBA1 = grad3[perm[BA + 1] % 12];
    const gAB1 = grad3[perm[AB + 1] % 12];
    const gBB1 = grad3[perm[BB + 1] % 12];

    const n000 = dot3(gAA[0], gAA[1], gAA[2], xf, yf, zf);
    const n100 = dot3(gBA[0], gBA[1], gBA[2], xf - 1, yf, zf);
    const n010 = dot3(gAB[0], gAB[1], gAB[2], xf, yf - 1, zf);
    const n110 = dot3(gBB[0], gBB[1], gBB[2], xf - 1, yf - 1, zf);
    const n001 = dot3(gAA1[0], gAA1[1], gAA1[2], xf, yf, zf - 1);
    const n101 = dot3(gBA1[0], gBA1[1], gBA1[2], xf - 1, yf, zf - 1);
    const n011 = dot3(gAB1[0], gAB1[1], gAB1[2], xf, yf - 1, zf - 1);
    const n111 = dot3(gBB1[0], gBB1[1], gBB1[2], xf - 1, yf - 1, zf - 1);

    const nx00 = lerp(n000, n100, u);
    const nx10 = lerp(n010, n110, u);
    const nx01 = lerp(n001, n101, u);
    const nx11 = lerp(n011, n111, u);

    const nxy0 = lerp(nx00, nx10, v);
    const nxy1 = lerp(nx01, nx11, v);

    const res = lerp(nxy0, nxy1, w);
    return res;
  }

  function normalized1D(x: number): number {
    return fit01(noise1D(x));
  }
  function normalized2D(x: number, y: number): number {
    return fit01(noise2D(x, y));
  }
  function normalized3D(x: number, y: number, z: number): number {
    return fit01(noise3D(x, y, z));
  }

  return {
    noise1D,
    noise2D,
    noise3D,
    normalized1D,
    normalized2D,
    normalized3D,
  };
}

export default createPerlinNoise;
