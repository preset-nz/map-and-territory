---
ticket: T-004
feature: AppAPI.hex + Pointer Routing
author: Software Architect
date: 2025-09-05
level: 2
---

## Overview & Assumptions

- Follow ADR-0007: expose hex geometry via `AppAPI.hex`; orientation only (`'pointy'|'flat'`), explicit `layout` with `size` and `origin`.
- Selector-oriented, versioned AppAPI; no leakage of store internals; SOLID/CUPID-aligned utilities.
- Pointer→hex routing attaches `{q,r}` to pointer context when hexgrid is active; degrade gracefully to `null` otherwise.
- Forward‑Ever Phase: remove legacy hex helpers and migrate all consumers; no feature flags or back‑compat layers.

## Interfaces & Contracts

- `AppAPI.hex` (public):
  - `fromPoint(point: {x:number;y:number}, layout: Layout): Axial | null`
  - `toPoint(hex: Axial, layout: Layout): { x: number; y: number }`
  - `axialToCube(a: Axial): Cube`, `cubeToAxial(c: Cube): Axial`, `round(frac: Cube): Axial`
  - `distance(a: Axial, b: Axial): number`
  - Kernels: `neighbors(h: Axial)`, `diagonals(h: Axial)`, `ring(center: Axial, radius: number)`, `range(center: Axial, radius: number)`, `line(a: Axial, b: Axial)`
  - Offset conversions with variant and orientation.
- Types:
  - `type Orientation = 'pointy' | 'flat'`
  - `interface Layout { orientation: Orientation; size: number; origin: { x: number; y: number } }`
  - `interface Axial { q: number; r: number }`, `interface Cube { x: number; y: number; z: number }`

UI/Event Contracts:

- Canvas Viewport computes paper-local `{x,y}` and, when hexgrid is visible, derives `layout` from the active hexgrid layer; no rotation considered.
- Layout store mouse position includes `hex: { q:number; r:number } | null` (field present; may be `null` when not applicable).
- Status Bar consumes `mousePosition.hex` when present; all selectors/components updated accordingly.

## Data/State Changes

- Update `useLayoutStore().mousePosition` shape to include required `hex` field (`{ q, r } | null`). All selectors updated in the same change.
- Read-only use of hexgrid layer state to build `layout` (orientation, size, origin). Any legacy rotation settings are removed as part of migration.

## Testing Strategy

- Unit (Vitest):
  - Pixel↔hex round-trips for both orientations and multiple sizes/origins.
  - Cube rounding edge cases near boundaries; distance and kernel correctness (fixtures).
  - Precision/epsilon: define `EPS = 1e-6` for boundary comparisons in cube rounding. Fixtures include points within ±EPS of cell edges/vertices. Tie-break rule is documented and stable.
- Integration (Vitest):
  - Simulated pointer move updates store with expected `{q,r}` when hexgrid visible; `null` when not visible.
- Attribution: inline JSDoc credits to Red Blob Games; links in guidance docs.

## Impact/Risks

- Perf: O(1) per conversion; no measurable regression expected.
- DX/UX: Clear, minimal API; easier plugin/tool development; status bar clarity improves.
- Migration: all in-repo plugins/tools updated in this ticket to avoid split-brain.
- ADR links: ADR-0007 (primary), ADR-0002 (AppAPI versioning/selector approach).

Notes: Keep the surface minimal; additional helpers (corners, continuous cones) can be proposed after validation (separate tickets).
