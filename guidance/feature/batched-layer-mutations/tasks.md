# Implementation Tasks: T-020 Batched Layer State Mutations

**Feature Type:** Level 3 (Complex Infrastructure Change)
**Target Performance:** <50ms for 1000 cell operations, single render invalidation
**Dependencies:** Foundation for T-023 Flood Fill Tool

---

## Task Breakdown

### Phase 1: Core Batch API Infrastructure (Week 1)

1. **Implement core batch API in campaign store**
   - Add `applyLayerStateBatch<T>(layerId: string, updater: (draft: T) => void | T): void` to `CampaignStoreState` interface
   - Add internal `_batchUpdateLayerState` helper using Immer's `produce` function
   - Integrate with existing `set()` function to trigger single state update
   - **References:** F1 from requirements - batch layer state API
   - **Dependencies:** None
   - **Validation:** Function exists, compiles with TypeScript, single `set()` call per batch

2. **Create batch operation validation system**
   - Define `BatchLimits` interface with maxOperations (10,000), timeoutMs (1,000ms), maxMemoryMB (50MB)
   - Implement `validateBatchOperation()` function with cell key format validation
   - Add operation counting for batch size enforcement
   - **References:** F1 from requirements - batch size limits, error validation from design
   - **Dependencies:** Task 1
   - **Validation:** Batch operations reject invalid inputs, enforce size limits

3. **Implement delta-based API**
   - Define `CellsDelta` interface with `set?: Record<string, FreeformCell>` and `delete?: string[]`
   - Add `applyCellsDelta(layerId: string, delta: CellsDelta): void` to store interface
   - Implement using `_batchUpdateLayerState` helper for consistent behavior
   - **References:** F1 from requirements - alternative delta API
   - **Dependencies:** Task 1
   - **Validation:** Delta operations correctly add/remove cells, single store update

4. **Add error handling and rollback mechanism**
   - Implement state snapshot capture before batch operations
   - Add atomic rollback on batch operation failures
   - Create `BatchResult<T>` interface for operation feedback
   - **References:** Error handling section from design, F3 requirements
   - **Dependencies:** Tasks 1-3
   - **Validation:** Failed operations leave layer state unchanged, clear error messages

5. **Create unit test suite for batch operations**
   - Test `applyLayerStateBatch` with Immer draft mutations
   - Test `applyCellsDelta` set/delete operations
   - Verify single store update per batch operation
   - Test validation limits and error scenarios
   - **References:** Testing strategy from design, 95% coverage requirement
   - **Dependencies:** Tasks 1-4
   - **Validation:** All tests pass, >95% coverage for batch logic

### Phase 2: Performance Optimization & Integration (Week 2)

6. **Optimize Immer integration for large batches**
   - Profile memory allocation patterns for 1000+ cell operations
   - Implement structural sharing optimization strategies
   - Add memory usage monitoring with performance.memory API
   - **References:** F3 from requirements - optimized cell state management
   - **Dependencies:** Task 1
   - **Validation:** <10MB additional memory for any batch size

7. **Implement performance monitoring infrastructure**
   - Create `BatchMetrics` interface tracking execution time, memory usage, operation count
   - Add `withBatchMetrics()` wrapper function for performance measurement
   - Integrate timing benchmarks in batch operations
   - **References:** Performance requirements - <50ms for 1000 operations
   - **Dependencies:** Tasks 1-3
   - **Validation:** Performance metrics accurately captured, sub-50ms execution confirmed

8. **Create integration tests for render invalidation**
   - Test single `layersKey` recalculation per batch operation
   - Verify `getInvalidationKey()` called once per layer per batch
   - Test canvas viewport integration with batch updates
   - **References:** F2 from requirements - single render invalidation
   - **Dependencies:** Tasks 1-3
   - **Validation:** Single render cycle per batch, no intermediate states visible

9. **Implement backward compatibility verification**
   - Test existing `updateLayerState` continues working unchanged
   - Verify no performance regression for single-cell operations
   - Test plugin compatibility with current layer state APIs
   - **References:** F1 from requirements - backward compatibility
   - **Dependencies:** Tasks 1-8
   - **Validation:** Existing functionality unaffected, plugins work unchanged

