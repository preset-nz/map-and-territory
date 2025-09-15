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
