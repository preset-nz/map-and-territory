# Hex Utilities Consolidation - Product Requirements

## Vision

Establish a single source of truth for hex geometry operations across all layer adapters, reducing code duplication and ensuring consistent hex rendering behavior throughout the application.

## Problem Statement

Currently, hex-related geometry calculations are duplicated across multiple layer adapters (hexgrid, hex-noise, freeform). This creates:

- Maintenance burden when hex logic needs updates
- Risk of inconsistent hex rendering between layers
- Unnecessary code duplication
- Harder to understand and modify hex behavior

The freeform layer has already introduced shared utilities in `src/layers/hex-utils.ts`. These utilities should be adopted by other hex-based layers.

## User Impact

### For Developers

- **Single source of truth** for hex geometry calculations
- **Easier maintenance** with centralized hex logic
- **Consistent behavior** across all hex-based features
- **Better testability** with isolated utility functions

### For End Users

- **Consistent hex rendering** across all layer types
- **Improved performance** through optimized shared code
- **Fewer bugs** from centralized, well-tested utilities

## Functional Requirements

### Core Consolidation

#### FR-1: Shared Hex Utilities

- System SHALL provide shared utilities for:
  - Axial coordinate key generation (`axialKey`, `axialKeyFrom`)
  - Axial key parsing (`parseAxialKey`)
  - Hex center calculation (`centerFor`)
  - Hex path drawing (`hexPath`)
- All hex-based layers SHALL use these shared utilities

#### FR-2: Hexgrid Adapter Migration

- Hexgrid adapter SHALL use `hexPath` for drawing individual hexes
- Hexgrid adapter SHALL maintain exact visual output (pixel-perfect or tolerance)
- Tiling logic SHALL remain in adapter (grid-specific behavior)

#### FR-3: Hex Noise Adapter Migration

- Hex noise adapter SHALL use `hexPath` for drawing filled hexes
- Hex noise adapter SHALL use shared coordinate utilities where applicable
- Noise-specific logic SHALL remain in adapter

#### FR-4: Compatibility

- All existing features SHALL continue to work identically
- No visual regressions in hex rendering
- Performance SHALL not degrade (maintain or improve)

## Non-Functional Requirements

### Code Quality

#### NFR-1: DRY Principle

- No duplication of hex geometry calculations
- Single implementation for each hex operation
- Clear separation between shared utilities and layer-specific logic

#### NFR-2: Maintainability

- Utilities SHALL be well-documented with clear contracts
- Code SHALL follow existing TypeScript patterns
- Functions SHALL be pure where possible

### Performance

#### NFR-3: Rendering Performance

- Shared utilities SHALL not introduce performance regressions
- Hex rendering SHALL maintain current frame rates
- Memory usage SHALL not increase significantly

### Testing

#### NFR-4: Test Coverage

- Shared utilities SHALL have comprehensive unit tests
- Integration tests SHALL verify adapter behavior unchanged
- E2E tests SHALL confirm no visual regressions

## Acceptance Criteria

### AC-1: Hexgrid Rendering Unchanged

```gherkin
Given the hexgrid adapter uses shared hex utilities
When a hex grid is rendered
Then the visual output matches the previous implementation
And performance metrics remain within acceptable ranges
```

### AC-2: Hex Noise Rendering Unchanged

```gherkin
Given the hex noise adapter uses shared hex utilities
When hex noise is rendered
Then the visual output matches the previous implementation
And all noise patterns render correctly
```

### AC-3: Code Deduplication

```gherkin
Given all hex adapters are migrated
When analyzing the codebase
Then no duplicate hex path drawing code exists
And all adapters use the shared hex-utils module
```

### AC-4: Test Coverage

```gherkin
Given the shared hex utilities
When running tests
Then unit tests cover all utility functions
And integration tests pass without changes
And E2E tests show no visual regressions
```

## Success Metrics

- **Code reduction**: At least 30% reduction in hex-related code across adapters
- **Test coverage**: 100% coverage for hex-utils.ts
- **Zero regressions**: All existing tests continue to pass
- **Performance neutral**: No measurable performance degradation

## Dependencies

- Existing hex-utils.ts from freeform implementation
- Hexgrid adapter (`src/layers/adapters/hexgrid.ts`)
- Hex noise adapter (`src/layers/adapters/hex-noise.ts`)
- Hex geometry library (`src/lib/hex/`)

## Scope Boundaries

### In Scope

- Consolidating hex path drawing logic
- Consolidating axial coordinate utilities
- Migrating hexgrid adapter to use shared utilities
- Migrating hex-noise adapter to use shared utilities
- Unit tests for shared utilities

### Out of Scope

- Changing hex rendering algorithms
- Modifying tiling strategies
- Altering visual appearance
- Performance optimizations beyond consolidation
- Changes to hex coordinate systems

## Risks and Mitigations

| Risk                               | Impact | Likelihood | Mitigation                          |
| ---------------------------------- | ------ | ---------- | ----------------------------------- |
| Visual regression in hex rendering | High   | Medium     | Snapshot testing, pixel-diff tests  |
| Performance degradation            | Medium | Low        | Performance benchmarks before/after |
| Breaking existing features         | High   | Low        | Comprehensive test suite            |
| Incomplete migration               | Low    | Medium     | Checklist and code review           |

## Implementation Strategy

### Phase 1: Preparation

- Review existing hex-utils.ts implementation
- Identify all hex-related code in adapters
- Create comprehensive test baseline

### Phase 2: Migration

- Migrate hexgrid adapter to use shared utilities
- Migrate hex-noise adapter to use shared utilities
- Remove duplicated code

### Phase 3: Validation

- Run all existing tests
- Perform visual regression testing
- Benchmark performance

## Future Considerations

- Additional hex utilities could be added for:
  - Hex distance calculations
  - Hex line drawing
  - Hex area selection
  - Hex pathfinding
- Consider creating a hex rendering strategy pattern
- Potential for hex utility optimization based on usage patterns
