# Hex Utilities Consolidation - Implementation Tasks

## Overview

Implementation plan for T-018 [S] Consolidate Hex Utilities. This task migrates Hex Grid and Hex Noise adapters to use shared hex utilities from `src/layers/hex-utils.ts`, removing duplicated tiling and path math while maintaining identical rendering behavior.

## Phase 1: Baseline and Preparation (1 day)

### Task 1.1: Create Test Baseline

**Scope**: Establish visual and performance baseline for comparison
**Files**: `src/test/adapters/`

- [ ] Create visual regression test suite for hexgrid adapter
- [ ] Create visual regression test suite for hex-noise adapter
- [ ] Capture baseline screenshots/snapshots for both adapters
- [ ] Benchmark performance metrics for both adapters
- [ ] Document current behavior patterns

**Dependencies**: None
**Validation**: Baseline tests pass and capture current state

### Task 1.2: Analyze Current Implementations

**Scope**: Document existing code patterns and identify consolidation opportunities
**Files**: Analysis documentation

- [ ] Map all hex drawing code in hexgrid adapter (lines 35-46, 48-88)
- [ ] Map all hex drawing code in hex-noise adapter (lines 56, 90, 95-133)
- [ ] Identify shared patterns and differences
- [ ] Document coordinate system usage
- [ ] Create migration plan with risk assessment

**Dependencies**: Task 1.1
**Validation**: Complete analysis document with consolidation strategy

## Phase 2: Extend Shared Utilities (1 day)

### Task 2.1: Add Hex Tiling Generator

**Scope**: Add hex position generator to hex-utils.ts
**Files**: `src/layers/hex-utils.ts`

- [ ] Add `HexTilingConfig` interface for tiling configuration
- [ ] Add `HexTilePosition` interface for position data
- [ ] Implement `hexTiles()` generator function for both orientations
- [ ] Add comprehensive unit tests for tiling generator
- [ ] Validate generator produces expected positions

**Dependencies**: Task 1.2
**Validation**: Unit tests pass with 100% coverage for new functions

### Task 2.2: Add Layout Helper

**Scope**: Add shared layout creation utility
**Files**: `src/layers/hex-utils.ts`

- [ ] Implement `createHexLayout()` helper function
- [ ] Add TypeScript types for layout configuration
- [ ] Add unit tests for layout creation
- [ ] Document function contracts and usage

**Dependencies**: Task 2.1
**Validation**: Layout helper works with existing hexPath function

## Phase 3: Migrate Hexgrid Adapter (1 day)

### Task 3.1: Replace Custom Hex Drawing

**Scope**: Replace manual hex path creation with shared utilities
**Files**: `src/layers/adapters/hexgrid.ts`

- [ ] Import hex utilities (`hexPath`, `hexTiles`, `createHexLayout`)
- [ ] Replace custom `drawHex` function with `hexPath` calls
- [ ] Update tiling logic to use `hexTiles` generator
- [ ] Remove duplicate hex drawing code (lines 35-46)
- [ ] Maintain existing rendering parameters (strokeStyle, lineWidth, etc.)

**Dependencies**: Task 2.2
**Validation**: Hexgrid renders identically to baseline

### Task 3.2: Test Hexgrid Migration

**Scope**: Verify hexgrid behavior unchanged
**Files**: `src/test/adapters/`

- [ ] Run visual regression tests against baseline
- [ ] Verify performance metrics within acceptable range
- [ ] Test all orientation and size combinations
- [ ] Confirm invalidation key unchanged
- [ ] Run integration tests with other layers

**Dependencies**: Task 3.1
**Validation**: All tests pass with zero visual regressions

## Phase 4: Migrate Hex Noise Adapter (1 day)

### Task 4.1: Optimize Hex Drawing

**Scope**: Consolidate hex drawing and optimize layout usage
**Files**: `src/layers/adapters/hex-noise.ts`

