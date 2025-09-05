---
title: Settings UX — Notes for Implementation
date: 2025-09-05
status: Draft
related: T-006 Palette Injection for Terrain, T-012 Map Settings / Palettes
---

Scope

- Lock-in: Terrain “settings” are list-based (mood palette + terrains with baseType, traits, color). We derive a lightweight runtime MapPalette for rendering.
- UX goal (T-012): Allow choosing a setting at Campaign level with optional Map override; layer plugins read display names/colors from the resolved setting/palette.

What Exists Now (after T-006)

- Settings model
  - File: `src/palettes/settings.ts`
  - Types: `BaseTerrainType`, `TerrainTrait`, `TerrainType`, `ColorPalette { gridLine }`, `TerrainSetting`.
  - Presets: Doom Forge, Space Opera, Event Horizon, Gloomy Garden, Excess Throne, Data Nexus, Street Level, Brittle Empire, Hostile Waters (water-only variants).

- Derivation seam
  - File: `src/palettes/derive.ts`
  - `makePaletteFromSetting(setting) -> MapPalette` (first entry per baseType, label+fill; gridLine from setting.palette.gridLine).

- Runtime palette
  - Types: `src/palettes/types.ts` → `MapPalette`, `TerrainCategory`.
  - Presets: `src/palettes/presets.ts` → derived from settings; immutability preserved (getter + deep clone pattern).
  - Default: `src/palettes/defaults.ts` → `DefaultPalette = Presets.DoomForge`.

- Rendering + stores
  - Store (in-memory only): `Project.palette?: MapPalette`, `Map.palette?: MapPalette` (override). No persistence/UI yet.
  - Selectors: `src/stores/selectors/palette.ts` → `resolvePalette(project,mapId)`, `resolveTerrainFill(palette,key)`, `resolveGridLine(project,mapId,hexgridState)`.
  - Renderer: `SceneFrame.palette` and `RenderEnv.palette`; Hex Noise + Hex Grid consume palette (Hex Grid respects layer color override).

- Public API
  - File: `src/appapi/index.ts` → `AppAPI.palette` facet (read-only):
    - `get(): MapPalette` — resolved palette (map → campaign → default).
    - `terrainFill(key: TerrainCategory | 'desert'): string` — color for canonical keys; 'desert' maps to plains presentation.
    - `gridLine(): string` — recommended hex grid line color.
    - `list(category?: BaseTerrainType): TerrainType[]` — terrains from active setting (MVP: Doom Forge until chooser exists).
    - `fillById(id: string): string` — color for a specific terrain entry; falls back to category fill.

What To Implement (T-012)

- UX surfaces
  - Campaign Settings panel: select “Setting” (list from `TerrainSettings.getAllSettings()`); show mood palette and preview swatches.
  - Map override toggle: “Override campaign setting for this map” + local picker.
  - Optional: Show variants (entries) per base type in a read-only list; actual selection by id is a follow-up.

- Store schema (persistence)
  - Add `Project.settingId?: string` and `Map.settingId?: string` for chosen setting.
  - On save/load (T-015): versioned serialization; derive `MapPalette` at runtime via `makePaletteFromSetting(getSetting(settingId))`.
  - Keep `Project.palette` / `Map.palette` optional for advanced overrides (fine-grained color edits); UX writes to `settingId` primarily.

- API extensions (if needed)
  - `AppAPI.palette.settingId(): string | null` — active setting id (map → campaign → default-id 'doom-forge').
  - `AppAPI.palette.setSetting(id: string, scope: 'campaign' | 'map')` — optional mutation if we allow plugins to switch settings (guarded by capability).
  - `AppAPI.palette.label(key: TerrainCategory): string` — convenience for UI labels.
  - `AppAPI.palette.entries(category?: BaseTerrainType)` — alias for `list()` once setting chooser is in place.

- Layer plugins integration
  - Read colors/labels via `AppAPI.palette` (never hardcode). For future variants: allow plugins to store a `terrainId` and resolve via `fillById(id)`.
  - Hex Noise Properties: display names from `AppAPI.palette`; optional color swatches in selector.

Testing

- Unit: selectors (inheritance, overrides, grid line), makePaletteFromSetting(), AppAPI.palette facade.
- Integration: switching setting id updates terrain/hex grid colors on next render.
- E2E: setting change flows in Campaign and Map panels; visual probe for two presets.

Notes & Constraints

- Performance: derivation is O(n) over entries and runs on change; cache by `settingId` if needed.
- Accessibility: preset validation enforces distinct terrain colors and grid line contrast; continue to gate in tests.
- Backward compatibility: none required yet; current project format does not persist palettes.
