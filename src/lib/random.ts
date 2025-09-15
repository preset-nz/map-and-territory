// Deterministic RNG utilities
// Stable across platforms and runs for the same seed.

export type Seed = number | string;

export interface RNG {
  // Returns next float in [0, 1)
  float(): number;
  // Returns integer in [min, max] inclusive
  int(min: number, max: number): number;
  // Returns boolean, true with probability p
  bool(p?: number): boolean;
  // Shuffle array in-place deterministically, returns same reference
  shuffle<T>(arr: T[]): T[];
}

// Simple 32-bit hash for string/number seeds -> 32-bit unsigned int
function xfnv1a(str: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return h >>> 0;
  };
}

// splitmix32 to expand one seed into multiple 32-bit seeds
function splitmix32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
    t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
    t = (t ^ (t >>> 16)) >>> 0;
    return t;
  };
}

// sfc32 PRNG, good quality and fast, deterministic in JS
function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed: Seed): [number, number, number, number] {
  const seedStr = typeof seed === "string" ? seed : String(seed >>> 0);
  const hash = xfnv1a(seedStr);
  const base = splitmix32(hash());
  return [base(), base(), base(), base()];
}

export function createRNG(seed: Seed): RNG {
  const [a, b, c, d] = normalizeSeed(seed);
  const rand = sfc32(a, b, c, d);

  function float(): number {
    return rand();
  }
  function int(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error("int(min,max): min and max must be finite numbers");
    }
    if (Math.floor(min) !== min || Math.floor(max) !== max) {
      throw new Error("int(min,max): min and max must be integers");
    }
    if (max < min) {
      throw new Error("int(min,max): max must be >= min");
    }
    const span = max - min + 1;
    return min + Math.floor(rand() * span);
  }
  function bool(p = 0.5): boolean {
    if (!(p >= 0 && p <= 1)) throw new Error("bool(p): p must be in [0,1]");
    return rand() < p;
  }
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  return { float, int, bool, shuffle };
}

export default createRNG;
