# Implementation Tasks: Paper & Hexgrid Layer Plugin Migration

## Overview

Convert paper and hexgrid layers from direct registration to plugin-based registration while maintaining functionality and load order. This is a Level 3 complex feature requiring 15+ tasks with full INVEST compliance.

## Task Breakdown

### Phase 1: Plugin Infrastructure Enhancement

1. **Extend PluginManifest interface with priority field**
   - Add optional `priority?: number` field to PluginManifest interface in `src/plugin/types.ts`
   - Add JSDoc documentation explaining priority system (higher loads first, default 10)
   - Update TypeScript build validation
   - **Requirement**: Plugin system must support deterministic load ordering
   - **Testing**: TypeScript compilation passes, interface exports correctly

2. **Implement priority-based plugin loading in loader**
   - Add priority field to LoadedPlugin type in `src/plugin/loader.ts`
   - Create `loadPluginsWithPriority` function that sorts plugins by priority (descending) then by id
   - Maintain existing `loadPlugin` function for backward compatibility
   - **Requirement**: Anchor layers (paper/hexgrid) must load before content layers
   - **Dependencies**: Task 1 must be completed
   - **Testing**: Unit test priority ordering behavior, verify deterministic sorting

3. **Create unit tests for priority-based plugin loading**
   - Create `src/test/plugin-loader-priority.test.ts`
   - Test plugins load in correct priority order (high to low)
   - Test fallback to ID sorting when priorities are equal
   - Test default priority assignment (10) when undefined
   - **Requirement**: Plugin loading must be predictable and testable
   - **Dependencies**: Task 2 must be completed
   - **Testing**: All priority loading scenarios covered

### Phase 2: Plugin Module Creation

4. **Create paper layer plugin module**
   - Create `src/plugin/builtin/paper.ts` with paperPluginManifest and paperPluginModule
   - Set priority to 100 for anchor layer status
   - Import and register PaperType from existing adapter in activate function
   - **Requirement**: Paper layer must be available as a plugin with high priority
   - **Testing**: Plugin registers paper layer type correctly when activated

5. **Create hexgrid layer plugin module**
   - Create `src/plugin/builtin/hexgrid.ts` with hexgridPluginManifest and hexgridPluginModule
   - Set priority to 100 for anchor layer status
   - Import and register HexgridType from existing adapter in activate function
   - **Requirement**: Hexgrid layer must be available as a plugin with high priority
   - **Testing**: Plugin registers hexgrid layer type correctly when activated

6. **Create unit tests for paper plugin registration**
   - Create `src/test/paper-plugin.test.ts`
   - Mock layer registry and verify PaperType registration on activate
   - Test plugin manifest properties (id, name, version, priority)
   - **Requirement**: Paper plugin must correctly register layer type
   - **Dependencies**: Task 4 must be completed
   - **Testing**: Verify plugin activation calls registerLayerType with PaperType

7. **Create unit tests for hexgrid plugin registration**
   - Create `src/test/hexgrid-plugin.test.ts`
   - Mock layer registry and verify HexgridType registration on activate
   - Test plugin manifest properties (id, name, version, priority)
   - **Requirement**: Hexgrid plugin must correctly register layer type
   - **Dependencies**: Task 5 must be completed
   - **Testing**: Verify plugin activation calls registerLayerType with HexgridType

### Phase 3: Registration Migration

8. **Remove direct layer type registration from project store**
   - Remove PaperType and HexgridType imports from `src/stores/project/index.ts`
   - Remove registerLayerType(PaperType) and registerLayerType(HexgridType) calls
   - Clean up unused imports
   - **Requirement**: Eliminate dual registration pathways
   - **Testing**: TypeScript compilation passes, no unused import warnings

9. **Update app-layout to use priority-based plugin loading**
   - Import paper and hexgrid plugin modules in `src/components/layout/app-layout.tsx`
   - Replace individual loadPlugin calls with single loadPluginsWithPriority call
   - Include paper and hexgrid plugins in priority-sorted plugin array
   - **Requirement**: All plugins load through unified priority system
   - **Dependencies**: Tasks 2, 4, 5, 8 must be completed
   - **Testing**: App loads without errors, plugins load in correct order

10. **Update existing plugin loading sequence**
    - Verify freeform and hex-noise plugins use default priority (10)
    - Ensure campaign and map plugins maintain their current behavior
    - Update plugin loading to be declarative rather than sequential
    - **Requirement**: Existing plugins must continue working with priority system
    - **Dependencies**: Task 9 must be completed
    - **Testing**: All existing functionality preserved

### Phase 4: Integration Testing & Validation

11. **Create integration test for layer creation after migration**
    - Create `src/test/integration/layer-creation-migration.test.ts`
    - Test paper and hexgrid layers are created through plugin system
    - Verify layer properties match pre-migration behavior (policies, names, defaults)
    - **Requirement**: Layer creation behavior must be identical before/after migration
    - **Dependencies**: Tasks 8, 9 must be completed
    - **Testing**: Layer instances created with correct types and properties

12. **Create integration test for plugin load sequence**
    - Create `src/test/integration/plugin-load-sequence.test.ts`
    - Test complete plugin loading with priorities (paper, hexgrid, then others)
    - Verify layer types are registered in correct order
    - **Requirement**: Plugin loading must be deterministic and complete
    - **Dependencies**: Task 10 must be completed
    - **Testing**: All plugins load in expected priority order

13. **Update affected test files that import layer types directly**
    - Find and update tests that import PaperType/HexgridType directly
    - Ensure tests still pass by using layer registry or mocking appropriately
    - Update any hardcoded layer type assumptions
    - **Requirement**: Existing tests must pass with new plugin-based registration
    - **Testing**: Full test suite passes without layer type import errors

14. **Validate layer policies and behaviors are preserved**
    - Test paper and hexgrid layers still have canDelete: false policy
    - Test maxInstances: 1 policy is enforced for both layer types
    - Test layer ordering (paper bottom, hexgrid top) is maintained
    - **Requirement**: All existing layer policies must be preserved
    - **Dependencies**: Task 11 must be completed
    - **Testing**: Layer management behaves identically to pre-migration

15. **Run full test suite and fix any regressions**
    - Execute complete test suite (`pnpm test:run`)
    - Fix any failing tests related to plugin loading or layer registration
    - Verify coverage thresholds are maintained (≥80%)
    - **Requirement**: No regressions in functionality or test coverage
    - **Dependencies**: All previous tasks completed
    - **Testing**: All tests pass, coverage maintained, no runtime errors

## Task Dependencies

- **Sequential Dependencies**: Tasks 1→2→3, Tasks 4→6, Tasks 5→7, Tasks 8→9→10
- **Parallel Opportunities**: Tasks 4&5 can run parallel, Tasks 6&7 can run parallel
- **Integration Gate**: Tasks 8-10 must complete before Tasks 11-12
- **Validation Gate**: Tasks 11-14 must complete before Task 15

## Success Criteria

- Paper and hexgrid layers load as plugins with priority 100
- Plugin loading is deterministic and priority-ordered
- All existing layer functionality preserved (policies, behavior, rendering)
- Full test suite passes without regressions
- No dual registration pathways remain in codebase
- Layer ordering maintained (paper bottom, hexgrid top)

## Rollback Plan

If migration fails:

1. Revert plugin loading changes in app-layout.tsx
2. Restore direct registration calls in project store
3. Remove new plugin files (paper.ts, hexgrid.ts)
4. Revert PluginManifest interface changes
5. Run test suite to verify rollback success
