---
ticket: T-012
feature: Map Settings / Palettes
owner: Georg
date: 2025-09-05
level: 2
---

## Problem & Value

- Unify thematic “settings” (palette + terrain labels/colors) selection to reduce hard‑coded colors and ensure visual consistency across maps.
- Allow campaign‑level default with per‑map override to balance standardization with creative flexibility (platform optionality).
- Expose a predictable, read‑only palette surface for plugins and rendering so layers resolve colors/labels from a single source of truth.

## In Scope

- Campaign Settings: choose a `TerrainSetting` from presets; show mood palette preview including `gridLine` and swatches.
- Map Override: optional toggle to override campaign setting for a specific map; local setting picker when enabled.
- Map UI Placement: put the override toggle + selector under an "Advanced" group in Map Settings.
- Inheritance Rules: resolution order `map.settingId → project.settingId → DefaultSetting` (no partial merge).
- Persistence (IDs only): add `Project.settingId?: string` and `Map.settingId?: string`; runtime derives `MapPalette` via `makePaletteFromSetting()`.
- Read APIs: confirm/extend `AppAPI.palette.get()`, `terrainFill()`, `gridLine()`, `list()` to reflect the active resolved setting.
- UX guardrails: keep selection simple; no advanced “unlock” controls in the properties panel yet.
- Command-Only Mutations: UI changes must invoke commands (no direct store access) to set/clear campaign or map `settingId`.
- Plugin Migration: migrate the existing plugin to consume `AppAPI.palette` (no hard‑coded colors/labels); verify behavior across multiple presets.

## Out of Scope

- Fine‑grained color editing or custom palette authoring; per‑terrain entry selection by id is deferred.
- Plugin/app mutation API to change settings (`setSetting(...)`) — follow‑up ticket pending capability design.
- Migration/healing for existing maps after setting changes (e.g., conflicting layer states); tracked as a separate follow‑up.
- Property panel “unlockable” capability; not implemented — UI remains basic toggle + picker.
- Storage/versioning changes beyond adding the two setting IDs (full project format/versioning handled under T‑015).

## Acceptance Criteria

- [ ] Given a campaign with setting X and a new map without override, the map renders using palette derived from X; `AppAPI.palette.get()` returns colors matching X.
- [ ] Given a campaign with setting X and a map override to Y, that map renders with Y while other maps continue to render with X.
- [ ] Toggling off a map override reverts that map to the campaign setting on next render without stale colors.
- [ ] In one campaign with two maps (A,B), with campaign setting X, when A overrides to Y and B has no override, A renders with Y and B renders with X; switching active map does not change either map’s resolved palette.
- [ ] Campaign Settings UI lists all presets, shows a preview strip (terrain swatches + `gridLine`) and persists `project.settingId`.
- [ ] Map Settings UI includes an “Override campaign setting for this map” toggle and, when enabled, a local picker that persists `map.settingId`.
- [ ] All mutations go through commands (e.g., `app.palette.setCampaignSetting`, `app.palette.setMapSetting`, `app.palette.clearMapSetting`); UIs and plugins do not import stores.
- [ ] `resolvePalette(project, mapId)` returns a palette consistent with the inheritance rules for all combinations (map only, project only, none → default).
- [ ] No advanced/unlock controls are present in the properties panel; selection flows are limited to setting choose/override only.
- [ ] The existing plugin reads colors/labels exclusively via `AppAPI.palette` and contains no direct color constants for terrains.
- [ ] Visual check: with presets A and B selected (e.g., Doom Forge and Space Opera), the plugin’s visuals update to match the active setting without code changes.

## Risks & Assumptions

- Switching settings on an established map may produce visually inconsistent results with existing content; we explicitly defer automated remediation (separate ticket).
- We assume `DefaultSetting` exists and maps to a valid preset (current default: Doom Forge) for projects/maps with no explicit IDs.
- Derivation cost is acceptable (O(n) over terrain entries) and can be cached by `settingId` if needed later.
- Plugins and layers must read colors/labels via `AppAPI.palette`; direct color constants are considered non‑compliant and will be refactored separately.
- Persistence stores setting IDs only; palette objects remain runtime‑derived to keep a single source of truth.
