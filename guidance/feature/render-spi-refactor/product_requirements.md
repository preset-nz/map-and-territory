---
ticket: T-RENDER-SPI
feature: render-spi-refactor
owner: product@countasone
date: 2025-09-11
level: 2
---

## Problem & Value

- Rendering logic for paper, grid hints, and paint/erase is split across core (`canvas2d.ts`, `canvas-viewport.tsx`) instead of plugins, creating brittleness and slowing iteration.
- Worker directly imports layer adapters, bypassing the plugin loader; weakens the single source of truth promise.
- Consolidating drawing/tooling into plugins increases optionality, enables true platform extensibility, and reduces hidden coupling.

## In Scope

- Introduce Render SPI: Scene Adapter, Env Providers, Tool handlers (pointer pipeline).
- Move paper fill/outline and grid hint derivation into plugins (paper, hexgrid).
- Move paint/erase logic into the Freeform plugin via Tool SPI.
- Worker uses plugin bootstrap; remove direct adapter imports.
- Keep Canvas2D backend limited to frame orchestration (DPR clear, camera transform, layer loop).

## Out of Scope

- WebGL/Vite/Offscreen perf optimizations beyond refactor parity.
- Third-party loading of external plugins at runtime (still builtin set).
- Backward compatibility/migration for legacy APIs.

## Acceptance Criteria

- [ ] No paper/outline drawing code in `src/render/backends/canvas2d.ts`.
- [ ] No paint/erase logic in `src/components/map/canvas-viewport.tsx`.
- [ ] `src/render/worker.ts` initializes adapters via plugin bootstrap (no direct `registerLayerType` imports).
- [ ] Paper plugin provides scene adapter (`computePaperRect`, `preRender`, `postRender`).
- [ ] Hexgrid plugin provides `EnvProvider` for `env.grid`.
- [ ] Freeform plugin registers `paint`/`erase` tools that update layer state via AppAPI.
- [ ] All unit/integration/E2E tests green; coverage ≥ 80%.

## Risks & Assumptions

- Tool handlers in plugins must be performant (pointer move throttling, dedupe last‑painted cell).
- Worker/bootstrap must remain bundler-safe (static imports only in this phase).
- Single Scene Adapter assumption (paper) is acceptable for MVP; revisit if multiple chrome providers emerge.
