# Hex Outlines Implementation Tasks

**Feature:** Hex Outlines Drawing Tool
**Date:** September 23, 2025
**Status:** Ready for Implementation

---

## Task Breakdown

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 Data Types and Interfaces

- [ ] **Create outline type definitions** (`src/lib/outline/types.ts`)
  - `OutlinePath`, `HexCorner`, `OutlineStyle` interfaces
  - Type guards and validation utilities
  - **Dependencies:** None
  - **Estimated:** 2 hours

#### 1.2 Hex Corner Utilities

- [ ] **Implement corner coordinate system** (`src/lib/outline/corners.ts`)
  - Corner-to-pixel conversion functions
  - Corner adjacency and pathfinding helpers
  - Integration with existing hex layout system
  - **Dependencies:** 1.1
  - **Estimated:** 4 hours

#### 1.3 Layer Adapter Foundation

- [ ] **Create outline layer adapter** (`src/layers/adapters/outline.ts`)
  - Basic Canvas2D rendering implementation
  - Invalidation key generation
  - Path2D object creation and caching
  - **Dependencies:** 1.1, 1.2
  - **Estimated:** 6 hours

### Phase 2: Plugin Integration

#### 2.1 Plugin Registration

- [ ] **Create outline plugin** (`src/plugin/builtin/outline.ts`)
  - Plugin manifest with commands and toolbar items
  - Layer type registration
  - Basic property schema (opacity, default style)
  - **Dependencies:** 1.3
  - **Estimated:** 3 hours

#### 2.2 Property Configuration

- [ ] **Implement property schema** (within 2.1)
  - Color, width, pattern, smoothing controls
  - Roughness slider for atmospheric effects
  - Default style template management
  - **Dependencies:** 2.1
  - **Estimated:** 2 hours

#### 2.3 Command Handlers

- [ ] **Add layer management commands** (within 2.1)
  - "Add Outline Layer" command implementation
  - Layer insertion logic following freeform patterns
  - Default state initialization
  - **Dependencies:** 2.1
  - **Estimated:** 2 hours

### Phase 3: Interactive Tools

#### 3.1 Basic Drawing Tool

- [ ] **Implement outline drawing tool** (within 2.1)
  - Corner hit-testing with tolerance zones
  - Click-to-add corner functionality
  - Active path state management
  - **Dependencies:** 2.1, 1.2
  - **Estimated:** 8 hours

#### 3.2 Visual Feedback System

- [ ] **Add real-time preview** (extends 3.1)
  - Hover effects on corner candidates
  - Preview line from last corner to cursor
  - Active path highlighting
  - **Dependencies:** 3.1
  - **Estimated:** 4 hours

#### 3.3 Keyboard Controls

- [ ] **Implement keyboard shortcuts** (extends 3.1)
  - ESC to finish active path
  - ENTER to close path into loop
  - DELETE to remove last corner
  - **Dependencies:** 3.1
  - **Estimated:** 2 hours

### Phase 4: Pathfinding Algorithm

#### 4.1 Corner Graph Construction

- [ ] **Build corner adjacency system** (`src/lib/outline/pathfinding.ts`)
  - Corner-to-corner navigation rules
  - Efficient neighbor lookup
  - Direction preference handling
  - **Dependencies:** 1.2
  - **Estimated:** 6 hours

#### 4.2 Path Search Implementation

- [ ] **Implement smart corner connection** (extends 4.1)
  - Dijkstra's shortest path algorithm
  - Direction bias for natural-feeling paths
  - Gap-filling when corners are skipped
  - **Dependencies:** 4.1
  - **Estimated:** 8 hours

#### 4.3 Tool Integration

- [ ] **Connect pathfinding to drawing tool** (extends 3.1)
  - Auto-path when corners are non-adjacent
  - User confirmation for suggested paths
  - Fallback to direct connection
  - **Dependencies:** 4.2, 3.1
  - **Estimated:** 4 hours

### Phase 5: Rendering Enhancement

#### 5.1 Line Styling

- [ ] **Implement pattern rendering** (extends 1.3)
  - Solid, dashed, dotted line patterns
  - Custom dash array configurations
  - Pattern scaling with line width
  - **Dependencies:** 1.3
  - **Estimated:** 4 hours

#### 5.2 Path Smoothing

- [ ] **Add smoothing algorithms** (extends 1.3)
  - Strict hex-edge mode (current behavior)
  - Smooth curve interpolation using bezier curves
  - Configurable smoothing strength
  - **Dependencies:** 5.1
  - **Estimated:** 6 hours