- [ ] Replace multiple `hexPath` calls with single layout creation
- [ ] Update tiling logic to use `hexTiles` generator
- [ ] Consolidate noise calculation with hex positioning
- [ ] Remove duplicate layout object creation
- [ ] Maintain all existing noise parameters and modes

**Dependencies**: Task 3.2
**Validation**: Hex noise renders identically to baseline

### Task 4.2: Test Hex Noise Migration

**Scope**: Verify hex noise behavior unchanged
**Files**: `src/test/adapters/`

- [ ] Run visual regression tests against baseline
- [ ] Test both "shape" and "paint" modes
- [ ] Verify all noise parameters work correctly
- [ ] Test serialization/deserialization unchanged
- [ ] Run performance benchmarks

**Dependencies**: Task 4.1
**Validation**: All tests pass with zero visual regressions

## Phase 5: Code Cleanup and Validation (1 day)

### Task 5.1: Remove Duplicate Code

**Scope**: Clean up redundant implementations
**Files**: Both adapter files

- [ ] Remove all custom hex drawing functions from hexgrid
- [ ] Remove duplicate tiling calculations from hex-noise
- [ ] Verify no unused imports or variables
- [ ] Update code comments and documentation
- [ ] Run linter and fix any issues

**Dependencies**: Task 4.2
**Validation**: No unused code, clean linter output

### Task 5.2: Integration Testing

**Scope**: Comprehensive system testing
**Files**: Full test suite

- [ ] Run complete test suite (unit + integration + E2E)
- [ ] Verify all existing functionality works
- [ ] Test layer combinations and interactions
- [ ] Performance testing with complex scenes
- [ ] Cross-browser compatibility testing

**Dependencies**: Task 5.1
**Validation**: All tests pass, performance metrics acceptable

### Task 5.3: Documentation Update

**Scope**: Update relevant documentation
**Files**: Documentation and comments

- [ ] Update hex-utils.ts documentation with new functions
- [ ] Add code comments explaining shared utility usage
- [ ] Update any relevant ADRs or design docs
- [ ] Document performance improvements (if any)

**Dependencies**: Task 5.2
**Validation**: Documentation accurately reflects implementation

## Testing Strategy

### Unit Tests

```typescript
describe("hex-utils consolidation", () => {
  describe("hexTiles generator", () => {
    test("flat orientation generates correct positions", () => {
      const config = {
        size: 10,
        orientation: "flat" as const,
        center: { x: 50, y: 50 },
        bounds: { w: 100, h: 100 },
      };

      const tiles = Array.from(hexTiles(config));
      expect(tiles.length).toBeGreaterThan(0);
      tiles.forEach((tile) => {
        expect(tile.center).toHaveProperty("x");
        expect(tile.center).toHaveProperty("y");
        expect(tile.axial).toHaveProperty("q");
        expect(tile.axial).toHaveProperty("r");
      });
    });

    test("pointy orientation generates correct positions", () => {
      // Similar test for pointy orientation
    });

    test("respects padding parameter", () => {
      // Test that padding adds extra tiles beyond bounds
    });
  });

  describe("createHexLayout", () => {
    test("creates valid layout object", () => {
      const layout = createHexLayout(20, "pointy");
      expect(layout.size).toBe(20);
      expect(layout.orientation).toBe("pointy");
    });
  });
});
```

### Visual Regression Tests

```typescript
describe("adapter visual consistency", () => {
  test("hexgrid identical after migration", async () => {
    const state = {
      size: 24,
      orientation: "pointy" as const,
      color: "#000000",
      alpha: 1,
      lineWidth: 1,
    };

    const before = await renderHexgrid(state, mockEnv);
    const after = await renderHexgridWithSharedUtils(state, mockEnv);

    expect(after).toMatchSnapshot();
    expect(after).toEqualCanvas(before, { threshold: 0.001 });
  });

  test("hex noise identical after migration", async () => {
    const state = {
      seed: "test",
      frequency: 0.15,
      mode: "shape" as const,
      // ... other properties
    };

    const before = await renderHexNoise(state, mockEnv);
    const after = await renderHexNoiseWithSharedUtils(state, mockEnv);

    expect(after).toMatchSnapshot();
    expect(after).toEqualCanvas(before, { threshold: 0.001 });
  });
});
```

