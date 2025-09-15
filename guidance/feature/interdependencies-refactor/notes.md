---
title: Phase 2 Audit Notes — Geometry + Viewport Simplification
status: Draft
date: 2025-09-15
author: Platform (Product Design · Architecture · Programme)
---

## Paper Rect Math Inventory (Pre-Refactor)

- `src/components/map/canvas-viewport.tsx`: inline `parseAspect` + `padding` math in both render frame setup and pointer routing fallback.
- `src/render/backends/canvas2d.ts`: `defaultComputePaperRect` duplicates viewport math for worker fallback.
- `src/plugin/builtin/paper.ts`: Scene adapter reimplements identical padding/aspect logic.
- Pointer hover → hex routing path recomputes math separately and diverges if SceneAdapter overrides are introduced.

## Store Subscription Findings

- `CanvasViewport` currently selects `s.current` twice via `useCampaignStore`, triggering rerenders on any campaign change regardless of viewport needs.
- Additional manual `campaignStoreRaw.subscribe` effect forces render flush on all campaign mutations; this is the “broad subscribe” called out in Phase 2 scope.

## Test Coverage Gaps

- No direct unit coverage for paper rect helper; behavior exercised implicitly via renderer + plugins but lacks dedicated jsdom verification across aspect ratios.
- Integration specs around pointer routing (`src/test/pointer-hex-routing.test.ts`) rely on DOM math that should continue to pass once helper centralizes calculations.

## Outcomes (2025-09-15)

- Shared helper `src/app/scene/geometry.ts` now backs renderer, SceneAdapter, and CanvasViewport fallback paths.
- `CanvasViewport` no longer performs broad `campaignStore.subscribe`; derived state handled via React memoization with updated store seam.
- Added `src/test/app/scene/geometry.test.ts` to cover 16:10, square, and constrained canvas cases.
- Playwright invalidation suite (`CI=1 pnpm test:e2e`) passes post-refactor with unchanged redraw counts.

## Phase 3 Notes (2025-09-15)

- Introduced `sanitizePaperState` to centralize Paper aspect/color normalization; `_normalizeAnchorsForMap` now derives `map.paper` from layer state after initial hydration.
- Store mutation seams (`setMapPaperAspect`, `setMapPaperColor`, `updateLayerState`, `applyLayerState`) synchronize Paper layer state and map metadata.
- Serialization (`serializeCampaignV1`) emits paper metadata from the canonical layer, preventing drift in exported campaigns.
- Added `src/test/store-paper-canonical.test.ts` covering mutation paths, import normalization, and fallback hydration from legacy `map.paper` values.

## Phase 4 Audit (2025-09-15)

- Anchor semantics are implicit: `_normalizeAnchorsForMap` ensures paper is first and hexgrid last; other store mutations replicate this via manual `findIndex` checks.
- `addLayer`, `insertLayerBeforeTopAnchor`, and `moveLayer` compute bounds ad hoc (paper locked at index 0, hex grid pinned to top) without shared helper.
- Visibility and removal guard anchors but rely on repeated `l.type === "paper"` checks; no single source for allowable index ranges (`minIdx`/`maxIdx`).
- No tests assert anchor invariants when moving/inserting layers.

## Phase 4 Outcomes (2025-09-15)

- Introduced `@/stores/campaign/anchors.ts` with `getAnchorBounds`, `clampToAnchorRange`, and `isAnchorLayer` to formalize anchor policies.
- Store mutations now reuse the helper to clamp indices and prevent moving anchors; visibility logic continues to pin paper while allowing hex grid toggling.
- Added `src/test/stores/anchor-bounds.test.ts` and reused existing layer ordering specs to cover index clamping and duplicate/insert behaviour.
