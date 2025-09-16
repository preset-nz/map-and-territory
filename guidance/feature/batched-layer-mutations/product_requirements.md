# Product Requirements: T-020 Batched Layer State Mutations

**Feature Type:** Must-Have Performance Optimization
**Dependencies:** Foundation for T-023 Flood Fill Tool
**Target Release:** Next Sprint
**Complexity:** Level 3 (Complex Infrastructure Change)

---

## Vision & Problem Statement

### Current Problem

The existing `updateLayerState` function triggers individual store updates and render invalidations for each cell modification. When applying large-scale edits (like flood fill operations affecting 1000+ cells), this creates severe performance bottlenecks:

- **UI Lag**: Each individual cell update triggers a render cycle, causing visible lag
- **Inefficient Rendering**: 1000 individual renders instead of 1 batched render
- **Poor User Experience**: Tools feel unresponsive during bulk operations
- **Development Friction**: Plugin developers avoid bulk operations due to performance

### Vision

Enable efficient bulk editing operations that feel instantaneous and responsive, providing a foundation for advanced editing tools like flood fill, copy/paste, and import operations while maintaining the professional content creation experience.

---

## User Impact Analysis

### Game Masters (Primary Users)

- **Current Pain**: Flood fill operations freeze the interface, breaking creative flow
- **Desired Outcome**: Large terrain painting feels as responsive as single hex painting
- **Success Metric**: Can paint 100+ connected hexes instantly without noticeable delay

### Content Creators (Power Users)

- **Current Pain**: Bulk import/paste operations are unusable for large maps
- **Desired Outcome**: Efficient workflows for processing large datasets
- **Success Metric**: Can import 500+ hex coordinates in <1 second

### Plugin Developers (Technical Users)

- **Current Pain**: Avoid implementing bulk operations due to performance concerns
- **Desired Outcome**: Clean, performant API for batch operations
- **Success Metric**: Simple API that handles optimization transparently

---

## Functional Requirements

### F1: Batch Layer State API

**User Story**: As a plugin developer, I want to apply multiple cell changes in a single operation so that large edits perform efficiently.

**Acceptance Criteria**:

- Store provides `applyLayerStateBatch(layerId, updater)` function using immer draft pattern
- Alternative delta API: `applyCellsDelta(layerId, { set: Record<key,cell>, del: string[] })`
- Both APIs trigger exactly one store update and one render invalidation per batch
- Existing `updateLayerState` behavior remains unchanged for backward compatibility
- Batch size limited to 10,000 operations to prevent memory issues

### F2: Single Render Invalidation

**User Story**: As a user painting large areas, I want the interface to remain responsive so that my creative flow isn't interrupted.

**Acceptance Criteria**:

- Renderer detects batch operations and consolidates invalidation
- No intermediate render states visible during batch processing
- Render caching keys update once per batch, not per operation
- Canvas updates occur in single frame after batch completion
- Loading states manage user feedback during processing

### F3: Optimized Cell State Management

**User Story**: As a developer, I want cell updates to be memory-efficient so that large maps don't consume excessive resources.

**Acceptance Criteria**:

- Immer structural sharing minimizes memory allocation
- Delta operations (add/remove/replace) handle partial updates efficiently
- Garbage collection optimized by reusing cell objects where possible
- Memory usage scales linearly with actual changes, not batch size
- Performance monitoring logs memory impact of batch operations

---

## Non-Functional Requirements

### Performance Requirements

- **Batch Processing**: 1000 cell edits execute in <50ms on baseline hardware
- **Memory Efficiency**: Batch operations use <10MB additional memory regardless of size
- **Render Performance**: Single render invalidation completes in <16ms (60fps)
- **API Responsiveness**: Batch API calls return synchronously without blocking

### Usability Requirements

- **Transparent Operation**: Users don't notice difference between single and batch edits
- **Consistent Behavior**: Undo/redo works identically for batch and individual operations
- **Error Handling**: Batch failures don't corrupt layer state
- **Progress Feedback**: Operations >100ms show loading indication

### Developer Experience

