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

- [ ] Add SPI types to `plugin/types.ts` (owner: @dev, est: 2h)
- [ ] Extend loader with scene/env/tools registries (owner: @dev, est: 4h, deps: SPI types)
- [ ] Add `plugin/bootstrap.ts` and wire main/worker (owner: @dev, est: 3h)
- [ ] Paper plugin: implement `SceneAdapter` (compute rect, pre/post) (owner: @dev, est: 3h)
- [ ] Hexgrid plugin: implement `EnvProvider` for `env.grid` (owner: @dev, est: 2h)
- [ ] Canvas2D backend: delegate to scene/env; remove outline/grid logic (owner: @dev, est: 4h, deps: registries)
- [ ] Remove worker direct adapter imports; use bootstrap (owner: @dev, est: 1h, deps: bootstrap)
- [ ] Freeform plugin: implement Tool SPI for paint/erase (owner: @dev, est: 4h)
- [ ] CanvasViewport: forward pointer events to active tool; delete inline paint/erase (owner: @dev, est: 3h, deps: Tool SPI)
- [ ] Delete `paper-viewport.tsx`; update imports if any (owner: @dev, est: 0.5h)
- [ ] Remove `render/env.ts` helpers; move math into Paper plugin (owner: @dev, est: 0.5h, deps: Paper scene)
- [ ] Update tests (unit/integration/E2E) to exercise new SPIs (owner: @dev, est: 1d)

## Validation Hooks

- `pnpm test` for unit/integration; ensure coverage ≥ 80%.
- `pnpm test:e2e` for worker/fallback parity and toolbar/tooling enablement.

## Rollback / Flag

- Feature is refactor-only with parity; if regressions occur, guard with local env flag `NEXT_PUBLIC_RENDER_SPI=0` (optional patch) to retain old paths during debug only.
