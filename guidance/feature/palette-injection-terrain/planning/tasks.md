---
ticket: T-006
feature: Palette Injection for Terrain
author: production-coordinator@countasone
date: 2025-09-05
level: 1
---

## Milestones & Gates

- M1: Selector + defaults land; unit tests ≥80% on palette module. **⚠️ BLOCKED - Tests Missing**
- M2: Renderer integration (viewport + backend) green with existing tests. **✅ COMPLETE**

## Tasks

- [x] Add types and defaults (owner: @dev, est: 1h) **✅ COMPLETE**
  - Files: `src/palettes/defaults.ts`, `src/palettes/presets.ts`, `src/palettes/types.ts` **✅ DONE**
  - Define `MapPalette`, `TerrainCategory`; export preset constants for: Doom Forge (default), Space Opera, Event Horizon, Gloomy Garden, Excess Throne, Data Nexus, Street Level. **✅ DONE**
  - `defaults.ts` re‑exports `DefaultPalette = Presets.DoomForge`. **✅ DONE**
  - Validation: unit test imports compile. **✅ DONE**

- [x] Implement selectors (owner: @dev, est: 1h, deps: types) **✅ COMPLETE**
  - Files: `src/stores/selectors/palette.ts` **✅ DONE**
  - `resolvePalette`, `resolveTerrainFill`, `resolveGridLine` per solutions_design; default to Doom Forge when undefined. **✅ DONE**
  - Tests: `src/test/palette/resolvePalette.test.ts` (inheritance, overrides, grid line, plains fallback). **❌ MISSING**

- [x] Extend render frame (owner: @dev, est: 0.5h, deps: selectors) **✅ COMPLETE**
  - Files: `@/render/types` add optional `palette?: MapPalette`. **✅ DONE**
  - Wire in `CanvasViewport` to pass `frame.palette = resolvePalette(current, activeMapId)`. **✅ DONE**
  - Tests: Typecheck + existing render tests still pass. **✅ DONE**

- [x] Replace terrain color map in viewport fallback (owner: @dev, est: 1h, deps: frame) **✅ COMPLETE**
  - Files: `src/components/map/canvas-viewport.tsx` **✅ DONE**
  - Use `resolveTerrainFill(frame.palette, terrainKey)`. **✅ DONE**
  - Tests: lightweight integration test rendering different palettes. **❌ MISSING**

- [x] Worker backend parity (owner: @dev, est: 1h, deps: frame) **✅ COMPLETE**
  - Files: `src/render/backends/canvas2d.ts` **✅ DONE**
  - Ensure `frame.palette` is read and used in adapters/draw path if needed. **✅ DONE**
  - Tests: unit/integration render parity check. **❌ MISSING**

- [x] Hex Grid line color resolution (owner: @dev, est: 1h, deps: selectors) **✅ COMPLETE**
  - Files: `src/components/map/canvas-viewport.tsx` and/or `src/layers/adapters/hexgrid.ts` **✅ DONE**
  - Rule: use `state.color` when user-set; otherwise palette `grid.line`. For T‑006, treat adapter default `#000000` as "not user-set". **✅ DONE**
  - Tests: override and inheritance tests. **❌ MISSING**

- [ ] Add preset smoke test (owner: @dev, est: 0.5h) **❌ MISSING**
- Ensure with no campaign/map palette set, renderer uses Doom Forge colors; snapshot or color probe assertion.

## New Critical Tasks (Discovered in Review)

- [ ] **Store Integration** (owner: @dev, est: 2-3h) **⚠️ CRITICAL**
  - Add `palette?: MapPalette` field to Project and Map interfaces
  - Implement `setCampaignPalette()`, `setMapPalette()` store methods
  - Ensure proper invalidation and re-rendering on palette changes
  - Impact: Without this, runtime palette updates won't work

- [ ] **Consolidate Color Resolution** (owner: @dev, est: 1h) **📋 REFACTOR**
  - Update `src/layers/adapters/hex-noise.ts:76` to use `resolveTerrainFill` selector
  - Remove duplicate terrain color resolution logic
  - Maintains DRY principle and centralized logic

## Validation Hooks

- Unit: `pnpm test` with new `src/test/palette/resolvePalette.test.ts` covering resolution ≥80%. **❌ FAILING**
- Integration: `pnpm test` rendering checks for viewport/backend usage. **❌ FAILING**
- Lint/Types: `pnpm lint` and `pnpm build` remain green. **✅ PASSING**

## Rollback / Flag

- Changes are additive and behind palette defaults. Rollback by reverting selector usage and leaving defaults in place.
