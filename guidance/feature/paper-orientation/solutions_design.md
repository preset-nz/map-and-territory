# Paper Orientation Support - Solutions Design

## Overview

This document outlines the technical design for adding landscape/portrait orientation support to the paper layer system. The solution extends the existing paper state and geometry calculation without breaking backward compatibility.

## Architecture Overview

### Current State

- Paper aspect ratios: "square", "4:3", "16:10"
- Geometry calculation in `src/app/scene/geometry.ts`
- Paper state in `src/layers/adapters/paper.ts`
- Rendering via `src/plugin/builtin/paper.ts`

### Proposed Enhancement

Add orientation dimension to paper state while preserving existing aspect ratio behavior.

## Data Model Changes

### Extended Paper State

```typescript
export interface PaperState {
  color: string; // hex (existing)
  aspect: "square" | "4:3" | "16:10"; // (existing)
  orientation: "landscape" | "portrait"; // NEW
}
```

### Defensive Loading Strategy

```typescript
// Handle cases where orientation property is missing (future-proofing)
function ensurePaperState(state: unknown): PaperState {
  const existing = state as Partial<PaperState>;
  return {
    color: existing.color ?? "#ffffff",
    aspect: existing.aspect ?? "16:10",
    orientation: existing.orientation ?? "landscape", // Default if missing
  };
}
```

## Geometry Calculation Enhancement

### Extended Input Interface

```typescript
export interface ComputePaperRectInput {
  canvasSize: { w: number; h: number };
  paper: {
    aspect: PaperAspect;
    orientation: "landscape" | "portrait"; // NEW
  };
  padding?: { x?: number; y?: number };
}
```

### Enhanced Aspect Resolution

```typescript
export function resolveAspectRatio(
  aspect: PaperAspect,
  orientation: "landscape" | "portrait",
): { aw: number; ah: number } {
  let baseRatio: { aw: number; ah: number };

  switch (aspect) {
    case "square":
      baseRatio = { aw: 1, ah: 1 };
      break;
    case "4:3":
      baseRatio = { aw: 4, ah: 3 };
      break;
    case "16:10":
    default:
      baseRatio = { aw: 16, ah: 10 };
      break;
  }

  // For square, orientation doesn't change dimensions
  if (aspect === "square") {
    return baseRatio;
  }

  // For non-square, swap dimensions for portrait
  if (orientation === "portrait") {
    return { aw: baseRatio.ah, ah: baseRatio.aw };
  }

  return baseRatio;
}
```

### Updated computePaperRect Function

```typescript
export function computePaperRect({
  canvasSize,
  paper,
  padding,
}: ComputePaperRectInput): PaperRect {
  const canvasW = Math.max(0, canvasSize.w);
  const canvasH = Math.max(0, canvasSize.h);

  const basePaddingX = padding?.x ?? MIN_PADDING_X;
  const basePaddingY = padding?.y ?? MIN_PADDING_Y;

  const paddingX = Math.max(basePaddingX, canvasW * HORIZONTAL_PADDING_RATIO);
  const paddingY = basePaddingY;

  const availW = Math.max(0, canvasW - paddingX * 2);
  const availH = Math.max(0, canvasH - paddingY * 2);

  // Use enhanced aspect resolution with orientation
  const { aw, ah } = resolveAspectRatio(paper.aspect, paper.orientation);

  let paperW = availW;
  let paperH = availH > 0 ? (paperW * ah) / aw : 0;
  if (paperH > availH) {
    paperH = availH;
    paperW = availH > 0 ? (paperH * aw) / ah : 0;
  }

  const offsetX = paddingX + Math.max(0, (availW - paperW) / 2);
  const offsetY = paddingY;

  return { x: offsetX, y: offsetY, w: paperW, h: paperH };
}
```

## Layer Adapter Updates

### Updated Paper Adapter

