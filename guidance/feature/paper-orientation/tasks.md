# Paper Orientation Support - Implementation Plan

## Overview

Implementation plan for adding landscape/portrait orientation support to the paper layer system. Tasks are organized by implementation phases for systematic delivery.

## Phase 1: Core Data Model and Geometry (2-3 days)

### Task 1.1: Extend Paper State Interface

**Scope**: Update the core paper state data structure
**Files**: `src/layers/adapters/paper.ts`

- [ ] Add `orientation: "landscape" | "portrait"` to `PaperState` interface
- [ ] Update `PaperType.defaultState` to include `orientation: "landscape"`
- [ ] Update `PaperAdapter.getInvalidationKey()` to include orientation
- [ ] Add TypeScript types for orientation
- [ ] Write unit tests for new state structure

**Dependencies**: None
**Validation**: Paper state includes orientation property with proper defaults

### Task 1.2: Enhance Geometry Calculation

**Scope**: Update scene geometry to handle orientation
**Files**: `src/app/scene/geometry.ts`

- [ ] Add `orientation` property to `ComputePaperRectInput.paper`
- [ ] Update `resolveAspectRatio()` function to accept orientation parameter
- [ ] Implement orientation logic in `resolveAspectRatio()`:
  - Square: no change for either orientation
  - Non-square: swap width/height for portrait
- [ ] Update `computePaperRect()` to use enhanced aspect resolution
- [ ] Write comprehensive unit tests for all aspect/orientation combinations

**Dependencies**: Task 1.1
**Validation**: Geometry calculations produce correct dimensions for all combinations

### Task 1.3: Update Plugin Integration

**Scope**: Ensure paper plugin passes orientation to geometry
**Files**: `src/plugin/builtin/paper.ts`

- [ ] Update scene adapter's `computePaperRect` call to pass full paper object
- [ ] Verify that orientation is properly transmitted to geometry calculation
- [ ] Add integration test for plugin-to-geometry data flow

**Dependencies**: Task 1.2
**Validation**: Plugin correctly passes orientation to scene geometry

## Phase 2: Property Panel UI (1-2 days)

### Task 2.1: Add Orientation Control

**Scope**: Add orientation selector to paper properties
**Files**: `src/plugin/builtin/paper.ts`

- [ ] Add orientation select control to property schema:
  - Type: "select"
  - Options: ["Landscape", "Portrait"]
  - Path: "orientation"
- [ ] Position control between aspect ratio and color
- [ ] Ensure proper labeling and accessibility

**Dependencies**: Task 1.1
**Validation**: Orientation selector appears in paper properties panel

### Task 2.2: Implement Change Handling

**Scope**: Handle orientation changes in UI
**Files**: Property system (existing change handlers)

- [ ] Verify orientation changes trigger immediate paper rectangle update
- [ ] Ensure changes are captured in undo/redo system
- [ ] Test change propagation through the layer system

**Dependencies**: Task 2.1, Phase 1 complete
**Validation**: Orientation changes immediately update paper rectangle

### Task 2.3: Visual Feedback

**Scope**: Ensure proper visual updates on orientation change
**Files**: Canvas rendering system

- [ ] Verify paper border updates immediately
- [ ] Confirm grid reflows to new dimensions
- [ ] Test that content remains properly positioned
- [ ] Add smooth transition (optional enhancement)

**Dependencies**: Task 2.2
**Validation**: Visual changes are immediate and correct

## Phase 3: Migration and Compatibility (1 day)

### Task 3.1: Implement Backward Compatibility

**Scope**: Handle existing campaigns without orientation
**Files**: `src/stores/campaign/persistence.ts`

- [ ] Add migration logic for campaigns missing orientation property
- [ ] Default missing orientation to "landscape"
- [ ] Ensure migration is applied during campaign load
- [ ] Test migration with various existing campaign formats

**Dependencies**: Phase 1 complete
**Validation**: All existing campaigns load with landscape orientation

### Task 3.2: State Validation

**Scope**: Add validation for orientation values
**Files**: Validation utilities

- [ ] Add orientation validation to paper state validation
- [ ] Handle invalid orientation values gracefully
- [ ] Add error handling for malformed state
- [ ] Write tests for validation edge cases

**Dependencies**: Task 3.1
**Validation**: Invalid orientations are handled gracefully

## Phase 4: Testing and Quality Assurance (2 days)

### Task 4.1: Unit Tests

**Scope**: Comprehensive unit test coverage
**Files**: `src/test/`

- [ ] Geometry calculation tests for all aspect/orientation combinations
- [ ] Paper state validation tests
- [ ] Migration logic tests
- [ ] Edge case handling tests
- [ ] Achieve >95% code coverage for new functionality

**Dependencies**: Phases 1-3 complete
**Validation**: All unit tests pass with high coverage

### Task 4.2: Integration Tests

**Scope**: Test component integration
**Files**: `src/test/integration/`

- [ ] Paper layer creation with orientation
- [ ] Property panel orientation changes
- [ ] Scene geometry integration
- [ ] Campaign save/load with orientation
- [ ] Cross-browser compatibility testing

