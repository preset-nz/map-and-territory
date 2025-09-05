---
ticket: T-003
feature: Invalidation API — Required for Visual Layers
author: @georg
date: 2025-09-05
level: 2
---

## Overview & Assumptions

- Visual layers own their visual invalidation semantics; the host composes only `type`, `visible`, and the adapter’s `getInvalidationKey(state)`.
- Keys are cheap to compute, deterministic, and stable for semantically equivalent visuals.
- Worker and main‑thread render paths both depend on the same composed `layersKey`.
- No backward compatibility or runtime fallbacks. App is pre‑distribution; all adapters are uplifted in this change.

## Interfaces & Contracts

- Types: `src/layers/types.ts`
  - Change: `LayerAdapter<State>` requires `getInvalidationKey(state: State): string` (non‑optional).
  - Rationale: platform seam; prevents host from peeking into arbitrary layer state.

- Host invalidation key composition (Canvas Viewport):
  - `layerKey = `${type}:${visible ? '1' : '0'}:${adapter.getInvalidationKey(state)}``
  - Remove fallback to `JSON.stringify(state)` and throw if adapter is misconfigured.

- Optional helper (non‑normative): `@/layers/utils/invalidation.ts`
  - `buildKey(obj: Record<string, unknown>): string` — stable field ordering + minimal separators.
  - Example usage shown in adapter docs; not a compatibility layer.

## Data/State Changes

- No schema changes. Contract change only (adapter interface).

## Testing Strategy

- Unit (Vitest):
  - Paper: color/aspect changes update key; unrelated object identity changes do not.
  - Hexgrid: `size`, `orientation`, `color`, `alpha`, `lineWidth` affect key; order and defaults stable.
  - Hex Noise: `seed`, `frequency`, `offsetX/Y`, `intensity`, `gamma`, `min/max`, `mode`, `terrain` affect key; defaults produce stable baseline.

- Integration:
  - CanvasViewport `layersKey` computation uses only adapter keys; spy adapters to assert call counts and values.
  - Render loop triggers on key changes; no redraw on no‑op state mutations.

- E2E (Playwright):
  - Adjust a property (e.g., Hexgrid size) and assert a visual probe changes (pixel hash or DOM marker) once per change.

## Impact/Risks

- Perf: Fewer unnecessary redraws by removing `JSON.stringify` churn; slightly more adapter work upfront.
- DX/UX: Clear contract simplifies adding new layers and plugins.
- ADR links: ADR‑0002 (Plugin Architecture) — update its “Render Invalidation & Redraw Contracts” to reflect required `getInvalidationKey`.
