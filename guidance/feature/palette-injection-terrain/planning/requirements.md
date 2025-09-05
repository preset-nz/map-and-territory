---
ticket: T-006
feature: Palette Injection for Terrain
owner: product@countasone (PO)
date: 2025-09-05
level: 1
status: Draft
---

## Problem & Value

- Terrain colors are hardcoded in the renderer, blocking per‑map style and violating theming goals.
- A map‑level palette enables coherent aesthetics, faster style iterations, and testable seams.
- Aligns with platform thinking: separates policy (palette) from mechanism (render).

## In Scope

- Palette lives at the campaign level with per‑map override capability.
- Canonical terrain taxonomy for MVP: `water`, `plains`, `forest`, `hills`, `mountains`.
- “Desert” is represented as `plains` with an `arid` trait provided by settings (no special aliasing in code).
- Inject resolved palette into render frames and replace hardcoded color map in hex‑noise paint mode.
- Palette provides a recommended Hex Grid line color; Hex Grid layer may override it per‑map.
- Default palette for backward compatibility; no UI changes in this ticket.
- Unit tests for palette inheritance, overrides, and live update on palette change.

## Out of Scope

- Palette editing UI, presets, or per‑layer overrides (see T-012).
- New terrain categories, shading models, or sprite systems.

## Acceptance Criteria

- [x] Renderer sources terrain colors from the resolved palette; no hardcoded hex values remain in draw path. **✅ PASS**
- [x] Resolution order: `Map.palette?.terrain[k]` → `Campaign.palette?.terrain[k]` → `DefaultPalette.terrain[k]` → final fallback `DefaultPalette.terrain.plains`. **✅ PASS**
- [ ] Updating `Campaign.palette` updates all maps that do not override, without reload. **❌ FAIL - Store methods missing**
- [ ] Updating `Map.palette` only affects that map and takes precedence over campaign. **❌ FAIL - Store methods missing**
- [x] Default palette applied if neither map nor campaign provides one; visuals remain close to current baseline. **✅ PASS**
- [ ] Unit tests cover inheritance, overrides, category mapping, and re-render on palette change (≥80% coverage for palette module). **❌ FAIL - No tests exist**
- [x] Hex Grid line color resolves via palette unless `hexgrid.state.lineColor` is set, in which case the layer value wins. **✅ PASS**
- [x] Built‑in settings are available in code (no UI): Doom Forge, Space Opera, Event Horizon, Gloomy Garden, Excess Throne, Data Nexus, Street Level. **✅ PASS**
- [x] Default campaign palette resolves to the first preset (Doom Forge) when none is set, producing an intentional visual change after T‑006. **✅ PASS**

## Acceptance Criteria Compliance Summary

**Overall Status: 6/9 criteria met (67% complete)**

✅ **PASSING (6)**:

- Renderer uses palette colors (no hardcoded values)
- Resolution hierarchy implemented correctly
- Default palette applied when none set
- Hex grid line resolution with user override
- Built-in presets available (8 presets including bonus)
- Default resolves to Doom Forge preset

❌ **FAILING (3)**:

- Campaign palette updates - **BLOCKED: Store methods missing**
- Map palette updates - **BLOCKED: Store methods missing**
- Unit test coverage - **BLOCKED: No tests exist**

**Next Steps**: Implement store integration and comprehensive test suite to achieve full compliance.

## Risks & Assumptions

- Assumes terrain key on layer state is one of the defined categories.
- Rendering remains deterministic for tests; palette changes trigger a single invalidation.
- Keep API surface minimal to ease later expansion in T-012.
- Introduce `Campaign.palette?: MapPalette` and optional `Map.palette?: MapPalette` (override). No persistence work in T‑006 (Save/Load deferred to T‑015).

## Data Model & Resolution

- Types
  - `type TerrainCategory = 'water' | 'plains' | 'forest' | 'hills' | 'mountains'`
  - `type TerrainTrait = 'arid' | 'vast' | 'dense' | 'sparse' | 'clustered' | 'toxic' | 'burning' | 'magical' | 'haunted' | 'unstable' | 'artificial' | 'corrupted' | 'ruined' | 'frozen'`
  - `type MapPalette = { terrain: Record<TerrainCategory, { fill: string; label?: string }>; grid: { line: string } }`
- Store additions (no UI in this ticket)
  - `Project` (campaign) gains optional `palette?: MapPalette`
  - Each `Map` gains optional `palette?: MapPalette`
- Resolution order in renderer and selectors
  1. `activeMap.palette?.terrain[key]`
  2. `campaign.palette?.terrain[key]`
  3. `Preset.DoomForge.terrain[key]` (as default preset)
  4. `Preset.DoomForge.terrain.plains`

- Hex Grid line color resolution
  1. `hexgrid.state.lineColor`
  2. `activeMap.palette?.grid.line`
  3. `campaign.palette?.grid.line`
  4. `DefaultPalette.grid.line`

## Taxonomy vs Presentation

- Canonical keys are stable for persistence and logic. Presentation (names/colors) comes from settings.
- Settings override `label` and `fill` per canonical key; traits (notably `arid`) are metadata for future rules/generation.
- Renderer uses only `fill` for T‑006; traits remain unused but carried for forward compatibility.

## Test Plan Addendum

- Inheritance test: set `campaign.palette.terrain.water.fill = '#00a'`; maps without overrides render water with `#00a`.
- Override test: set `map.palette.terrain.water.fill = '#09f'`; only that map uses `#09f`.
- Fallback test: delete `map.palette`, delete `campaign.palette`; renderer uses default palette.
- Update propagation: changing `campaign.palette` triggers re-render for all non-overridden maps in current project.
- Trait test: for a map using an “arid plains” setting, renderer uses the `plains` color from that setting (desert presentation) without special‑case logic.
- Hex Grid override test: set `hexgrid.state.lineColor = '#abcabc'`; renderer uses `#abcabc` ignoring palette line color.
- Hex Grid palette inheritance test: unset layer lineColor; palette line resolves via map → campaign → default.
- Default preset test: with no campaign/map palette, renderer uses Doom Forge colors for terrain and grid line.

---

Note: This `requirements.md` supersedes the initial draft in `product_requirements.md`. Once approved, that file can be removed to avoid duplication.
