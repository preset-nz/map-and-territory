# Deterministic Random and Noise Utilities

## Context

The platform needs testable, deterministic random and noise functions that are stable across runs and environments. These utilities underpin procedural content (e.g., terrain/fog generation) and must guarantee reproducibility from a given `seed` while remaining simple and easy to validate.

## Decision

- Provide `src/lib/random.ts` exporting `createRNG(seed)` returning an object with `float()`, `int(min,max)`, `bool(p)`, and `shuffle(arr)`.
- Implement RNG with a seeded `sfc32` PRNG, seeded via `splitmix32` from a small xFNV-1a string/number hash to ensure stable 32-bit seeds.
- Provide `src/lib/noise.ts` exporting `createPerlinNoise(seed)` with `noise1D`, `noise2D`, `noise3D` in `[-1,1]` and convenience `normalized*` in `[0,1]`.
- Implement Perlin-like gradient noise with a permutation table deterministically shuffled by the seeded RNG, ensuring reproducible fields.
- Add Vitest unit tests asserting determinism and output ranges; snapshot-like checks validate stability without overconstraining the algorithm.

## Rationale

- Determinism: Seeded PRNG + seeded permutation table ensure identical outputs for the same inputs.
- Simplicity: `sfc32` and classic Perlin are compact, performant, and easy to review; sufficient for MVP use cases.
- Stability: Tests compare repeated seeded runs; a few exact expectations reduce regression risk while tolerating numeric noise via close comparisons when needed.
- Extensibility: Future variants (e.g., Simplex/OpenSimplex, FBM/octaves, domain warp) can build on the same seeded RNG and interface.

## Consequences

- Outputs are intentionally locked by tests to maintain stability; algorithm changes will require updating tests and a migration note if reproducibility matters to users.
- Classic Perlin has directional artifacts; acceptable for MVP. Upgrade path exists if artifacts become problematic.

## Validation

- Unit tests under `src/test/random.test.ts` and `src/test/noise.test.ts` cover:
  - Determinism for identical seeds
  - Difference across seeds (statistical / likely)
  - Bounds for normalized outputs
- Full test suite must pass per Testing Standards.

## Follow-ups

- Add FBM helpers (octaves, persistence, lacunarity) when needed.
- Consider `OpenSimplex2S` for better visual quality if artifacts surface.
- Document utility usage in developer guide if adopted by plugins/features.
