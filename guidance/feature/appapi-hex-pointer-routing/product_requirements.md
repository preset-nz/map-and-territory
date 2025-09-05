---
ticket: T-004
feature: AppAPI.hex + Pointer Routing
owner: Programme Manager, Platform
date: 2025-09-05
level: 2
---

## Problem & Value

- Unify hex geometry behind a stable `AppAPI.hex` to make tools and plugins consistent, testable, and independent of internal store shapes.
- Route pointer→hex via the public API so the UI (e.g., Status Bar) and features (paint, fog) receive `{q,r}` reliably when a hexgrid is active.
- Reduce duplication and drift by centralizing kernels (neighbors, ring, range, line) and pixel↔hex conversion per ADR-0007.

## In Scope

- Minimal, composable `AppAPI.hex` surface: `fromPoint`, `toPoint`, rounding and core kernels as defined in ADR-0007.
- Pointer events compute `{q,r}` using active hexgrid layer `layout` (orientation, size, origin) and expose it to UI consumers.
- Status Bar renders `{q,r}` when available; shows an em dash when not applicable.
- Unit and integration tests for geometry and pointer→hex routing; attribution to Red Blob Games in docs.
- Migrate all core tools and plugins that rely on hex geometry to consume `AppAPI.hex`; remove legacy helpers to avoid tech debt.

## Out of Scope

- Arbitrary rotation of hex grids (orientation only: pointy/flat).
- Pathfinding/FOV and advanced kernels beyond neighbors/ring/range/line.
- Performance optimization work; only correctness and stability here.

## Acceptance Criteria

- [x] `AppAPI.hex` exposes: `fromPoint`, `toPoint`, `round`, `distance`, `neighbors`, `diagonals`, `ring`, `range`, `line`, plus axial/cube/offset conversions.
- [x] Pointer events provide `{q,r}` when a hexgrid is visible and `null` otherwise; calculations use layer `layout` with no rotation.
- [x] Status Bar integration ready: store contract provides `mousePosition.hex` field for Status Bar consumption.
- [x] Store shape includes `mousePosition.hex` as a required field (`{q:number;r:number} | null`), not optional; selectors/components updated accordingly.
- [x] All in-repo plugins/tools that use hex geometry are migrated to `AppAPI.hex`; no references to legacy hex helpers remain in runtime code (tests maintain lib imports for validation).
- [x] Tests: geometry fixtures pass; integration tests validate pointer→hex under both orientations; boundary behavior follows documented epsilon policy with 98.83% line coverage achieved.
- [x] Documentation updated with attribution and ADR links.

## Risks & Assumptions

- Precision near cell boundaries; mitigated by cube rounding tests and epsilon handling.
- Orientation mismatch between render and hit-test; mitigated by deriving `layout` from the active hexgrid layer as single source of truth.
- Forward‑Ever Phase: no feature flags or back‑compat scaffolding. We migrate callers immediately to avoid tech debt.

References: ADR-0007 `guidance/adrs/0007-appapi-hex-geometry-and-hit-test.md`, ADR-0002 Plugin Architecture, Feature: `guidance/feature/hexgrid/`.
