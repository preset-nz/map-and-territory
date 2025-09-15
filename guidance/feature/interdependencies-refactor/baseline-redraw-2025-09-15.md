---
title: Redraw Baseline — Seam Refactor
status: Recorded
date: 2025-09-15
author: Platform (Product Design · Architecture · Programme)
---

## Probe

- Command: `pnpm test:e2e -- --grep "Invalidation → Redraw"`
- Fixture: Playwright spec `src/test/e2e/invalidation-redraw.spec.ts`
- Scenario: Hex Grid size slider change followed by line width + color tweak.

## Observations (2025-09-15)

- Canvas redraw occurs exactly once per slider change in current build; Playwright diff confirms buffer change without duplicate frames.
- Freeform seam baseline: unit `src/test/tools-freeform-seam.test.ts` verifies paint/erase use `applyLayerState`, ensuring single transaction per pointer event.
- No regression guard yet for redraw count; rely on recorded spec + seam unit for post-Phase 2 comparisons.

## Observations (2025-09-15 Post Phase 2)

- `CI=1 pnpm test:e2e` (11 specs) rerun after geometry refactor; invalidation scenario continues to report a single redraw per interaction.
- CanvasViewport logs confirm worker resize/render path exercises shared `computePaperRect` math without additional frames.
- No variance detected against 2025-09-15 baseline; metrics within ±0% for monitored scenario.

## Follow-Ups

1. Extend Playwright probe to assert frame counter when geometry refactor lands (Phase 2). **DONE 2025-09-15**
2. Capture Freeform stroke metrics once batch API (`applyCellsDelta`) is introduced.