10. **Add performance regression testing**
    - Create benchmark suite for 100, 500, 1000, 5000 cell batch operations
    - Implement automated performance testing in CI
    - Set up memory leak detection for large batch sequences
    - **References:** Performance requirements from design
    - **Dependencies:** Tasks 6-7
    - **Validation:** All benchmarks meet <50ms target, no memory leaks detected

### Phase 3: Production Readiness & Documentation (Week 3)

11. **Enhance validation with comprehensive error scenarios**
    - Add malformed cell key detection (non "q,r" format)
    - Implement timeout protection for long-running batches
    - Add memory pressure detection and early abort
    - **References:** Error scenarios from design
    - **Dependencies:** Tasks 2, 4
    - **Validation:** All error conditions handled gracefully, clear user feedback

12. **Create TypeScript type safety enhancements**
    - Add proper generic typing for `applyLayerStateBatch<T>`
    - Implement strict typing for `CellsDelta` operations
    - Add type guards for layer state validation
    - **References:** Developer experience requirements
    - **Dependencies:** Tasks 1-3
    - **Validation:** Full TypeScript compilation, proper intellisense

13. **Implement E2E test scenarios**
    - Test flood fill foundation with 500-1000 cell batches
    - Test memory efficiency across multiple large operations
    - Test error recovery and state consistency
    - **References:** BDD scenarios from requirements
    - **Dependencies:** Tasks 1-12
    - **Validation:** E2E scenarios pass, foundation ready for T-023

14. **Create API documentation and migration examples**
    - Document `applyLayerStateBatch` usage patterns with code examples
    - Document `applyCellsDelta` for bulk import/export scenarios
    - Create migration guide for plugin developers
    - **References:** Documentation requirements from design
    - **Dependencies:** Tasks 1-13
    - **Validation:** Complete API docs, working code examples

15. **Final validation and performance benchmarking**
    - Run complete test suite with performance validation
    - Verify all acceptance criteria from requirements document
    - Conduct memory leak testing under stress conditions
    - **References:** All success criteria from requirements
    - **Dependencies:** All previous tasks
    - **Validation:** All requirements met, ready for T-023 dependency

---

## Implementation Notes

### Technical Approach

- **Immer Integration:** Leverage existing Zustand+Immer setup for structural sharing
- **Single Update Pattern:** All batch operations result in exactly one `set()` call
- **Memory Efficiency:** Use structural sharing to minimize object allocation
- **Error Boundaries:** Atomic operations with full rollback on failure

### Key Design Decisions

- **Dual API Strategy:** Both functional (`applyLayerStateBatch`) and declarative (`applyCellsDelta`) patterns
- **Upfront Validation:** Fail fast to prevent wasted computation
- **Performance First:** Sub-50ms execution target drives all optimization decisions
- **Backward Compatible:** Existing `updateLayerState` unchanged

### Risk Mitigation

- **Memory Monitoring:** Track heap usage to prevent browser OOM
- **Batch Limits:** 10,000 operation maximum prevents DoS scenarios
- **Timeout Protection:** 1-second limit prevents UI blocking
- **Comprehensive Testing:** >95% coverage with performance benchmarks

### Success Criteria

- ✅ **Performance Target:** 1000 cell operations in <50ms
- ✅ **Render Optimization:** Single invalidation per batch
- ✅ **Memory Efficiency:** <10MB overhead regardless of batch size
- ✅ **Developer Experience:** Simple API with full TypeScript support
- ✅ **Foundation Ready:** Enables T-023 Flood Fill implementation

---

## Files Modified

### Core Implementation

- `src/stores/campaign/index.ts` - Add batch APIs to CampaignStoreState
- `src/layers/adapters/freeform-hex.ts` - Import types for delta operations (if needed)

### Testing

- `src/test/unit/stores/test_batch_mutations.test.ts` - Core unit tests
- `src/test/integration/test_batch_rendering.test.ts` - Integration tests
- `src/test/performance/test_batch_performance.test.ts` - Performance benchmarks
- `src/test/e2e/test_batch_operations.test.ts` - End-to-end validation

### Types (if needed)

- `src/types/batch-operations.ts` - Shared interfaces and types

This implementation plan provides a systematic approach to delivering efficient batch layer state mutations that will serve as the foundation for advanced editing tools while maintaining Map&Territory's professional content creation experience.
