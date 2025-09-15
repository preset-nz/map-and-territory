# OpenSimplex2S Choice and Interim Implementation

## Context

We need seeded, deterministic gradient noise with better isotropy than grid Perlin for procedural content. OpenSimplex2S is a modern, patent‑free variant with strong visual characteristics and is widely recommended for new work.

## Decision

- Adopt the `createOpenSimplexNoise(seed)` API alongside Perlin to provide OpenSimplex‑style noise.
- Target algorithm: OpenSimplex2S for superior isotropy and aesthetics.
- Interim implementation: classic Simplex noise (Gustavson) with a seeded permutation table for determinism; exposed via the OpenSimplex API for now to unblock use cases.
- Keep interfaces stable to allow a drop‑in internal upgrade to OpenSimplex2S without breaking consumers.

## Rationale

- Determinism: Same seeding approach as our Perlin utilities ensures reproducibility.
- Practicality: Classic Simplex is lightweight and easy to validate; suitable as an initial, stable baseline.
- Optionality: By fixing the API now, we preserve future flexibility to switch the internal algorithm to OpenSimplex2S without changing call sites.

## Consequences

- Visual output will differ from a true OpenSimplex2S implementation until the internal swap is made.
- Tests assert determinism and output ranges; upgrading to 2S should keep these passing, but will change exact numeric outputs. A brief migration note may be warranted when we switch.

## Validation

- Unit tests in `src/test/open-simplex.test.ts` cover determinism and normalized range guarantees, plus a probabilistic difference check across seeds.
- Full test suite passes under Vitest.

## Follow-ups

- Replace interim Simplex core with a faithful OpenSimplex2S implementation.
- Add FBM helpers (octaves, persistence, lacunarity) and domain warp utilities building on `createOpenSimplexNoise`.