### Performance Tests

```typescript
describe("performance regression", () => {
  test("hexgrid rendering performance maintained", () => {
    const largeState = { size: 12 /* large grid */ };

    const beforeTime = measureRenderTime(() => {
      renderHexgridOld(largeState, largeEnv);
    });

    const afterTime = measureRenderTime(() => {
      renderHexgridNew(largeState, largeEnv);
    });

    // Should not be significantly slower
    expect(afterTime).toBeLessThan(beforeTime * 1.1);
  });
});
```

### Integration Tests

```typescript
describe("shared utility integration", () => {
  test("consistent positioning across adapters", () => {
    const layout = createHexLayout(20, "pointy");
    const axial = { q: 0, r: 0 };

    const freeformCenter = centerFor(axial, {
      ...layout,
      origin: { x: 0, y: 0 },
    });

    const tilingConfig = {
      size: 20,
      orientation: "pointy" as const,
      center: { x: 0, y: 0 },
      bounds: { w: 100, h: 100 },
    };

    const tiles = Array.from(hexTiles(tilingConfig));
    const originTile = tiles.find((t) => t.axial.q === 0 && t.axial.r === 0);

    expect(originTile?.center).toEqual(freeformCenter);
  });
});
```

## Success Criteria

### Code Quality

- [ ] No duplicate hex drawing code across adapters
- [ ] All adapters use shared hex-utils functions
- [ ] ESLint and TypeScript checks pass
- [ ] Code coverage maintained or improved

### Functional Requirements

- [ ] Hexgrid renders identically to baseline
- [ ] Hex noise renders identically to baseline
- [ ] All existing features continue to work
- [ ] Performance metrics within 10% of baseline

### Testing Requirements

- [ ] 100% unit test coverage for new utilities
- [ ] Zero visual regressions in snapshot tests
- [ ] All integration tests pass
- [ ] E2E tests show no behavioral changes

## Implementation Schedule

| Phase              | Duration | Dependencies |
| ------------------ | -------- | ------------ |
| Phase 1: Baseline  | 1 day    | None         |
| Phase 2: Utilities | 1 day    | Phase 1      |
| Phase 3: Hexgrid   | 1 day    | Phase 2      |
| Phase 4: Hex Noise | 1 day    | Phase 3      |
| Phase 5: Cleanup   | 1 day    | Phase 4      |

**Total Duration**: 5 days
**Critical Path**: Sequential - each phase depends on previous

## Risk Management

### High Priority Risks

1. **Visual Regressions**
   - **Mitigation**: Comprehensive visual regression test suite
   - **Contingency**: Rollback to previous implementation

2. **Performance Degradation**
   - **Mitigation**: Performance benchmarks at each step
   - **Contingency**: Optimize tiling generator if needed

### Medium Priority Risks

1. **Coordinate System Inconsistencies**
   - **Mitigation**: Integration tests for positioning consistency
   - **Contingency**: Adjust coordinate calculations

2. **Breaking Existing Features**
   - **Mitigation**: Complete test coverage before changes
   - **Contingency**: Feature-specific rollback

## Validation Checklist

### Pre-Implementation

- [ ] Baseline tests created and passing
- [ ] Current behavior documented
- [ ] Risk assessment completed

### During Implementation

- [ ] Each phase has passing tests
- [ ] Visual regressions caught immediately
- [ ] Performance monitored continuously

### Post-Implementation

- [ ] All tests pass (unit + integration + E2E)
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Performance validated

This implementation plan ensures safe consolidation of hex utilities while maintaining identical behavior and performance characteristics.
