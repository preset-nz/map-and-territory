---
title: Interdependencies Refactor Plan — Brittleness Reduction (Seam‑First)
status: In Progress
date: 2025-09-15
owner: Platform (Product Design · Architecture · Programme)
links:
  - ADR-0002 Plugin Architecture: guidance/adrs/0002-plugin-architecture.md
  - ADR-0007 AppAPI Hex Geometry: guidance/adrs/0007-appapi-hex-geometry-and-hit-test.md
  - Invalidation API (Complete): guidance/feature/invalidation-api/planning/solutions_design.md
  - Tickets: guidance/tickets.md (T-020 Batched Mutations; T-023 Flood Fill)
---

## Context

Recent tickets stalled due to brittle coupling across store, renderer, and plugins. Symptoms observed:

- Tools import and mutate Zustand store directly (plugin → internal store leakage).
- Many small `updateLayerState` patches cause redraw storms (no transactional/batch seam).
- `CanvasViewport` owns render lifecycle, paper-rect math, pointer routing, and a broad store subscribe — duplicated responsibilities and hidden invalidation paths.
- Two paper sources (layer “paper” vs `map.paper`) create drift risks.
- Freeform invalidation key changes per painted cell, amplifying redraws when edits are unbatched.
- Anchor-layer ordering rules are implicit in several places.

## Goals (Must)

- Reduce coupling with a clear write seam for tools/plugins (no direct store access).
- Introduce transactional mutations so large edits trigger one render invalidation.
- Centralize scene geometry (paper rect) and remove broad store subscriptions.
- Canonicalize paper state to a single source of truth.
- Make anchor rules explicit and reusable.

## Non-Goals (Now)

- No schema changes to campaign or layer state.
- No redesign of renderer worker protocol.
- No cross-thread plugin isolation changes (kept for future phases).

## Principles

- SOLID/CUPID, selector-oriented AppAPI, clear interfaces, minimal viable implementation with platform optionality preserved.

## Decisions (Plan of Record)

Scope update (2025‑09‑15): prioritize seams over bulk edits. Defer flood‑fill/batch feature work; keep interfaces minimal and stable so later batching slots in without churn. Phase 1 seam definition landed 2025‑09‑15; Freeform and Hex Noise tools now depend on the new entrypoints.

1. Store Write Seam (Minimal Transaction)

- Define `applyLayerState(layerId, updater)` as the canonical mutation entry for tools. Implementation may be simple now (single commit) and can adopt Immer later without changing callers.
- Keep `updateLayerState` for legacy/simple patches; tools must prefer `applyLayerState` once available.
- Defer `applyCellsDelta` until after seams land (future phase).

2. Tool/Plugin Write Seam

- Extend `ToolContext` with `applyLayerState` and `applyCellsDelta` and a read helper `getActiveLayerState<T>(layerId?)`.
- Deprecate direct imports of `useCampaignStore` from plugin modules; mark as blocked in guidance and unit guard (see Validation).

3. Scene Geometry Centralization

- Provide `computePaperRect(canvasW, canvasH, aspect)` via SceneAdapter or a small shared helper; both CanvasViewport and tools use the same function.
- Remove the broad `campaign` store subscribe in `CanvasViewport`; rely on explicit deps (`layersKey`, size, palette, paper aspect/color). If a subscribe is still required, scope it narrowly to palette/paper-only changes.

4. Canonical Paper Source of Truth

- Treat Paper layer state as canonical for visuals; `map.paper` is bootstrap-only.
- Normalize on campaign load/create; reading codepaths must prefer layer.

5. Invalidation Key Tuning

- Keep adapters’ `getInvalidationKey` contract. For Freeform, once batch APIs are adopted, drop `lastKey` from the key or keep it only if it does not increase redraws during a transaction (tool commits once).

6. Anchor Layers as Policy

- Encapsulate anchor behavior in a single utility (e.g., `getAnchorBounds(layers)`), used by add/move/insert to compute legal ranges; keep `LayerPolicy` as the declaration of anchor constraints.

## Phased Implementation & Dependencies

Phase 0 — Guardrails (Complete 2025‑09‑15)

- ESLint guard (`no-restricted-imports`) blocks `@/stores/*` usage in `src/plugin/**`; documented under `eslint.config.mjs`.
- Redraw baseline recorded (hex size probe + seam unit) in `guidance/interdependencies-refactor/baseline-redraw-2025-09-15.md`.

Phase 1 — Define Seams (Complete 2025‑09‑15)

- Implement `applyLayerState(layerId, updater)` with a single commit semantics; do not add `applyCellsDelta` yet.
- Extend `ToolContext` with `applyLayerState` and `getActiveLayerState<T>(layerId?)`.
- Migrate Freeform and Hex Noise tools to use `ToolContext` for all reads/writes; remove direct store imports in those tools.
- Documented migration guidance for other plugins and captured lint follow-ups under Phase 5.

Phase 2 — Geometry + Viewport Simplification

- Extract `computePaperRect` helper/SceneAdapter and reuse in pointer routing and rendering.
- Remove/limit broad store subscribe in `CanvasViewport`; rely on explicit deps and narrowly scoped selectors.
- Inspect existing integration tests to ensure they cover viewport resize semantics before refactor; add missing cases alongside geometry changes if required.

Phase 3 — Paper Canonicalization

- Ensure Paper layer is canonical for visuals; use `map.paper` only at bootstrap; normalize on load.

Phase 4 — Anchor Policy Utility

- Introduce `getAnchorBounds(layers)` and refactor add/move/insert to use it.

Phase 5 — Cleanup, Docs, Lints

- Update guidance and examples to use `ToolContext`; enforce plugin import guard.

Deferred (Post‑seams)

- Optional `applyCellsDelta` helper and any flood‑fill/bulk behaviors (T‑023).

## Acceptance Criteria (Per Phase)

- P0 (Met 2025-09-15): Plugin lint guard active; redraw baseline captured for comparison ahead of Phase 2.
- P1 (Met 2025-09-15): `applyLayerState` exists; Freeform/Hex Noise tools use `ToolContext` only; no plugin imports `@/stores/*`; lint baseline recorded for regression watch.
- P2: Shared `computePaperRect` used in viewport and tools; broad subscribe removed or narrowed; invalidation E2E remains green.
- P3: Paper layer is canonical; reads consistently prefer it; tests reflect single source of truth.
- P4: Anchor bounds utility in place; layer move/insert behaviors unchanged and tested.
- P5: Docs updated; lint/guard prevents store imports from plugins.

## Validation & Test Strategy

- Unit: store APIs (batch), geometry helper, anchor bounds, adapter keys stability.
- Integration: `CanvasViewport` uses shared geometry; tool events mutate via `ToolContext` only; add focused regression covering viewport resize vs. new geometry helper.
- E2E (Playwright): hex size change → redraw once; paint/erase still functional; no requirement yet for “one redraw per stroke”.
- Coverage: maintain ≥80% (project threshold); run full suite: `pnpm test`, `pnpm test:e2e`.

## Risk & Mitigation

- Plugin breakage: mitigate with a deprecation window, console warnings, and codemod notes.
- Performance regressions: baseline metrics in Phase 0; keep batch operations isolated and measured.
- Hidden dependencies in Viewport: minimize by extracting shared geometry and deleting broad subscribe.

## Rollout

- Land Phase 1–3 behind documentation-only change; no feature flags expected.
- After Phase 5, revisit T‑020/T‑023 with seams in place.

## Notes

- This plan aligns with platform thinking: narrow seams, batched side-effects, and predictable invalidation keep optionality for future plugin isolation and marketplace work.
