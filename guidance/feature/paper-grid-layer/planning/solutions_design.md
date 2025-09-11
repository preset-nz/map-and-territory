# Solutions Design: Paper & Hexgrid Layer Plugin Migration

## Overview

Convert paper and hexgrid layers from direct imports to the plugin system to achieve architectural consistency where all layer types are plugins. This migration maintains existing functionality while introducing a priority-based plugin loading system to ensure anchor layers (paper/hexgrid) load before other plugins.

### Integration Approach

- Convert existing PaperType and HexgridType registrations to plugin-based architecture
- Implement priority field in plugin manifest for load ordering
- Maintain separation of concerns: adapters handle rendering, plugins handle registration
- Preserve existing layer policies (canDelete: false, maxInstances: 1) and behavior

## Architecture

### System Integration

The current architecture has an inconsistency where paper/hexgrid are registered directly in `src/stores/project/index.ts` while other layers (freeform, hex-noise) are loaded as plugins. This creates multiple registration pathways and architectural debt.

**Current State:**

```typescript
// Direct registration in project store
registerLayerType(PaperType);
registerLayerType(HexgridType);

// Plugin-based registration in app-layout
loadPlugin(freeformManifest, freeformModule);
loadPlugin(hexNoiseManifest, hexNoiseModule);
```

**Target State:**

```typescript
// All layers loaded consistently through plugin system with priority
loadPlugin(paperPluginManifest, paperPluginModule); // priority: 100
loadPlugin(hexgridPluginManifest, hexgridPluginModule); // priority: 100
loadPlugin(freeformManifest, freeformModule); // priority: 10 (default)
loadPlugin(hexNoiseManifest, hexNoiseModule); // priority: 10 (default)
```

### Plugin Loading Architecture

The priority system ensures deterministic load order for anchor layers that other plugins may depend on:

1. **High Priority (100)**: Anchor layers (paper, hexgrid) - load first
2. **Default Priority (10)**: Content layers (freeform, hex-noise) - load after anchors
3. **Low Priority (1)**: Extension/tool plugins - load last

## Components

### Plugin Manifest Extension

Extend `PluginManifest` interface to include priority field:

```typescript
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion?: string;
  priority?: number; // NEW: Default 10, higher loads first
  capabilities?: string[];
  contributes?: {
    // existing fields
  };
  entry?: string;
}
```

### Plugin Loader Enhancement

Modify `loadPlugin` in `src/plugin/loader.ts` to support priority-based loading:

```typescript
type LoadedPlugin = {
  manifest: PluginManifest;
  module: PluginModule;
  disposables: Array<() => void>;
  priority: number; // NEW: Extracted from manifest
};

export async function loadPluginsWithPriority(
  plugins: Array<[PluginManifest, PluginModule]>,
): Promise<void> {
  // Sort by priority (higher first), then by id for deterministic order
  const sorted = plugins.sort((a, b) => {
    const priorityA = a[0].priority ?? 10;
    const priorityB = b[0].priority ?? 10;
    if (priorityA !== priorityB) return priorityB - priorityA;
    return a[0].id.localeCompare(b[0].id);
  });

  for (const [manifest, module] of sorted) {
    await loadPlugin(manifest, module);
  }
}
```

### New Plugin Modules

Create plugin modules that mirror existing adapter structure:

**Paper Plugin** (`src/plugin/builtin/paper.ts`):

```typescript
export const paperPluginManifest: PluginManifest = {
  id: "app.plugins.paper-layer",
  name: "Paper Layer",
  version: "0.1.0",
  priority: 100, // High priority anchor layer
};

export const paperPluginModule: PluginModule = {
  activate: () => {
    registerLayerType(PaperType); // Import from existing adapter
  },
};
```

**Hexgrid Plugin** (`src/plugin/builtin/hexgrid.ts`):

```typescript
export const hexgridPluginManifest: PluginManifest = {
  id: "app.plugins.hexgrid-layer",
  name: "Hexgrid Layer",
  version: "0.1.0",
  priority: 100, // High priority anchor layer
};

export const hexgridPluginModule: PluginModule = {
  activate: () => {
    registerLayerType(HexgridType); // Import from existing adapter
  },
};
```

## Data Models

### Plugin Registry Enhancement

No changes required to existing layer type definitions. The adapters in `src/layers/adapters/` remain unchanged as they contain the rendering logic and layer definitions.

### Layer Type Definitions

Existing `PaperType` and `HexgridType` in adapters remain unchanged:

- State interfaces preserved
- Default states preserved
- Policies preserved (canDelete: false, maxInstances: 1)
- Rendering logic preserved

## Implementation Approach

### Phase 1: Plugin System Enhancement

1. **Extend PluginManifest interface** with priority field
2. **Enhance plugin loader** with priority-based loading logic
3. **Add loadPluginsWithPriority utility** for batch loading with priority

### Phase 2: Plugin Module Creation

1. **Create paper plugin** (`src/plugin/builtin/paper.ts`)
2. **Create hexgrid plugin** (`src/plugin/builtin/hexgrid.ts`)
3. **Maintain adapter imports** - no duplication of logic

### Phase 3: Registration Migration

1. **Remove direct registerLayerType calls** from project store
2. **Add plugin loading** in app-layout with priority
3. **Update plugin loading sequence** to use priority-based loading

### Phase 4: Integration Testing

1. **Verify load order** through plugin system
2. **Validate layer functionality** matches current behavior
3. **Test anchor layer policies** are preserved

## Migration Strategy

### Code Changes

**Remove Direct Registration** (`src/stores/project/index.ts`):

```typescript
// REMOVE these lines:
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";

// REMOVE these calls:
registerLayerType(PaperType);
registerLayerType(HexgridType);
```