**Dependencies**: Task 4.1
**Validation**: Integration tests pass in all supported environments

### Task 4.3: End-to-End Tests

**Scope**: User workflow testing
**Files**: `src/test/e2e/`

- [ ] Create map, change orientation, verify visual update
- [ ] Paint content, switch orientation, verify preservation
- [ ] Save/load campaign with portrait orientation
- [ ] Test all aspect ratio + orientation combinations
- [ ] Performance testing for orientation switches

**Dependencies**: Task 4.2
**Validation**: E2E tests demonstrate working user workflows

## Phase 5: Documentation and Polish (1 day)

### Task 5.1: Update Documentation

**Scope**: Document new orientation feature
**Files**: Documentation and guidance

- [ ] Update feature documentation
- [ ] Add orientation examples to user guides
- [ ] Document migration behavior
- [ ] Update API documentation for changed interfaces

**Dependencies**: Phase 4 complete
**Validation**: Documentation accurately reflects implementation

### Task 5.2: Performance Optimization

**Scope**: Optimize performance if needed
**Files**: Various rendering components

- [ ] Profile orientation switching performance
- [ ] Optimize geometry calculations if needed
- [ ] Cache orientation-specific calculations if beneficial
- [ ] Verify <100ms orientation switch requirement is met

**Dependencies**: Task 5.1
**Validation**: Performance meets requirements

### Task 5.3: Final Testing and Polish

**Scope**: Final quality assurance
**Files**: All components

- [ ] Full regression testing
- [ ] Accessibility testing
- [ ] Cross-platform testing
- [ ] User acceptance testing
- [ ] Bug fixes and polish

**Dependencies**: Task 5.2
**Validation**: Feature ready for production release

## Test Strategy

### Unit Test Coverage

- `resolveAspectRatio()` function with all combinations
- `computePaperRect()` with orientation variations
- Paper state validation and migration
- Edge cases and error conditions

### Integration Test Scenarios

```typescript
describe("Paper Orientation Integration", () => {
  test("changing orientation updates paper rectangle", () => {
    // Create paper layer with landscape 16:10
    // Change to portrait
    // Verify dimensions swap (10 wide × 16 tall)
  });

  test("orientation persists across save/load", () => {
    // Set portrait orientation
    // Save campaign
    // Load campaign
    // Verify orientation is still portrait
  });
});
```

### E2E Test Scenarios

```gherkin
Feature: Paper Orientation Support
  Scenario: User switches paper orientation
    Given I have a map with 16:10 landscape orientation
    When I change the orientation to portrait
    Then the paper should become taller than wide
    And my painted content should remain visible

  Scenario: Orientation persists
    Given I have set my map to portrait orientation
    When I save and reload the campaign
    Then the orientation should still be portrait
```

## Risk Management

### High Priority Risks

1. **Breaking existing campaigns**
   - Mitigation: Comprehensive migration testing
   - Contingency: Rollback capability

2. **Performance degradation**
   - Mitigation: Performance profiling and optimization
   - Contingency: Optimize geometry calculations

### Medium Priority Risks

1. **User confusion about orientation vs rotation**
   - Mitigation: Clear labeling and documentation
   - Contingency: UX improvements

2. **Complex interactions with grid system**
   - Mitigation: Thorough integration testing
   - Contingency: Grid system adjustments if needed

## Dependencies

### Internal Dependencies

- Paper layer system (existing)
- Property panel system (existing)
- Scene geometry calculations (existing)
- Campaign persistence system (existing)

### External Dependencies

- TypeScript compilation
- Test framework (Vitest)
- E2E testing (Playwright)

## Success Criteria

### Functional Success

- [ ] Users can select landscape or portrait orientation
- [ ] Orientation changes immediately update paper dimensions
- [ ] Content is preserved during orientation changes
- [ ] Orientation persists across save/load
- [ ] All existing campaigns continue to work

### Technical Success

- [ ] No performance regression (orientation switch <100ms)
- [ ] 100% backward compatibility
- [ ] > 95% test coverage for new code
- [ ] All E2E tests pass

### User Success

- [ ] Intuitive orientation selection
- [ ] Predictable behavior when switching orientations
- [ ] No data loss during orientation changes
- [ ] Positive feedback from user testing

## Implementation Schedule

| Phase   | Duration | Start Dependencies  |
| ------- | -------- | ------------------- |
| Phase 1 | 3 days   | None                |
| Phase 2 | 2 days   | Phase 1 complete    |
| Phase 3 | 1 day    | Phase 1 complete    |
| Phase 4 | 2 days   | Phases 1-3 complete |
| Phase 5 | 1 day    | Phase 4 complete    |

**Total Duration**: 9 days
**Critical Path**: Phase 1 → Phase 2 → Phase 4 → Phase 5

## Validation Checklist

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] ESLint rules pass
- [ ] Prettier formatting applied
- [ ] No console.log statements in production code

### Testing

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance tests meet requirements

### Documentation

- [ ] Code comments added for complex logic
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] Migration notes documented

### Release Readiness

- [ ] Feature flag toggle (if applicable)
- [ ] Rollback plan documented
- [ ] Performance monitoring in place
- [ ] User feedback collection ready