#### 5.3 Atmospheric Effects

- [ ] **Implement roughness system** (extends 5.2)
  - Random path deviation for organic feel
  - Ink-splatter effect simulation
  - Gritty aesthetic enhancement
  - **Dependencies:** 5.2
  - **Estimated:** 8 hours

### Phase 6: Performance Optimization

#### 6.1 Caching System

- [ ] **Implement Path2D caching** (extends 1.3)
  - Cache compiled paths per style
  - Invalidation on style or geometry changes
  - Memory management with LRU eviction
  - **Dependencies:** 1.3, 5.3
  - **Estimated:** 4 hours

#### 6.2 Viewport Culling

- [ ] **Add viewport optimization** (extends 6.1)
  - Only render paths intersecting viewport
  - Level-of-detail for zoomed-out views
  - Spatial indexing for large maps
  - **Dependencies:** 6.1
  - **Estimated:** 6 hours

### Phase 7: Testing and Polish

#### 7.1 Unit Tests

- [ ] **Create core utility tests** (`src/test/outline-*.test.ts`)
  - Corner coordinate conversion tests
  - Pathfinding algorithm verification
  - Edge cases and boundary conditions
  - **Dependencies:** All previous phases
  - **Estimated:** 8 hours

#### 7.2 Integration Tests

- [ ] **Add layer integration tests** (extends 7.1)
  - Plugin loading and registration
  - Tool interaction workflows
  - Rendering pipeline validation
  - **Dependencies:** 7.1
  - **Estimated:** 6 hours

#### 7.3 E2E Testing

- [ ] **Create Playwright test scenarios** (`src/test/e2e/outline-*.spec.ts`)
  - User workflow automation
  - Cross-browser compatibility
  - Performance regression detection
  - **Dependencies:** 7.2
  - **Estimated:** 8 hours

---

## Implementation Dependencies

### Critical Path

```
1.1 → 1.2 → 1.3 → 2.1 → 3.1 → 4.1 → 4.2 → 4.3
```

### Parallel Workstreams

- **Rendering** (5.1, 5.2, 5.3) can be developed alongside pathfinding
- **Testing** (7.1, 7.2, 7.3) can begin once core functionality exists
- **Optimization** (6.1, 6.2) is independent and can be done last

### Integration Points

- **Phase 2** requires stable foundation from Phase 1
- **Phase 4** (pathfinding) integrates with Phase 3 (tools)
- **Phase 6** (optimization) requires completed rendering pipeline

## Development Estimates

| Phase                          | Hours | Critical Path |
| ------------------------------ | ----- | ------------- |
| Phase 1: Infrastructure        | 12    | ✓             |
| Phase 2: Plugin Integration    | 7     | ✓             |
| Phase 3: Interactive Tools     | 14    | ✓             |
| Phase 4: Pathfinding           | 18    | ✓             |
| Phase 5: Rendering Enhancement | 18    | Parallel      |
| Phase 6: Performance           | 10    | Final         |
| Phase 7: Testing               | 22    | Parallel      |

**Total Estimated Time:** 101 hours
**Critical Path Time:** 51 hours

## Quality Gates

### Phase Completion Criteria

#### Phase 1 Complete When:

- [ ] Outline layer renders basic straight-line paths
- [ ] Corner coordinate conversion is accurate
- [ ] Layer adapter passes invalidation tests

#### Phase 3 Complete When:

- [ ] User can click corners to create paths
- [ ] Visual feedback shows corner hover states
- [ ] Keyboard shortcuts function correctly

#### Phase 4 Complete When:

- [ ] Skipping corners auto-fills optimal path
- [ ] Direction preferences work naturally
- [ ] Performance is acceptable for 100+ corner paths

#### Final Release Criteria:

- [ ] All unit tests pass with >90% coverage
- [ ] E2E tests cover major user workflows
- [ ] Performance meets <16ms frame budget
- [ ] Feature works in both hex orientations
- [ ] Export includes outline layers in PNG/SVG

## Risk Mitigation

### Technical Risks

- **Corner Hit-Testing Accuracy**: Prototype early with small tolerance zones
- **Pathfinding Performance**: Implement with early performance testing
- **Canvas Rendering Complexity**: Start with simple lines, add effects incrementally

### Integration Risks

- **Plugin System Changes**: Follow existing plugin patterns closely
- **Hex Coordinate Edge Cases**: Test with both orientations early
- **Layer Ordering Conflicts**: Verify Z-index behavior with existing layers

This task breakdown provides a clear implementation path while maintaining flexibility for iteration and refinement during development.
