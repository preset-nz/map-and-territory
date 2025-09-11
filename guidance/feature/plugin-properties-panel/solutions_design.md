---
ticket: T-001
feature: plugin-properties-panel
author: lead-dev
date: 2025-09-10
level: 2
---

## Overview & Assumptions

- Properties panel becomes a generic parameter template renderer
- Plugins contribute declarative parameter templates instead of React components
- Single registry system replaces both property schema and hardcoded components
- Template rendering handles all React state management and store integration
- Conditional disable logic is evaluated client-side using current parameter values

## Interfaces & Contracts

### Parameter Template Types

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

### Plugin Contribution

```typescript
interface PropertiesContribution {
  selectionType: "campaign" | "map" | "layer" | `layer:${string}`;
  templates: ParmTemplate[];
}

// In plugin manifest
interface PluginManifest {
  contributes?: {
    propertiesPanel?: PropertiesContribution[];
  };
}
```

### Registry Functions

- `registerPropertiesContribution(pluginId: string, contribution: PropertiesContribution): () => void`
- `getPropertiesContributions(selectionType: string): PropertiesContribution[]`

## Data/State Changes

- New parameter template types in `src/properties/types.ts`
- Properties registry in `src/properties/registry.ts` (replacing current schema registry)
- Plugin loader updated to process `propertiesPanel` contributions
- Properties panel refactored to query registry and render templates dynamically
- Store integration handles parameter value reading/writing through generic paths

## Testing Strategy

- **Unit**: Parameter template type validation, disable condition evaluation, registry functions
- **Integration**: Plugin contribution registration/unregistration, template rendering with store integration
- **E2E**: Campaign properties, Map properties with conditional palette override, Layer properties for hex-noise

## Impact/Risks

- **Perf**: Minimal impact - template evaluation is lightweight, caching possible for repeated renders
- **DX**: Improved - plugin authors work with declarative data instead of React components
- **UX**: No change - identical visual/functional behavior maintained
- **Migration**: Clean break from existing property schema - all properties need migration to templates
