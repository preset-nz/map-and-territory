---
ticket: T-RENDER-SPI
feature: render-spi-refactor
author: leaddev@countasone
date: 2025-09-11
level: 2
---

## Overview & Assumptions

- Host focuses on orchestration: DPR clear, camera transforms, layer iteration; plugins own domain drawing and tools.
- Exactly one active `SceneAdapter` (Paper) provides paper rect and scene chrome; multiple `EnvProvider`s merge into `RenderEnv`.
- No backward compatibility; builtin plugins migrate in lockstep; tests updated accordingly.
- Worker and main thread initialize the same plugin set via a shared bootstrap.

## Interfaces & Contracts

- Types (new/extended):
  - `src/plugin/types.ts`
    - `export interface SceneAdapter { computePaperRect(input): Rect; preRender(ctx, frame, env): void; postRender(ctx, frame, env): void }`
    - `export interface EnvProvider { priority?: number; provide(frame: SceneFrame): Partial<RenderEnv> }`
    - `export interface ToolHandler { id: string; onPointerDown/Move/Up(pt, env, ctx): void }`
    - `export interface PluginModule { scene?: SceneAdapter; envProviders?: EnvProvider[]; tools?: ToolHandler[]; }`
  - `src/layers/types.ts`
    - `RenderEnv` remains host-assembled; now receives merged provider output (e.g., `grid`).

- Loader registry additions (`src/plugin/loader.ts`):
  - `registerSceneAdapter(scene: SceneAdapter)` (singleton; last registration wins; logged warning on overwrite).
  - `registerEnvProvider(provider: EnvProvider)`; `composeEnv(frame): RenderEnv` merges providers by `priority` ascending, shallow merge.
  - `registerTools(tools: ToolHandler[])`; `getTool(id)`; `getActiveTool()` based on layout store.

### Grid Invariant (new)

- Invariant: `env.grid` is always present whenever a Hexgrid layer exists.
- Implementation: a core `EnvProvider` is registered at module load in `plugin/loader.ts` with `priority: -100` that derives `{ size, orientation }` from the Hexgrid layer state. Plugin `hexgrid` provider keeps `priority: 0` and may override.
- Impact: removed ad‑hoc grid fallbacks from `Canvas2DBackend` and `CanvasViewport`. Both now consume `composeEnv(frame)` exclusively.

- Backend changes (`src/render/backends/canvas2d.ts`):
  - Remove paper outline logic and `deriveGridHint`; call `scene.preRender`/`postRender`; use `composeEnv(frame)` for `env`.
  - Keep layer loop calling `adapter.drawMain(...)`.

- Worker bootstrap (`src/plugin/bootstrap.ts`):
  - `bootstrapPluginsFor('main'|'worker')` imports builtin manifests/modules and calls `loadPluginsWithPriority(...)`.
  - `src/render/worker.ts` replaces direct `registerLayerType(...)` imports with `bootstrapPluginsFor('worker')`.

- CanvasViewport (`src/components/map/canvas-viewport.tsx`):
  - Replace paint/erase logic with pointer forwarding: normalize pointer to paper-space and call `getActiveTool()?.onPointer…` with `{ app: AppAPI, selection, updateLayerState }`.

## Data/State Changes

- None to persisted campaign schema. Freeform/Hexgrid/Paper layer states unchanged.
- Layout store continues to hold `activeTool` (string); tools register cursors via existing `registerToolCursor`.

## Testing Strategy

- Unit
  - `SceneAdapter.computePaperRect` math and `pre/postRender` invocation order.
  - `EnvProvider` composition and `grid` hint correctness.
  - Tool handler: calling into AppAPI and updating stores with dedupe of last cell.
- Integration
  - Canvas2D backend uses scene/env providers; visual parity for paper/bg and hexgrid.
  - Freeform paint/erase via pointer events updates layer state; invalidation keys trigger redraw.
  - Alignment regression: Hexgrid, Hex Noise, and Freeform draw the center hex aligned to grid for both orientations (see `src/test/alignment.test.ts`).
- E2E
  - Toolbar enables paint/erase only when `activeLayerIs:freeform` and grid visible.
  - Rendering worker path and fallback path produce consistent output for core flows.

## Impact/Risks

- Perf: Slight overhead from env composition; negligible vs draw time. Tool handlers must throttle move events.
- DX/UX: Clearer ownership; plugins are discoverable; host code smaller. Toolbar/capabilities unchanged.
- ADR links: `guidance/adrs/0002-plugin-architecture.md` for plugin SOT; `guidance/adrs/0008-fog-of-war-plugin.md` as future env provider example.
