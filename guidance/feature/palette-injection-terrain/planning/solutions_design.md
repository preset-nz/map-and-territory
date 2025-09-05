---
ticket: T-006
feature: Palette Injection for Terrain
author: lead-dev@countasone
date: 2025-09-05
level: 1
---

## Overview & Assumptions

- Goal: Remove hardcoded terrain colors in the hex-noise paint path and source them from a resolved palette. Palette also provides a recommended Hex Grid line color.
- Campaign-level palette with per-map override; no persistence changes in this ticket (in-memory only). Save/Load work is in T‑015.
- Canonical terrain keys: `water|plains|forest|hills|mountains`. Settings control presentation (label, color) and attach traits (e.g., `arid`). Renderer consumes only `fill`.
- Built‑in settings shipped (no UI yet): Doom Forge, Space Opera, Event Horizon, Gloomy Garden, Excess Throne, Data Nexus, Street Level. Default preset is Doom Forge.
- Keep scope tight: no UI. Minimal code surface: selector + render integration.

## Interfaces & Contracts

- Types
  - `type TerrainCategory = 'water' | 'plains' | 'forest' | 'hills' | 'mountains'`
  - `type MapPalette = { terrain: Record<TerrainCategory, { fill: string; label?: string }>; grid: { line: string } }`

- Selector
  - File: `src/stores/selectors/palette.ts`
  - `export function resolvePalette(project: Project | null, mapId: string | null): MapPalette` — resolves via map → campaign → preset default (Doom Forge).
  - `export function resolveTerrainFill(palette: MapPalette, key: TerrainCategory): string` — returns `palette.terrain[key].fill` with fallback to `plains`.
  - `export function resolveGridLine(project: Project | null, mapId: string | null, hexgridState?: { color?: string }): string` — returns layer override if set; else palette grid line.

- Render frames
  - Extend `SceneFrame` in `@/render/types` with optional `palette?: MapPalette`.
  - `CanvasViewport` provides `frame.palette = resolvePalette(current, activeMapId)`.
  - Hex-noise paint: replace inline `colorMap` with `resolveTerrainFill(frame.palette, terrainKey)`.
  - Hex Grid adapter: continue to read `state.color` as the override; viewport/backend passes `env.palette?.grid.line` via a small helper until adapter can read from env (follow-up ticket may formalize this).

## Data/State Changes

- Project shape (in-memory only for T‑006):
- `Project` (campaign) gains optional `palette?: MapPalette`.
- `Map` gains optional `palette?: MapPalette`.
- No schema/version bump in this ticket. Defaults live in a module `@/palettes/defaults`.
- Hex Grid override semantics for T‑006:
  - If `hexgrid.state.color` is explicitly set by user, it wins.
  - If `hexgrid.state.color` equals the adapter default (`#000000`) and no user action occurred, use `palette.grid.line` to render. This keeps behavior stable while enabling palette look.

## Testing Strategy

- Unit (new): `src/test/palette/resolvePalette.test.ts`
  - map → campaign → default resolution
  - terrain fill fallback to `plains`
  - grid line inheritance and layer override

- Integration (viewport): `src/test/components/canvas-viewport.palette.test.tsx`
- Render with campaign palette only → hex-noise uses campaign color
- Add map override → hex-noise switches to map color; grid line follows
- With neither set → hex-noise uses Doom Forge preset; expect visible change versus pre‑T‑006 baseline.

- E2E probe (optional, if time): change palette in-memory via a debug hook and assert color change; otherwise defer to T‑012 when UI exists.

## Impact/Risks

- Perf: Resolution is O(1) and memoizable; negligible.
- DX: Central seam (`resolvePalette`) reduces duplication and clarifies precedence.
- UX: Visuals will shift by design due to Doom Forge default; hex grid respects layer override and only uses palette line when default color is untouched.
- ADR links: ADR‑0002 (Plugin Architecture), ADR‑0003 (Default Map Creation Policy) for terrain presence.