```typescript
export const PaperAdapter: LayerAdapter<PaperState> = {
  title: "Paper",
  drawMain(ctx, state, env) {
    const { w, h } = env.size;
    ctx.save();
    ctx.fillStyle = state.color || "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },
  getInvalidationKey(state) {
    // Include orientation in invalidation key
    return `paper:${state.aspect}:${state.orientation}:${state.color}`;
  },
};

export const PaperType = {
  id: "paper",
  title: "Paper",
  defaultState: {
    color: "#ffffff",
    aspect: "16:10" as const,
    orientation: "landscape" as const,
  },
  adapter: PaperAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;
```

## Plugin Integration

### Enhanced Paper Plugin

```typescript
export const paperPluginModule: PluginModule = {
  activate: async () => {
    registerLayerType(PaperType);
    registerPropertySchema("layer:paper", {
      groups: [
        {
          id: "paper",
          title: "Paper",
          rows: [
            {
              kind: "select",
              id: "aspect",
              label: "Aspect Ratio",
              path: "aspect",
              options: [
                { value: "square", label: "Square (1:1)" },
                { value: "4:3", label: "4:3" },
                { value: "16:10", label: "16:10" },
              ],
            },
            {
              kind: "select", // NEW
              id: "orientation",
              label: "Orientation",
              path: "orientation",
              options: [
                { value: "landscape", label: "Landscape" },
                { value: "portrait", label: "Portrait" },
              ],
            },
            { kind: "color", id: "color", label: "Color", path: "color" },
          ],
        },
      ],
    });
  },

  scene: {
    computePaperRect({ canvasSize, paper }) {
      // Pass through enhanced paper object with orientation
      return computePaperRect({ canvasSize, paper });
    },
    // postRender remains unchanged
  } satisfies SceneAdapter,
};
```

## UI/UX Design

### Property Panel Layout

```
┌─ Paper ──────────────────────┐
│ Aspect Ratio: [16:10     ▼] │
│ Orientation:  [Landscape ▼] │
│ Color:        [■ #ffffff  ] │
└─────────────────────────────┘
```

### Orientation Options

- **Landscape**: Default, wider than tall
- **Portrait**: Taller than wide
- For square aspect: both options available but no visual difference

### Visual Feedback

- Immediate paper rectangle update on selection
- Grid reflow to new dimensions
- Border adjustment to new shape

## Interaction Patterns

### State Transitions

```typescript
// All transitions preserve content and other properties
type OrientationTransition = {
  from: "landscape" | "portrait";
  to: "landscape" | "portrait";
  effect: "dimensions_swap" | "no_change";
};

const transitions: OrientationTransition[] = [
  { from: "landscape", to: "portrait", effect: "dimensions_swap" },
  { from: "portrait", to: "landscape", effect: "dimensions_swap" },
  // Square aspect special case
  { from: "landscape", to: "portrait", effect: "no_change" }, // when aspect === "square"
];
```

### Change Handling

```typescript
function handleOrientationChange(
  currentState: PaperState,
  newOrientation: "landscape" | "portrait",
): PaperState {
  return {
    ...currentState,
    orientation: newOrientation,
  };
  // Note: No coordinate transformation needed - layers handle their own positioning
}
```

## Performance Considerations

### Invalidation Strategy

- Include orientation in invalidation key to trigger redraws
- Geometry recalculation is O(1) - no performance impact
- Layer content positioning remains unchanged (layers use world coordinates)

### Rendering Optimization

```typescript
// Optimized invalidation key generation
getInvalidationKey(state: PaperState): string {
  // Order matters for consistent hashing
  return `paper:${state.aspect}:${state.orientation}:${state.color}`;
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("Paper Orientation", () => {
  test("landscape 16:10 has correct dimensions", () => {
    const result = resolveAspectRatio("16:10", "landscape");
    expect(result).toEqual({ aw: 16, ah: 10 });
  });

  test("portrait 16:10 swaps dimensions", () => {
    const result = resolveAspectRatio("16:10", "portrait");
    expect(result).toEqual({ aw: 10, ah: 16 });
  });

  test("square orientation has no effect", () => {
    const landscape = resolveAspectRatio("square", "landscape");
    const portrait = resolveAspectRatio("square", "portrait");
    expect(landscape).toEqual(portrait);
  });
});
```