**Update Plugin Loading** (`src/components/layout/app-layout.tsx`):

```typescript
import { paperPluginManifest, paperPluginModule } from "@/plugin/builtin/paper";
import {
  hexgridPluginManifest,
  hexgridPluginModule,
} from "@/plugin/builtin/hexgrid";

useEffect(() => {
  loadPluginsWithPriority([
    [paperPluginManifest, paperPluginModule],
    [hexgridPluginManifest, hexgridPluginModule],
    [campaignPluginManifest, campaignPluginModule],
    [mapPluginManifest, mapPluginModule],
    [freeformManifest, freeformModule],
    [hexNoiseManifest, hexNoiseModule],
    [settingsPaletteManifest, settingsPaletteModule],
  ]);
}, []);
```

### Validation Strategy

1. **Pre-migration testing**: Capture current behavior with existing tests
2. **Post-migration testing**: Verify identical behavior through plugin system
3. **Load order verification**: Ensure paper/hexgrid load before content layers
4. **Policy preservation**: Validate anchor layer restrictions still apply

## Error Handling

### Plugin Loading Failures

- **Priority conflicts**: Handle plugins with same priority deterministically by ID sort
- **Missing adapters**: Fail fast if adapter imports are broken
- **Load sequence errors**: Log and continue with remaining plugins
- **Registration conflicts**: Prevent duplicate layer type registration

### Runtime Error Scenarios

- **Plugin activation failures**: Graceful degradation without layer type
- **Adapter import errors**: Clear error messages for missing dependencies
- **Priority validation**: Default to priority 10 for invalid values

## Testing Strategy

### Unit Tests

**Plugin Loader Priority** (`src/test/plugin-loader-priority.test.ts`):

```typescript
describe("Plugin Priority Loading", () => {
  it("loads plugins in priority order", async () => {
    const loadOrder: string[] = [];
    const mockRegister = vi.fn((type) => loadOrder.push(type.id));

    await loadPluginsWithPriority([
      [
        { id: "low", priority: 1 },
        { activate: () => mockRegister({ id: "low" }) },
      ],
      [
        { id: "high", priority: 100 },
        { activate: () => mockRegister({ id: "high" }) },
      ],
    ]);

    expect(loadOrder).toEqual(["high", "low"]);
  });
});
```

**Paper Plugin Registration** (`src/test/paper-plugin.test.ts`):

```typescript
describe("Paper Plugin", () => {
  it("registers paper layer type on activation", () => {
    const mockRegister = vi.fn();
    vi.mock("@/layers/registry", () => ({ registerLayerType: mockRegister }));

    paperPluginModule.activate?.();
    expect(mockRegister).toHaveBeenCalledWith(PaperType);
  });
});
```

### Integration Tests

**Layer Creation After Migration** (`src/test/integration/layer-creation.test.ts`):

```typescript
describe("Layer Creation Integration", () => {
  beforeEach(async () => {
    // Load plugins with priority
    await loadPluginsWithPriority([
      [paperPluginManifest, paperPluginModule],
      [hexgridPluginManifest, hexgridPluginModule],
    ]);
  });

  it("creates paper and hexgrid layers through plugin system", () => {
    const project = useProjectStore.getState().createEmpty();
    const mapId = useProjectStore.getState().addMap();

    const map = project.maps.find((m) => m.id === mapId);
    const paperLayer = map?.layers?.find((l) => l.type === "paper");
    const hexgridLayer = map?.layers?.find((l) => l.type === "hexgrid");

    expect(paperLayer).toBeDefined();
    expect(hexgridLayer).toBeDefined();
    expect(paperLayer?.name).toBe("Paper");
    expect(hexgridLayer?.name).toBe("Hex Grid");
  });
});
```

### Test Files Structure

- `src/test/unit/plugin/test-priority-loader.ts`: Priority loading logic
- `src/test/unit/plugin/test-paper-plugin.ts`: Paper plugin registration
- `src/test/unit/plugin/test-hexgrid-plugin.ts`: Hexgrid plugin registration
- `src/test/integration/test-layer-creation-migration.ts`: End-to-end layer creation
- `src/test/integration/test-plugin-load-sequence.ts`: Complete plugin loading sequence

## Risk Analysis

### Technical Risks

**Medium Risk - Plugin Load Timing**

- _Issue_: Other plugins might expect paper/hexgrid to be pre-loaded
- _Mitigation_: Priority system ensures anchor layers load first
- _Detection_: Integration tests verify load order

**Low Risk - Import Path Changes**

- _Issue_: Moving registration could break import paths
- _Mitigation_: Adapters remain in same location, only registration moves
- _Detection_: TypeScript compilation errors

**Low Risk - Policy Behavior Changes**

- _Issue_: Layer policies might not transfer correctly
- _Mitigation_: Adapters contain policy definitions, no changes needed
- _Detection_: Layer management tests verify policies

### Implementation Risks

**Low Risk - Missing Direct Registration Cleanup**

- _Issue_: Leaving old registration calls could cause conflicts
- _Mitigation_: Systematic removal with compiler verification
- _Detection_: Duplicate registration would fail at runtime

**Low Risk - Plugin Priority Conflicts**

- _Issue_: Multiple plugins with same priority might load inconsistently
- _Mitigation_: Fallback to ID-based sorting for deterministic order
- _Detection_: Unit tests verify consistent ordering

### Rollback Strategy

1. **Immediate**: Revert plugin files, restore direct registration
2. **Validation**: Run existing test suite to verify functionality
3. **Cleanup**: Remove priority enhancement if needed
4. **Communication**: Document any architectural debt for future resolution

The migration maintains complete backward compatibility by preserving all existing adapters and behaviors while achieving plugin system consistency.
