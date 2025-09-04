# Subagent Tickets – Creative Layout Phase 2

Reference: guidance/feature/creative-layout-phase-2.md
Lead: Orchestrator (Product Designer, Software Architect, Programme Manager)
Primary Implementer: follow `guidance/process/nextjs_typescript_feature_implementation.md`
QA: @test-automation-vitest, @test-automation-runner (Playwright)

## Ticket 1: Vitest/Playwright Runner Separation

- Problem: Vitest collects `src/test/e2e/*.spec.ts` causing Playwright's `test()` to error under Vitest.
- Acceptance:
  - Vitest excludes `src/test/e2e/**` in `vitest.config.ts` (testExclude)
  - Playwright specs live in `src/test/e2e/**` or moved to `/e2e` per project convention
  - `pnpm test:run` passes locally and in CI
  - `pnpm test:e2e` runs independently
- Notes: Do not weaken unit test discovery; scope only e2e exclusion.

## Ticket 2: Properties Panel Slide Animation (Polish)

- Implement `translate-x` slide-in/out for `properties-panel-simple.tsx` to improve motion.
- Acceptance:
  - Hidden state: `translate-x-full` (no layout jump)
  - Visible: `translate-x-0`
  - Transition: 150–200ms, ease-out
  - No layout shift in main content during toggle

## Ticket 3: Resizer Constraints Alignment

- Align layout `Panel` min/max (percent) with guidance pixel constraints; ensure perceived bounds match store-enforced px.
- Acceptance:
  - Scene Panel: min 200px, max 400px equivalent
  - Properties Panel: min 280px, max 480px equivalent
  - Document calculation approach in code comments

## Ticket 4: Optional `use-resize-observer` Hook

- Add `src/hooks/use-resize-observer.tsx` for future dynamic measurements.
- Acceptance:
  - Stable hook with ResizeObserver + cleanup
  - Story/example usage added or referenced in code comments

## Ticket 5: Resize Handle Visual Polish

- Improve handle affordance: hover, active, hit area, contrast (meet WCAG).
- Acceptance:
  - Handle meets contrast guidelines
  - Hover state distinct; cursor hints present

## Ticket 6: Test Coverage

- Add unit tests for layout store actions: panel width setters (bounds), status toggles, selection/mouse updates.
- Add integration test: toggling panels updates DOM visibility and persists widths.
- Acceptance:
  - Coverage meets baseline standard per `guidance/process/testing_standards.md`

## Ticket 7: Documentation Updates

- Update README or a dedicated layout guide with a brief of the new creative layout behavior and shortcuts.
- Acceptance:
  - Short guide exists, linked from `guidance/feature/creative-layout/implementation_report.md`

## Dependencies

- None beyond current package.json. `react-resizable-panels@^3` already present.

## Review Gates

- Conform to `guidance/process/nextjs_typescript_feature_implementation.md`
- All changes pass full test suite and lint
- Orchestrator review before merge
