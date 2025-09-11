---
ticket: T-019
feature: plugin-properties-panel
owner: product-owner
date: 2025-09-11
level: 2
---

## Problem & Value

- Properties panel currently has hardcoded components (`CampaignProperties`, `MapProperties`, `LayerPropertiesGeneric`) that cannot be extended by plugins
- Plugins cannot contribute custom property panels for their features, limiting extensibility
- Core application functionality is tightly coupled to the properties panel instead of being plugin-based (no dogfooding)

## In Scope

- Convert ALL property definitions to plugins (no back-compat path): campaign, map, paper, hexgrid, freeform/hex-noise.
- Reuse current `PropertySchema`/`FieldDef` system; move registrations into plugin `activate()` calls.
- Minimal schema extensions required for parity:
  - `checkbox` field kind.
  - `disabledWhen` on fields: `{ path: string; equals?: unknown; notEquals?: unknown }`.
  - `optionsProvider?: (app) => { value: string; label: string }[]` for dynamic selects (e.g., palette entries).
- Properties panel becomes a generic renderer over the registry; remove hardcoded campaign/map components.
- Unload behavior: unregister schemas when plugins are unloaded.

## Out of Scope

- A new “propertyTemplates” DSL (richer declarative system). Tracked as a forward design here: guidance/feature/plugin-properties-panel/property_templates_v2.md
- Custom React components in plugins (plugins provide data; panel renders UI).
- Advanced validation beyond min/max/step; complex expressions for conditions.

## Acceptance Criteria

- [ ] All property UIs (campaign, map, paper, hexgrid, freeform/hex-noise) are sourced from plugin-registered schemas.
- [ ] Properties panel renders from registry for `campaign`, `map`, and `layer:<typeId>` selections; no hardcoded components remain.
- [ ] Dynamic select options work via `optionsProvider` (e.g., palette entries) and `disabledWhen` covers map override enable/disable.
- [ ] Unloading a plugin removes its schema; panel hides those groups without errors.
- [ ] Unit tests cover register/unregister, disabledWhen, and optionsProvider; integration tests cover selection→schema→render for each type.

## Risks & Assumptions

- Assumes minimal extensions to `PropertySchema` are sufficient for current UIs.
- Risk: dynamic options may tempt custom logic in core—mitigated via `optionsProvider` helper.
- Future: richer propertyTemplates may supersede `PropertySchema`; we maintain a registry interface that can accept a union in v2 (see property_templates_v2.md).