### Integration Tests

```typescript
describe("Paper Rectangle Computation", () => {
  test("portrait orientation fits within canvas", () => {
    const canvasSize = { w: 800, h: 600 };
    const paper = {
      aspect: "16:10" as const,
      orientation: "portrait" as const,
    };

    const rect = computePaperRect({ canvasSize, paper });

    expect(rect.w).toBeLessThan(rect.h); // Portrait should be taller
    expect(rect.w + rect.x).toBeLessThanOrEqual(canvasSize.w);
    expect(rect.h + rect.y).toBeLessThanOrEqual(canvasSize.h);
  });
});
```

### E2E Tests

```typescript
describe("Orientation Switching", () => {
  test("user can switch from landscape to portrait", () => {
    // Load map in landscape
    // Paint some content
    // Switch to portrait
    // Verify content is preserved
    // Verify paper shape changes
  });
});
```

## Data Handling and Compatibility

### Defensive Programming

Since there are no existing campaigns yet, the focus is on robust data handling:

- Default orientation to "landscape" when property is missing
- Handle malformed or incomplete paper state gracefully
- Ensure type safety with fallback values

### State Normalization

```typescript
// Ensure paper state is always complete and valid
function normalizePaperState(state: unknown): PaperState {
  const s = state as Partial<PaperState>;

  return {
    color: typeof s.color === "string" ? s.color : "#ffffff",
    aspect: ["square", "4:3", "16:10"].includes(s.aspect as any)
      ? s.aspect!
      : "16:10",
    orientation: ["landscape", "portrait"].includes(s.orientation as any)
      ? s.orientation!
      : "landscape",
  };
}
```

## Security and Validation

### Input Validation

```typescript
const validOrientations = ["landscape", "portrait"] as const;

function validateOrientation(
  value: unknown,
): value is "landscape" | "portrait" {
  return typeof value === "string" && validOrientations.includes(value as any);
}
```

### State Validation

```typescript
function validatePaperState(state: unknown): state is PaperState {
  const s = state as PaperState;
  return (
    typeof s.color === "string" &&
    ["square", "4:3", "16:10"].includes(s.aspect) &&
    ["landscape", "portrait"].includes(s.orientation)
  );
}
```

## Future Extensibility

### Additional Orientations

The design allows for easy addition of other orientations:

```typescript
type Orientation = "landscape" | "portrait" | "auto" | "square-locked";
```

### Responsive Orientation

Future enhancement could auto-select based on canvas dimensions:

```typescript
function getAutoOrientation(canvasSize: {
  w: number;
  h: number;
}): "landscape" | "portrait" {
  return canvasSize.w >= canvasSize.h ? "landscape" : "portrait";
}
```

### Custom Rotations

Design is compatible with future rotation features:

```typescript
interface ExtendedPaperState extends PaperState {
  rotation?: number; // degrees, for manual rotation
}
```

## Dependencies

- **Existing**: Paper layer system, aspect ratio calculations
- **UI Library**: Property schema system for controls
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Migration**: Campaign loading/saving system

## Risks and Mitigations

| Risk                                        | Likelihood | Impact | Mitigation                                     |
| ------------------------------------------- | ---------- | ------ | ---------------------------------------------- |
| Performance regression                      | Low        | Medium | Profile rendering pipeline, optimize if needed |
| User confusion                              | Medium     | Low    | Clear labeling, documentation                  |
| Backward compatibility break                | Low        | High   | Comprehensive migration testing                |
| Complex interactions with existing features | Medium     | Medium | Thorough integration testing                   |

## Implementation Phases

### Phase 1: Core Data Model

- Add orientation to PaperState
- Update geometry calculations
- Add migration logic

### Phase 2: UI Integration

- Add orientation selector to property panel
- Implement change handlers
- Add visual feedback

### Phase 3: Testing and Polish

- Comprehensive test coverage
- Performance optimization
- Documentation updates

This design provides a clean, extensible solution for paper orientation support while maintaining backward compatibility and following established patterns in the codebase.
