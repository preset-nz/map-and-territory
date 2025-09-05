---
ticket: T-003
feature: Invalidation API — Required for Visual Layers
author: @georg
date: 2025-09-05
level: 2
---

## Milestones & Gates

- Contract enforced in types; host uses no fallback; tests prove stability and sensitivity.

## Tasks

✅ **FEATURE COMPLETE** - All tasks implemented and deployed

- [x] Update `LayerAdapter` to require `getInvalidationKey(state)` → **COMPLETE** (`src/layers/types.ts:35`)
- [x] Remove fallback in `src/components/map/canvas-viewport.tsx` → **COMPLETE** (throws error on missing method, lines 41-48)
- [x] Verify/adjust built‑in adapters' keys (Paper, Hexgrid, Hex Noise) → **COMPLETE** (all adapters in `src/layers/adapters/*.ts`)
- [x] Add unit tests for adapter keys under `src/test/layers/*` → **COMPLETE** (`src/test/invalidation-keys.test.ts`)
- [x] Add integration test for `layersKey` behavior → **COMPLETE** (comprehensive integration tests)
- [x] Add E2E probe for deterministic redraw on property change → **COMPLETE** (Playwright tests)
- [x] Update guidance: note in ADR‑0002 that `getInvalidationKey` is required → **COMPLETE** (ADR-0002 lines 55-67)

## Validation Hooks

- `pnpm test`: unit/integration pass; coverage ≥80%.
- `pnpm test:e2e`: redraw probe spec green and deterministic locally.
- CI invocation: `CI=1 PORT=3211 pnpm test:e2e` (Playwright uses `PORT`; CI disables reuse of existing server).

## Rollback / Flag

- None. No backward compatibility or fallback paths are provided.
