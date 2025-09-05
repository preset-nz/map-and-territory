---
ticket: T-012
feature: Map Settings / Palettes
author: Lead Dev
date: 2025-09-05
level: 2
---

## Overview & Assumptions

- Introduce `settingId` at Campaign (`Project`) and Map levels; runtime derives `MapPalette` via existing `makePaletteFromSetting(setting)`.
- Inheritance: `map.settingId ?? project.settingId ?? DefaultSettingId` with no partial merges.
- UI surfaces: Campaign Settings gets the primary picker; Map Settings exposes an “Advanced” group with override toggle + local picker.
- One existing plugin must migrate to `AppAPI.palette` for colors/labels; no hard-coded terrain constants.
- We keep palette objects ephemeral (runtime only); stores persist IDs to maintain single source of truth.

## Interfaces & Contracts

- Stores (internal)
  - `Project`: add optional `settingId: string | undefined`.
  - `Map`: add optional `settingId: string | undefined`.
  - Selectors (existing): `resolvePalette(project, mapId)` continues to return `MapPalette`; update to respect `settingId` if not already.
  - Note: stores are accessed only within AppAPI/command handlers; UIs and plugins do not import stores directly.

- App API (`src/appapi/index.ts`)
  - Read existing: `palette.get()`, `terrainFill(key)`, `gridLine()`, `list(category?)`, `fillById(id)` — ensure they resolve via active `settingId` chain.
  - Optional helpers: `palette.settingId(): string | null` for UI; defer mutation API.

- Commands (`src/lib/commands.ts`)
  - Register write commands; handlers perform store mutations:
    - `app.palette.setCampaignSetting` → payload `{ settingId: string }`.
    - `app.palette.clearCampaignSetting` → clears `project.settingId`.
    - `app.palette.setMapSetting` → payload `{ mapId: string, settingId: string }`.
    - `app.palette.clearMapSetting` → payload `{ mapId: string }`.
  - UIs invoke via `executeCommand(...)`; success returns updated active `settingId`.

- Palettes Domain
  - Settings source: `src/palettes/settings.ts` with `getAllSettings()` and lookup by id.
  - Derivation: `src/palettes/derive.ts` `makePaletteFromSetting(setting)` remains the only construction path for `MapPalette`.

## Data/State Changes

- Schema deltas (in-memory now; persistence handled by T‑015):
  - `Project`: `{ …, settingId?: string }` default `undefined`.
  - `Map`: `{ …, settingId?: string }` default `undefined`.
  - Default resolution uses preset default id (current: `doom-forge`).

## UX Details

- Campaign Settings Panel (treat as first-party plugin)
  - Control: single-select of presets; preview strip of swatches + `gridLine`.
  - Action: calls `executeCommand('app.palette.setCampaignSetting',{settingId})`; re-renders maps without overrides.

- Map Settings Panel (Advanced; treat as first-party plugin)
  - Toggle: “Override campaign setting for this map”.
  - When enabled: local preset selector; calls `executeCommand('app.palette.setMapSetting',{mapId,settingId})`.
  - When disabled: calls `executeCommand('app.palette.clearMapSetting',{mapId})`; map resolves to campaign setting.

## Testing Strategy

- Unit
  - Selector inheritance matrix for `resolvePalette()`.
  - Derivation invariants: `makePaletteFromSetting()` returns stable colors per setting id.
  - App API reads reflect resolved setting.

- Integration
  - Changing campaign setting updates non-overridden maps next render.
  - Enabling/disabling map override switches palette deterministically.

- E2E
  - Campaign change flow and Map Advanced override flow across two presets.
  - Plugin visual probe: swatch expectations vary by active preset.

## Impact/Risks

- Perf: derivation O(n) on change; cache derived palette by `settingId` if change frequency causes churn.
- DX/UX: placing map override under Advanced reduces accidental divergence.
- Command Discipline: enforcing command-only mutations keeps plugin/first-party UI decoupled from store internals.
- ADR links: 0003 map default creation policy, 0007 layer rendering pipeline/masking, 0011 render backend abstraction.
