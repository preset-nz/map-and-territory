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

- [ ] Update `LayerAdapter` to require `getInvalidationKey(state)` (owner: @georg, est: 0.5d)
- [ ] Remove fallback in `src/components/map/canvas-viewport.tsx` (owner: @georg, est: 0.25d)
- [ ] Verify/adjust built‑in adapters’ keys (Paper, Hexgrid, Hex Noise) (owner: @georg, est: 0.25d)
- [ ] Add unit tests for adapter keys under `src/test/layers/*` (owner: @georg, est: 0.5d)
- [ ] Add integration test for `layersKey` behavior (owner: @georg, est: 0.5d)
- [ ] Add E2E probe for deterministic redraw on property change (owner: @georg, est: 0.5d)
- [ ] Update guidance: note in ADR‑0002 that `getInvalidationKey` is required; link this feature folder (owner: @georg, est: 0.25d)

## Validation Hooks

- `pnpm test`: unit/integration pass; coverage ≥80%.
- `pnpm test:e2e`: redraw probe spec green and deterministic locally.

## Rollback / Flag

- None. No backward compatibility or fallback paths are provided.
