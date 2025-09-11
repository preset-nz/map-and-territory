---
ticket: T-019
feature: plugin-properties-panel
author: lead-dev
date: 2025-09-11
level: 2
---

## Overview & Assumptions

- Properties panel is a generic renderer over the existing `PropertySchema` registry.
- ALL property definitions move into plugins (campaign, map, paper, hexgrid, freeform/hex-noise) and register during `activate()`.
- We extend `PropertySchema` minimally to cover current UI: `checkbox`, `disabledWhen`, `optionsProvider`.
- No custom React from plugins; plugins provide data, panel renders.
- Forward path: a richer propertyTemplates DSL remains desirable; see guidance/feature/plugin-properties-panel/property_templates_v2.md.

## Interfaces & Contracts

### Schema Additions (v1.5)

```ts
// New field kind
type FieldKind =
  | "select"
  | "color"
  | "text"
  | "textarea"
  | "number"
  | "slider"
  | "checkbox";

interface BaseField {
  kind: FieldKind;
  id: string;
  label?: string;
  path: string; // state-relative path (e.g., 'aspect')
  // NEW: simple conditional logic
  disabledWhen?: { path: string; equals?: unknown; notEquals?: unknown };
}

// NEW: dynamic options for selects
interface SelectFieldDef extends BaseField {
  kind: "select";
  options?: Array<{ value: string; label: string }>;
  optionsProvider?: (app: AppAPI) => Array<{ value: string; label: string }>;
}
```

### Plugin Registration

- Plugins register schemas in `activate()` using `registerPropertySchema(scope, schema)`.
- Add `unregisterPropertySchema(scope)`; loader calls it during `unloadPlugin()`.
- Scopes:
  - `campaign`
  - `map`
  - `layer:<typeId>`

### Registry Functions

- `registerPropertySchema(scope: string, schema: PropertySchema): void`
- `unregisterPropertySchema(scope: string): void`
- `getPropertySchema(scope: string): PropertySchema | undefined`

## Data/State Changes

- Extend `src/properties/registry.ts` with `checkbox`, `disabledWhen`, `optionsProvider`, and `unregisterPropertySchema`.
- Move all existing registrations out of `src/layers/adapters/*` and into `src/plugin/builtin/*` modules.
- Replace hardcoded `CampaignProperties`/`MapProperties` with schema-driven rendering in `properties-panel.tsx`.
- Keep palette-dependent selects working via `optionsProvider(AppAPI)`.

## Testing Strategy

- Unit: registry register/unregister; disabledWhen; optionsProvider returns.
- Integration: plugin activation/unload wires schemas; selection→schema→render for each selection type.
- E2E: campaign rename/description; map title/description + palette override; layer properties for hex-noise and freeform.

## Impact/Risks

- Perf: minimal; dynamic options computed on demand (simple lists), cache if needed.
- DX: improved; plugins own their property definitions and lifecycle.
- UX: unchanged; parity with current panels.
- Migration: one-shot move; remove adapter-time registrations and hardcoded components.

## Forward Design (Not in T‑019)

- The richer propertyTemplates DSL is captured in guidance/feature/plugin-properties-panel/property_templates_v2.md and is compatible with this design via a registry union type in a later ticket.
