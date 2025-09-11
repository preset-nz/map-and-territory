---
ticket: T-0XX
feature: plugin-properties-panel
author: lead-dev
date: 2025-09-11
level: 3
status: proposal
---

## Purpose

Capture the long-term “propertyTemplates” design — a richer, declarative parameter template system — without blocking T‑019. The v2 design should layer on top of the plugin registry and coexist with (or replace) `PropertySchema` when adopted.

## Summary

- Properties panel renders template definitions contributed by plugins, not hardcoded React.
- Templates support folders/groups, richer field types, and composable conditions beyond simple `disabledWhen`.
- Host performs evaluation and state wiring; plugins remain declarative.

## Template Types (Draft)

```typescript
type ParmTemplate =
  | FolderTemplate
  | StringTemplate
  | TextTemplate
  | IntTemplate
  | FloatTemplate
  | ToggleTemplate
  | MenuTemplate
  | ColorTemplate
  | SliderTemplate
  | SeparatorTemplate;

interface BaseTemplate {
  type: string;
  name: string;
  label?: string;
  disableWhen?: DisableCondition;
}

type DisableCondition =
  | { always: true }
  | { parm: string; equals: any }
  | { parm: string; notEquals: any }
  | { parm: string; isEmpty: true }
  | { or: DisableCondition[] }
  | { and: DisableCondition[] };
```

## Plugin Contribution (Draft)

```typescript
interface PropertiesContribution {
  selectionType: "campaign" | "map" | "layer" | `layer:${string}`;
  templates: ParmTemplate[];
}

interface PluginManifest {
  contributes?: {
    propertiesPanel?: PropertiesContribution[];
  };
}
```

## Registry (Draft)

- `registerPropertiesContribution(pluginId: string, contribution: PropertiesContribution): () => void`
- `getPropertiesContributions(selectionType: string): PropertiesContribution[]`

## Migration Plan

1. T‑019 (now): Move all properties to plugin-registered `PropertySchema` with minimal extensions.
2. Add registry union in a future ticket:
   - `registerProperty(scope, payload: { kind: 'schema' | 'templates'; data: ... })`.
3. Panel supports both kinds; plugins can gradually migrate to templates.
4. Once all first-party plugins use templates, consider deprecating `PropertySchema`.

## Testing & Risks

- Unit: template validation, condition evaluation.
- Integration: contribution registration/unregistration; rendering with store integration.
- Risk: complexity creep in conditions — mitigate with simple, testable building blocks and guardrails in the API.

## Notes

- Keep UI schema and data schema separate; persistence remains owned by `serialize/deserialize` in layer adapters.
- Prefer predictable, minimal field set; allow escape hatches later only if justified by UX needs.