- **Simple API**: Batch operations require minimal code changes
- **Type Safety**: Full TypeScript support with proper generics
- **Error Messages**: Clear feedback for malformed batch operations
- **Documentation**: Code examples for common batch patterns

---

## Detailed Acceptance Criteria (BDD Scenarios)

### Scenario 1: Large Paint Operation Performance

```gherkin
Given a freeform layer with 0 existing cells
When I apply a batch update with 1000 new cells
Then the operation completes in under 50ms
And the renderer invalidates exactly once
And all 1000 cells are visible in the final render
```

### Scenario 2: Flood Fill Foundation

```gherkin
Given a partially filled freeform layer
When I trigger a flood fill operation affecting 500 cells
Then the batch API processes all changes atomically
And no intermediate states are visible to the user
And the operation feels instantaneous
```

### Scenario 3: Memory Efficiency

```gherkin
Given a layer with 10,000 existing cells
When I apply a batch update to 2,000 cells
Then memory usage increases by less than 5MB
And garbage collection occurs efficiently
And subsequent operations maintain performance
```

### Scenario 4: Error Handling

```gherkin
Given a batch operation with invalid cell data
When the batch is applied
Then no partial changes are committed
And the layer state remains unchanged
And a clear error message is provided
```

### Scenario 5: Backward Compatibility

```gherkin
Given existing plugins using updateLayerState
When the batch API is introduced
Then existing plugins continue working unchanged
And performance of single updates is not degraded
And API behavior remains consistent
```

---

## Success Metrics

### Performance Metrics

- **Batch Operation Latency**: <50ms for 1000 cell operations
- **Render Invalidation Count**: 1 per batch (down from N per batch)
- **Memory Overhead**: <10MB regardless of batch size
- **API Response Time**: <5ms for batch setup and execution

### User Experience Metrics

- **Perceived Performance**: Large operations feel instantaneous
- **Tool Responsiveness**: No UI freezing during bulk edits
- **Creative Flow**: Users don't avoid large operations due to performance

### Technical Quality Metrics

- **Test Coverage**: >95% for batch operation code paths
- **API Adoption**: Plugin developers migrate to batch APIs
- **Error Rate**: <0.1% for valid batch operations
- **Memory Leaks**: 0 detected in stress testing

---

## Dependencies & Constraints

### Dependencies

- **Zustand Store**: Current campaign store architecture
- **Immer Integration**: For efficient immutable updates
- **Layer Registry**: Existing layer type system
- **Render Pipeline**: Current canvas invalidation system

### Technical Constraints

- **Memory Limits**: Browser memory constraints for large batches
- **API Compatibility**: Must not break existing plugin interfaces
- **Performance Baseline**: M1 MacBook Air as minimum target hardware
- **TypeScript Support**: Full type safety required

### Business Constraints

- **Development Timeline**: Must be completed before T-023 Flood Fill
- **Backward Compatibility**: Cannot break existing plugins
- **Testing Requirements**: Comprehensive performance and integration tests
- **Documentation**: Complete API documentation and migration guide

---

## Implementation Approach

### Phase 1: Core Batch API (Week 1)

- Implement `applyLayerStateBatch` with immer integration
- Add render invalidation consolidation
- Unit tests for batch operations
- Performance benchmarking setup

### Phase 2: Delta API & Optimization (Week 2)

- Implement `applyCellsDelta` for explicit operations
- Memory optimization and garbage collection tuning
- Integration tests with freeform layer
- Error handling and validation

### Phase 3: Integration & Testing (Week 3)

- E2E tests for large batch operations
- Performance regression testing
- Documentation and migration examples
- Plugin compatibility validation

---

## Future Considerations

### Scaling Opportunities

- **Web Workers**: Move batch processing off main thread for larger operations
- **Streaming Updates**: Progressive rendering for massive datasets
- **Compression**: Efficient serialization for save/load operations

### Plugin Ecosystem

- **Batch Utilities**: Helper functions for common batch patterns
- **Performance Monitoring**: Built-in timing and memory tracking
- **Operation Composition**: Chain multiple batch operations efficiently

This foundation enables advanced editing features while maintaining Map&Territory's professional content creation experience and setting the stage for sophisticated tools like flood fill, terrain generation, and bulk import capabilities.
