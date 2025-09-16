# ADR-009: Freeform Layer Rendering Modes Architecture

## Status

Proposed

## Context

The freeform layer currently supports painting hex cells with solid colors based on terrain types. We need to add support for textures, hatching, weathering, and other visual effects as described in the gritty map style feature proposal.

Two architectural approaches were considered:

1. **Multiple Layer Types**: Create separate layer types for each rendering style (PlainLayer, TexturedLayer, HatchedLayer, etc.)
2. **Single Layer with Modes**: One freeform layer type with configurable rendering modes

## Decision

We will implement **a single freeform layer type with configurable rendering modes** rather than multiple distinct layer types.

The layer will support multiple rendering modes that can be:

- Applied at the layer level (affecting all cells)
- Overridden at the cell level (for mixed styling within a layer)

## Rationale

### User Experience Benefits

- **Simpler Mental Model**: Users think "I want to paint" not "which of 5 paint layer types do I need?"
- **Non-Destructive Workflow**: Switch between rendering styles without recreating layers or losing data
- **Familiar Pattern**: Mode switching is a well-understood UI pattern (Photoshop brushes, Illustrator effects)
- **Progressive Disclosure**: Start simple, reveal advanced options as needed

### Technical Benefits

- **Single Source of Truth**: One layer type to maintain, test, and document
- **Composable Architecture**: Rendering strategies can be mixed and matched
- **Easier State Management**: No complex migrations between layer types
- **Better Extensibility**: Add new modes without changing core architecture

### Platform Thinking

- **Future Optionality**: Easy to add new rendering modes without breaking changes
- **Plugin-Friendly**: Single registration point with mode extensions
- **Performance**: Shared invalidation and interaction logic

## Implementation

### State Structure

```typescript
interface FreeformState {
  cells: Record<string, FreeformCell>;
  opacity: number;

  // Layer-level rendering configuration
  renderMode: RenderMode;
  renderSettings: RenderSettings;

  // Existing brush settings
  brushTerrainId?: string;
  brushColor?: string;
}

type RenderMode = "plain" | "textured" | "hatched" | "weathered" | "sketchy";

interface RenderSettings {
  // Mode-specific settings
  texture?: TextureSettings;
  hatching?: HatchSettings;
  weathering?: WeatheringSettings;
  sketch?: SketchSettings;
}

interface FreeformCell {
  terrainId?: string;
  color?: string;

  // Cell can override layer's render mode
  renderMode?: RenderMode;
  renderSettings?: Partial<RenderSettings>;
}
```

### Rendering Strategy Pattern

```typescript
interface RenderStrategy {
  render(
    ctx: CanvasRenderingContext2D,
    cell: FreeformCell,
    hexPath: Path2D,
    env: RenderEnv,
  ): void;

  getInvalidationKey(settings: RenderSettings): string;
}

class PlainRenderer implements RenderStrategy {
  /* ... */
}
class TexturedRenderer implements RenderStrategy {
  /* ... */
}
class HatchedRenderer implements RenderStrategy {
  /* ... */
}
```

### Adapter Integration

```typescript
export const FreeformAdapter: LayerAdapter<FreeformState> = {
  drawMain(ctx, state, env) {
    const strategy = getRenderStrategy(state.renderMode);

    for (const [key, cell] of Object.entries(state.cells)) {
      // Use cell override or layer default
      const cellStrategy = cell.renderMode
        ? getRenderStrategy(cell.renderMode)
        : strategy;

      const hexPath = createHexPath(key, env);
      cellStrategy.render(ctx, cell, hexPath, env);
    }
  },

  getInvalidationKey(state) {
    // Include render mode and settings in key
    return `freeform:${state.renderMode}:${hashSettings(state.renderSettings)}:...`;
  },
};
```

## Consequences

### Positive

- **User-Friendly**: Single layer type reduces cognitive load
- **Flexible**: Mix rendering styles within same layer
- **Maintainable**: One codebase for all freeform painting
- **Extensible**: Easy to add new rendering modes
- **Performance**: Shared optimization paths

### Negative

- **Complexity**: Single adapter becomes more complex
- **Testing**: More combinations to test
- **Settings UI**: Need conditional UI based on mode

### Mitigation

- Use strategy pattern to isolate rendering complexity
- Create comprehensive test suite for mode combinations
- Implement progressive disclosure in UI to manage settings complexity

## Alternative Considered: Multiple Layer Types

Creating separate layer types was rejected because:

- **User Confusion**: Which layer type for which use case?
- **Data Migration**: Moving between types loses settings/data
- **Code Duplication**: Similar logic repeated across types
- **Plugin Overhead**: Multiple registrations and UI entries
- **Inflexibility**: Can't mix styles in same layer

## References

- Feature Proposal: `/guidance/feature/gritty-map-style/techniques/texture-effects.md`
- Layer Architecture: `/src/layers/types.ts`
- Freeform Implementation: `/src/layers/adapters/freeform-hex.ts`
- SOLID Principles: `/CORE.md`
