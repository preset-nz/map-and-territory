// Barrel exports for public lib API
export { createRNG } from "./random";
export type { RNG, Seed } from "./random";

export { createPerlinNoise } from "./noise";
export type { PerlinNoise } from "./noise";

export { createOpenSimplexNoise } from "./open-simplex";
export type { OpenSimplexNoise } from "./open-simplex";

export { fit, fit01, lerp, clamp } from "./math";
