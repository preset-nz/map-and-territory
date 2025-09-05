---
ticket: T-004
feature: AppAPI.hex + Pointer Routing
author: Programme Manager
date: 2025-09-05
level: 2
---

## Milestones & Gates

- M1: AppAPI.hex surface agreed (ADR-0007 aligned) — Gate: design sign-off.
- M2: Geometry + kernels implemented with unit tests — Gate: ≥90% coverage on hex lib.
- M3: Pointer→hex integration + Status Bar display — Gate: integration tests green.
- M4: Migrate all in-repo plugins/tools to `AppAPI.hex`; remove legacy helpers — Gate: repo-wide search shows no legacy usage.
- M5: Docs + attribution complete — Gate: review acknowledgment.

## Tasks

- [ ] Define `AppAPI.hex` surface and types (owner: @architect, est: 6h, deps: ADR-0007)
- [ ] Implement conversions and kernels (`fromPoint`, `toPoint`, `round`, `distance`, `neighbors`, `diagonals`, `ring`, `range`, `line`) with fixtures (owner: @dev, est: 1.5d, deps: previous)
- [ ] Update layout store to include `hex: {q:number;r:number}|null` (not optional); update selectors/components (owner: @dev, est: 6h, deps: previous)
- [ ] Integrate pointer→hex in Canvas Viewport using active hexgrid `layout`; remove any rotation usage (owner: @frontend, est: 1d, deps: previous)
- [ ] Update Status Bar to show `Hex: q,r` or `—` (owner: @frontend, est: 3h, deps: integration)
- [ ] Migrate in-repo plugins/tools to consume `AppAPI.hex`; delete legacy hex helpers (owner: @dev, est: 1d, deps: API ready)
- [ ] Documentation: add attribution and cross-links (owner: @pm, est: 1h, deps: implementation)

## Migration Targets (Forward‑Ever)

- Direct hex usage:
  - `src/components/map/canvas-viewport.tsx` → replace `@/lib/hex` import with `AppAPI.hex.fromPoint(...)`.
  - Tests `src/test/hex-lib*.test.ts` remain to validate the library; add separate integration tests for `AppAPI.hex` usage.

- Store/UI updates:
  - `src/stores/layout/index.ts` → make `mousePosition.hex` required (`{q,r}|null`); update setter/selectors.
  - `src/components/layout/status-bar.tsx` → expect `hex` to exist (may be `null`); rendering unchanged.
  - `src/types/layout/index.ts` → align composite `status.mousePosition` type or deprecate legacy shape.

- Inlined geometry (note, not required for T‑004):
  - `src/layers/adapters/hexgrid.ts`, `src/layers/adapters/hex-noise.ts` use bespoke tiling. Keep for now; consider future dedupe via `AppAPI.hex.corners()`/`toPoint()` in a follow‑up ticket.

- Render path (FYI):
  - `src/render/backends/canvas2d.ts` builds a `layout` hint; no change needed for T‑004.

## Validation Hooks

- Unit: `pnpm test` — geometry fixtures and rounding boundaries.
- Integration: `pnpm test` — store updates on pointer move with and without hexgrid.
- Coverage: `pnpm test:coverage` — hex lib ≥90% lines/branches.

## Rollback / Flag

Forward‑Ever Phase: no feature flags. This change is applied across core and plugins; rollback equals reverting the PR.
