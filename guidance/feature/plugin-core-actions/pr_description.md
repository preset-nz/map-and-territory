Title: feat(core-actions): move New Campaign/Map to plugin; add AppAPI.campaign; align terminology

Summary

This PR migrates the hardcoded “New Campaign” and “New Map” actions to the plugin system, introduces a minimal AppAPI.campaign seam, and aligns terminology toward “Campaign”. It removes host-wired commands from the layout, adds a built-in core plugin, and updates keyboard shortcuts and sidebar integrations accordingly.

Changes

- New: `src/plugin/appapi.ts` providing `AppAPI.campaign` (newCampaign, newMap, deleteMap, selectCampaign, selectMap)
- New: built-in plugin `src/plugin/builtin/core-actions.ts`
  - Commands: `campaign.new`, `map.new`, `map.delete`
  - Toolbar groups: `campaign` (New Campaign), `map` (New Map)
- Updated: `src/components/layout/app-layout.tsx` to load `core-actions`; removed host-only `ensureCommand('host.*')`
- Updated: `src/hooks/use-keyboard-shortcuts.tsx` → `campaign.new`
- Updated: `src/components/layout/app-sidebar.tsx` → `map.new` / `map.delete`
- Plugin context extended: `src/plugin/types.ts` now exposes optional `app?: AppAPI`
- Loader passes AppAPI: `src/plugin/loader.ts`
- Deleted unused: `src/plugin/builtin/new-campaign.ts`, `src/plugin/builtin/map-crud.ts`
- Docs: Added ADR-0014 and feature docs under `guidance/feature/plugin-core-actions/*`

Rationale / Decisions

- ADR-0014: “Campaign Terminology and AppAPI.campaign Seam” formalizes terminology and the new seam.
- Commands/toolbar groups standardized: `campaign.new`, `map.new`, `map.delete`; groups `campaign` and `map`.

Testing & Quality Gates

- Unit/Integration: green (`pnpm test`).
- E2E: green per local run (uses unchanged labels “New Campaign”, “New Map”).
- Lint/Format: green.

Backward Compatibility

- Not required. Old built-ins removed; command IDs migrated to new scheme.

Docs

- Planning/requirements/design for this feature: `guidance/feature/plugin-core-actions/`.
- ADR: `guidance/adrs/0014-campaign-terminology-and-appapi-seam.md`.

Screenshots

- N/A (UI labels unchanged; toolbar now sourced from plugin contributions).

Linked Ticket(s)

- Follow-up proposed: T-016 Terminology Alignment (Campaign <-> Project, Scene viewer rename).

Checklist

- [x] Commands registered via plugin loader
- [x] Toolbar renders from contributions
- [x] AppAPI seam documented and available via PluginContext
- [x] Tests green
