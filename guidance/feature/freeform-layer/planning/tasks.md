---
ticket: T-017
feature: Freeform Layer (Hex Paint)
author: @production-coordinator
date: 2025-09-09
level: 2
status: Draft
---

## Milestones & Gates

- M1: Layer type + properties schema wired
- M2: Paint/erase tool plumbing in canvas
- M3: Toolbar contributions + shortcuts + gating
- M4: Tests (unit/integration/E2E) green at ≥80% coverage

## Tasks

- [ ] Define layer adapter `freeform-hex.ts` with `defaultState`, `drawMain`, `getInvalidationKey` (owner: @dev, est: 6h)
- [ ] Register layer type in project store bootstrap (alongside Paper/Hexgrid) (owner: @dev, est: 1h)
- [ ] Properties schema `layer:freeform` with opacity, terrain select, color override (owner: @dev, est: 3h)
- [ ] CanvasViewport: pointer handlers for `paint`/`erase` gated by selection and tool (owner: @dev, est: 6h, deps: adapter)
- [ ] Palette resolution: use `resolvePalette` and `resolveTerrainFill` (owner: @dev, est: 1h)
- [ ] Built-in plugin or host commands for `layer.freeform.add` and tool toggles (owner: @dev, est: 3h)
- [ ] Add shared hex utilities `src/layers/hex-utils.ts` (axialKey/parseAxialKey, centerFor, hexPath) and consume in Freeform (owner: @dev, est: 2h)
- [ ] Unit tests: adapter invalidation key, color resolution, registry (owner: @qa, est: 4h)
- [ ] Integration tests: paint/erase state updates via pointer simulation, mixing multiple terrain types in one layer (owner: @qa, est: 6h)
- [ ] E2E: create → add layer → paint → erase (owner: @qa, est: 6h)
- [ ] Docs: update feature README links and cross‑refs (owner: @docs, est: 1h)

## Validation Hooks

- `pnpm test`: unit/integration for adapter + viewport updates
- `pnpm test:e2e`: Playwright scenario for paint/erase
- Coverage: `pnpm test:coverage` ≥80%

## Rollback / Flag

- Guard behind a lightweight feature flag `enableFreeform` (default on in dev/test). If regressions, disable toolbar command and tool gating to hide feature.

References: process/feature_workflow.md, process/testing_standards.md, templates/\*.
