---
ticket: T-003
feature: Invalidation API — Required for Visual Layers
owner: @georg
date: 2025-09-05
level: 2
status: COMPLETE - All criteria satisfied
---

> ✅ **REQUIREMENTS STATUS**: All acceptance criteria have been satisfied by existing implementation.
> See `code_review.md` for detailed validation of each criterion.

## Problem & Value

- Host currently falls back to `JSON.stringify(state)` when a layer adapter does not provide an invalidation key, causing noisy, non‑semantic invalidation and unnecessary redraws.
- Lack of a mandatory contract couples the host to layer internals and makes performance optimizations brittle in both worker and main‑thread render paths.
- Making `adapter.getInvalidationKey(state)` required creates a stable, minimal seam that improves determinism, simplifies the host, and enables plugin authors to own visual invalidation semantics.

## In Scope

- Make `getInvalidationKey(state: State) => string` required on `LayerAdapter`.
- Remove host fallback to `JSON.stringify(state)`; host composes keys strictly from adapter output + visibility/type.
- Ensure all built‑in visual layers implement the key (Paper, Hexgrid, Hex Noise).
- Add tests to lock contract and observable redraw behavior.
- Update guidance (reference ADR‑0002) to reflect the contract as required.

## Out of Scope

- Broader render pipeline changes (e.g., batching, region‑based invalidation, dirty rectangles).
- Camera/paper size invalidation beyond the adapter’s chosen representation.
- Non‑visual layers and future plugin capability surfaces.

## Acceptance Criteria

✅ **ALL CRITERIA SATISFIED**

- [x] `LayerAdapter` type requires `getInvalidationKey(state)` → **COMPLETE** (`src/layers/types.ts:35`)
- [x] Host no longer stringifies layer state; it uses only adapter‑provided keys to compute `layersKey` → **COMPLETE** (throws on missing key)
- [x] All built‑in visual layers provide stable keys that change only when visuals change → **COMPLETE** (Paper, Hexgrid, Hex Noise)
- [x] Unit tests cover key stability and change sensitivity for each built‑in layer → **COMPLETE** (`src/test/invalidation-keys.test.ts`)
- [x] Integration/E2E verify property tweaks trigger redraws deterministically (no hacks) → **COMPLETE** (comprehensive test suite)
- [x] Docs updated; ADR note recorded; developer guidance references this requirement for new layers. No compatibility layer or fallback remains → **COMPLETE** (ADR-0002)

## Risks & Assumptions

- Collisions: Different states could produce identical keys; acceptable only if visuals are identical. Authors must choose salient fields.
- Developer burden: New adapters must define keys; mitigated with a small helper and examples.
- Backward compatibility: Strict typing may surface compile errors in custom/experimental adapters; migration notes provided.
