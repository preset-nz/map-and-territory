---
ticket: T-RENDER-SPI
feature: render-spi-refactor
author: production@countasone
date: 2025-09-11
level: 2
---

## Milestones & Gates

- M1: SPI scaffolding and registries land; no behavior change; tests green.
- M2: Scene/Env moved to plugins; parity visual checks; tests green.
- M3: Tool SPI live; CanvasViewport slimmed; tests green.

## Tasks

- [x] Add SPI types to `plugin/types.ts` (owner: @dev, est: 2h)
- [x] Extend loader with scene/env/tools registries (owner: @dev, est: 4h, deps: SPI types)
- [x] Add `plugin/bootstrap.ts` and wire main/worker (owner: @dev, est: 3h)
- [x] Paper plugin: implement `SceneAdapter` (compute rect, pre/post) (owner: @dev, est: 3h)
- [x] Hexgrid plugin: implement `EnvProvider` for `env.grid` (owner: @dev, est: 2h)
- [x] Canvas2D backend: delegate to scene/env; remove outline/grid logic (owner: @dev, est: 4h, deps: registries)
- [x] Remove worker direct adapter imports; use bootstrap (owner: @dev, est: 1h, deps: bootstrap)
- [x] Freeform plugin: implement Tool SPI for paint/erase (owner: @dev, est: 4h)
- [x] CanvasViewport: forward pointer events to active tool; delete inline paint/erase (owner: @dev, est: 3h, deps: Tool SPI)
- [x] Delete `paper-viewport.tsx`; update imports if any (owner: @dev, est: 0.5h)
- [x] Remove `render/env.ts` helpers; move math into Paper plugin (owner: @dev, est: 0.5h, deps: Paper scene)
- [x] Update tests (unit/integration/E2E) to exercise new SPIs (owner: @dev, est: 1d)

## Next Steps

- Consolidate SPI docs: finalize solutions_design.md with the landed SceneAdapter, EnvProvider, and Tool SPI seams; add usage examples and invariants.
- Visual regression: add Playwright screenshot baselines for both hex orientations to guard paper/grid/hex alignment and invalidation redraws.
- Performance pass: measure worker init/resize costs; batch renders on resize/zoom; verify OffscreenCanvas fallback parity.
- Plugin lifecycle: define deactivate cleanup expectations and add tests for unload/reload idempotency.
- Optional flag decision: either remove the rollback flag note or implement `NEXT_PUBLIC_RENDER_SPI` gate behind a dev-only guard.
- Telemetry hooks (optional): add lightweight counters for adapter draw timings and invalidation causes for future tuning.

## Validation Hooks

- `pnpm test` for unit/integration; ensure coverage ≥ 80%.
- `pnpm test:e2e` for worker/fallback parity and toolbar/tooling enablement.

## Rollback / Flag

- Feature is refactor-only with parity; if regressions occur, guard with local env flag `NEXT_PUBLIC_RENDER_SPI=0` (optional patch) to retain old paths during debug only.
