---
ticket: T-012
feature: Map Settings / Palettes
author: Production Coordinator
date: 2025-09-05
level: 2
---

## Milestones & Gates

- M1: Stores + selectors support `settingId` inheritance (unit tests passing).
- M2: Campaign Settings UI picker + preview; persists `project.settingId`.
- M3: Map Settings Advanced override toggle + picker; persists `map.settingId`.
- M4: Plugin migrated to `AppAPI.palette`; integration test/visual probe passes.
- Gate: All acceptance criteria satisfied; E2E happy path green on two presets.

## Tasks

- [ ] Add `settingId?: string` to `Project` and `Map` stores; defaults undefined (owner: @dev, est: 0.5d, deps: none)
- [ ] Update `resolvePalette(project, mapId)` to honor `map.settingId → project.settingId → default` (owner: @dev, est: 0.5d, deps: stores)
- [ ] Extend `AppAPI.palette.settingId()` helper for UI (read-only) (owner: @dev, est: 0.25d, deps: selectors)
- [ ] Register commands: `app.palette.setCampaignSetting`, `app.palette.clearCampaignSetting`, `app.palette.setMapSetting`, `app.palette.clearMapSetting` (owner: @dev, est: 0.5d, deps: stores)
- [ ] Unit tests: selectors inheritance + command handlers (owner: @qa-dev, est: 0.75d, deps: selectors, commands)
- [ ] Campaign Settings UI: picker + preview; invoke `executeCommand` (no store imports) (owner: @ui-dev, est: 1d, deps: commands)
- [ ] Map Settings UI (Advanced): override toggle + picker; invoke `executeCommand` (owner: @ui-dev, est: 1d, deps: Campaign UI)
- [ ] Plugin migration: replace direct colors with `AppAPI.palette` lookups; add minimal integration test (owner: @plugin-dev, est: 0.5d, deps: API stable)
- [ ] E2E flows: campaign change and map override; probe visuals across two presets (owner: @qa, est: 1d, deps: UIs ready)
- [ ] Docs: update `guidance/feature/settings-ux/notes.md` cross-links; add usage notes to code where needed (owner: @docs, est: 0.25d, deps: done)

## Validation Hooks

- `pnpm test`: unit/selectors, command handlers, and derivation suite must pass.
- `pnpm test:e2e`: campaign picker flow and map override flow must pass.

## Rollback / Flag

- Guard with a feature flag `feature.settings.paletteChooser` if needed; fallback to default palette resolution.
