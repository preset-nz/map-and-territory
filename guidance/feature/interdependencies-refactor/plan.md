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

Phase 2 — Geometry + Viewport Simplification (Complete 2025-09-15)

- Objective: unify paper geometry math and make viewport redraws predictable by removing implicit store coupling.
- Dependencies: Phase 1 seams merged; redraw baseline (2025-09-15) available for regression comparison; no open tickets blocking viewport refactors.
- Deliverables:
  - `computePaperRect` exported from shared geometry module `src/app/scene/geometry.ts` and adopted by `CanvasViewport`, pointer routing, and any tool relying on paper bounds.
  - `CanvasViewport` subscribes only to the minimal derived selectors (`paper`, `viewportSize`, `palette`, `layersKey`); legacy broad campaign subscribe removed.
  - Documentation snippet under `guidance/feature/interdependencies-refactor/baseline-redraw-2025-09-15.md` updated with post-change metrics.
- Implementation Steps:
  1. Audit existing paper rect calculations (`CanvasViewport`, Freeform tool, Hex Noise) and document gaps in `guidance/feature/interdependencies-refactor/notes.md` for traceability.
  2. Introduce shared helper with tests covering aspect ratio edge cases (square, portrait, landscape) and ensure the API mirrors existing call sites to avoid breakage.
  3. Refactor `CanvasViewport` to derive render props via selectors; break apart responsibilities if needed (e.g., `useViewportScene()` hook) to maintain single responsibility.
  4. Update affected tools/plugins to consume the helper via `ToolContext.sceneAdapter` (or include it if missing) to prevent divergence.
  5. Re-run redraw probe harness; capture before/after numbers and note any deltas exceeding ±5% with mitigation plan.
- Validation:
  - Unit: `computePaperRect` calculations, selectors for viewport deps.
  - Integration: viewport resize handling (Vitest + jsdom) verifies pointer and render alignment.
  - E2E: smoke (paint, erase) on various canvas sizes still fires a single invalidation.
- Exit Criteria: acceptance criteria P2 met; documentation + metrics stored; follow-up tickets filed for any residual coupling detected during audit.

Phase 3 — Paper Canonicalization (Complete 2025-09-15)

- Objective: guarantee paper visuals originate from the Paper layer so plugins and renderer share a single source of truth.
- Deliverables:
  - Store helper `sanitizePaperState` enforces canonical aspect/color; `_normalizeAnchorsForMap` now syncs legacy `map.paper` into layer state once at load and derives map metadata from that layer thereafter.
  - `setMapPaperAspect`, `setMapPaperColor`, `updateLayerState`, and `applyLayerState` keep `map.paper` and Paper layer state fully aligned.
  - Persistence uses layer state when serializing (`serializeCampaignV1`) to prevent drift; unit suite extended (`src/test/store-paper-canonical.test.ts`).
- Implementation Steps:
  1. Normalize existing campaigns by seeding Paper layer state from `map.paper` when needed and re-writing `map.paper` from the canonical layer state.
  2. Route all store mutations that touch Paper through the canonical helper so tools, properties, and migrations share consistent math.
  3. Update persistence and new tests to assert synchronization guarantees across create, load, and mutation paths.
- Validation:
  - Unit: new `store-paper-canonical` coverage plus existing store seam tests.
  - Integration: persistence round-trip and properties interactions continue to pass.
  - E2E: no UX change; invalidation probe continues to diff buffers once while render counter stays ≤2.
- Exit Criteria: acceptance criteria P3 met; Paper layer state is definitive for renderer/tool reads.

Phase 4 — Anchor Policy Utility (Complete 2025-09-15)

- Objective: centralize anchor bounds so layer CRUD honours paper/hexgrid constraints consistently.
- Deliverables:
  - Shared helper `src/stores/campaign/anchors.ts` providing `getAnchorBounds`, `clampToAnchorRange`, and `isAnchorLayer`.
  - Store operations (`addLayer`, `insertLayerBeforeTopAnchor`, `insertLayerAbove`, `duplicateLayer`, `moveLayer`, visibility guards) now consume the helper to clamp indices and protect anchors.
  - Unit coverage for anchor math and store behaviours updated (`src/test/stores/anchor-bounds.test.ts`, existing `layer-ordering` cases).
- Validation:
  - Unit: anchor bounds utility + existing layer ordering spec.
  - Integration/E2E: no behaviour drift; layer manipulation flows remain green.
- Exit Criteria: acceptance criteria P4 met; anchor policies expressed once and reused.

Phase 5 — Cleanup, Docs, Lints (Planned 2025-09-16)

- Objective: lock in the seam-first model by aligning guidance, examples, and lint enforcement so plugins cannot regress to direct store access.
- Dependencies: Phases 1–4 in main; ESLint guard scaffold from Phase 0; migration notes drafted (`guidance/feature/interdependencies-refactor/notes.md`).
- Tasks:
  - Update `guidance/process/implementation_standards.md` and `guidance/process/code-reviewer-typescript.md` with the `ToolContext` write seam requirements, reviewer checklist, and ADR-0002 link.
  - Refresh plugin examples (`src/plugin/builtin/*.ts`) and snippets in `guidance/process/nextjs_typescript_feature_implementation.md` to show `applyLayerState` usage and remove legacy `useCampaignStore` imports.
  - Promote the ESLint `no-restricted-imports` rule to error with a custom message referencing the guidance section; add a lint fixture under `src/test/lint/plugin-store-import.test.ts` to guard the regression.
  - Align `scripts/pre-commit.mjs` to run `pnpm lint --max-warnings=0` so the rule blocks commits, and note the expectation in `guidance/tickets.md` migration checklist.
- Deliverables:
  - Documentation updates across the guidance stack referencing the new seam and migration path.
  - ESLint configuration change plus accompanying lint fixture/test ensuring plugin-store imports fail CI.
  - Updated pre-commit script and ticket checklist communicating the enforcement gate.
- Validation:
  - `pnpm lint` (ensures guard fires) and `pnpm validate` prior to sign-off.
  - Spot-check plugin build via `pnpm build` to confirm no unresolved imports after refactors.
- Exit Criteria: Documentation reflects seam-first authoring, lint blocks regressions, migration backlog closed or scheduled in tickets with owners.

Deferred (Post‑seams)

- Optional `applyCellsDelta` helper and any flood‑fill/bulk behaviors (T‑023).

## Acceptance Criteria (Per Phase)

- P0 (Met 2025-09-15): Plugin lint guard active; redraw baseline captured for comparison ahead of Phase 2.
- P1 (Met 2025-09-15): `applyLayerState` exists; Freeform/Hex Noise tools use `ToolContext` only; no plugin imports `@/stores/*`; lint baseline recorded for regression watch.
- P2 (Met 2025-09-15): Shared `computePaperRect` used in viewport and tools; broad subscribe removed; invalidation E2E remains green.
- P3 (Met 2025-09-15): Paper layer is canonical; reads consistently prefer it; tests reflect single source of truth.
- P4 (Met 2025-09-15): Anchor bounds utility in place; layer move/insert behaviors unchanged and tested.
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
