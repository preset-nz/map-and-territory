# Solutions Design: T-020 Batched Layer State Mutations

**Status:** Draft
**Feature Type:** Level 3 (Complex Infrastructure Change)
**Dependencies:** Foundation for T-023 Flood Fill Tool
**Target Performance:** <50ms for 1000 cell operations

---

## Overview

This feature implements efficient batch operations for layer state mutations, addressing severe performance bottlenecks in the current system where individual `updateLayerState()` calls trigger separate render invalidations. The solution provides both immer-based and delta-based APIs to support different usage patterns while maintaining backward compatibility.

### Integration Approach

The batch APIs will be added to the existing `CampaignStoreState` interface alongside the current `updateLayerState` method. The implementation leverages Zustand's built-in state updates combined with Immer for efficient immutable mutations, while consolidating render invalidation to a single operation per batch.

---

## Current State Analysis

### Performance Issues

1. **Individual Updates**: Each `updateLayerState()` call triggers a full Zustand state update
2. **Render Cascade**: Every state update triggers `layersKey` recalculation in `canvas-viewport.tsx` (lines 73-90)
3. **Invalidation Storm**: 1000 individual updates = 1000 render invalidations instead of 1
4. **Memory Churn**: Object spreading creates intermediate objects for each mutation

### Current Architecture

```typescript
// Current updateLayerState implementation (line 551-581)
updateLayerState: (layerId, patch) => {
  // ... find layer logic
  set({
    current: {
      ...cur,
      maps: cur.maps.map((m) =>
        m === map
          ? {
              ...m,
              layers: (m.layers ?? []).map((l) =>
                l.id === layerId
                  ? {
                      ...l,
                      state: isRecord(l.state)
                        ? { ...l.state, ...patch }
                        : patch,
                    }
                  : l,
              ),
            }
          : m,
      ),
    },
    dirty: true,
  });
};
```

### Invalidation Key System

The `canvas-viewport.tsx` component generates a composite invalidation key (lines 73-90):

```typescript
const layersKey = useMemo(() => {
  return layers
    .map((l) => {
      const getKey = (t.adapter as LayerAdapter<unknown>).getInvalidationKey;
      const key = getKey(l.state as unknown);
      return `${l.type}:${l.visible ? "1" : "0"}:${key}`;
    })
    .join("|");
}, [layers]);
```

This key drives render decisions, so batch operations must ensure this is computed only once per batch.

---

## Architecture

### Core Design Principles

1. **Single Invalidation**: Batch operations trigger exactly one store update and one render cycle
2. **Immer Integration**: Leverage existing Immer dependency for efficient immutable updates
3. **API Flexibility**: Support both functional (immer) and declarative (delta) patterns
4. **Memory Efficiency**: Structural sharing minimizes allocation overhead
5. **Backward Compatibility**: Existing `updateLayerState` continues working unchanged

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CampaignStore (Zustand)                                     │
├─────────────────────────────────────────────────────────────┤
│ Current API:                                                │
│ • updateLayerState(layerId, patch)                          │
│                                                             │
│ New Batch APIs:                                             │
│ • applyLayerStateBatch(layerId, updater)                    │
│ • applyCellsDelta(layerId, delta)                           │
│                                                             │
│ Internal:                                                   │
│ • _batchUpdateLayerState(layerId, finalState)               │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ Single state update
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Canvas Viewport                                             │
├─────────────────────────────────────────────────────────────┤
│ • layersKey recalculation (triggered once)                 │
│ • getInvalidationKey() called once per layer               │
│ • Single render cycle                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Plugin/Tool Call
     │
     ▼
Batch API (applyLayerStateBatch / applyCellsDelta)
     │
     ▼
Immer Draft Mutations (in-memory, no side effects)
     │
     ▼
Single Zustand set() Call
     │
     ▼
Canvas Viewport Re-render (once)
     │
     ▼
Updated Canvas Display
```

---

## Components

### 1. Batch API Interface

```typescript
interface CampaignStoreState {
  // Existing API (unchanged)
  updateLayerState: (layerId: string, patch: Record<string, unknown>) => void;

  // New Batch APIs
  applyLayerStateBatch: <T>(
    layerId: string,
    updater: (draft: T) => void | T,
  ) => void;

  applyCellsDelta: (layerId: string, delta: CellsDelta) => void;
}

interface CellsDelta {
  set?: Record<string, FreeformCell>;
  delete?: string[];
}
```

### 2. Immer Updater Function

```typescript
// Internal helper for efficient batch updates
function _batchUpdateLayerState<T>(
  get: () => CampaignStoreState,
  set: (state: Partial<CampaignStoreState>) => void,
  layerId: string,
  updater: (draft: T) => void | T,
): void {
  const current = get().current;
  if (!current) return;

  const map = current.maps.find((m) => m.id === current.activeMapId);
  if (!map) return;

  const layerIndex = (map.layers ?? []).findIndex((l) => l.id === layerId);
  if (layerIndex === -1) return;

  // Use Immer to create new state with structural sharing
  const newCurrent = produce(current, (draft) => {
    const mapDraft = draft.maps.find((m) => m.id === current.activeMapId)!;
    const layerDraft = mapDraft.layers![layerIndex];

    // Apply updater to layer state
    const result = updater(layerDraft.state as T);
    if (result !== undefined) {
      layerDraft.state = result;
    }
  });

  // Single state update
  set({ current: newCurrent, dirty: true });
}
```

### 3. Delta API Implementation

```typescript
function applyCellsDelta(layerId: string, delta: CellsDelta): void {
  _batchUpdateLayerState<FreeformState>(layerId, (draft) => {
    // Delete operations
    if (delta.delete) {
      for (const key of delta.delete) {
        delete draft.cells[key];
      }
    }

    // Set operations
    if (delta.set) {
      Object.assign(draft.cells, delta.set);
    }
  });
}
```

### 4. Performance Monitoring

```typescript
interface BatchMetrics {
  operationCount: number;
  executionTimeMs: number;
  memoryUsageMB: number;
  invalidationKey: string;
}

function withBatchMetrics<T>(
  operation: () => T,
  operationCount: number,
): { result: T; metrics: BatchMetrics } {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize ?? 0;

  const result = operation();

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize ?? 0;

  return {
    result,
    metrics: {
      operationCount,
      executionTimeMs: endTime - startTime,
      memoryUsageMB: (endMemory - startMemory) / 1024 / 1024,
      invalidationKey: "measured-after-operation",
    },
  };
}
```

---

## Data Models

### Core Types

```typescript
// Freeform layer cell (existing)
interface FreeformCell {
  terrainId?: string;
  color?: string;
}

// Freeform layer state (existing)
interface FreeformState {
  cells: Record<string, FreeformCell>; // key: "q,r"
  opacity: number;
  brushTerrainId?: string;
  brushColor?: string;
}

// New: Delta operation specification
interface CellsDelta {
  set?: Record<string, FreeformCell>;
  delete?: string[];
}

// New: Batch operation result
interface BatchResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  metrics?: BatchMetrics;
}

// New: Batch operation constraints
interface BatchLimits {
  maxOperations: number; // 10,000
  timeoutMs: number; // 1,000ms
  maxMemoryMB: number; // 50MB
}
```

### Usage Patterns

```typescript
// Pattern 1: Functional updates with Immer
store.applyLayerStateBatch<FreeformState>(layerId, (draft) => {
  // Direct mutations to draft
  draft.cells["0,0"] = { terrainId: "forest" };
  draft.cells["1,0"] = { terrainId: "forest" };
  draft.opacity = 0.8;
});

// Pattern 2: Delta operations
store.applyCellsDelta(layerId, {
  set: {
    "0,0": { terrainId: "forest" },
    "1,0": { terrainId: "forest" },
    "2,0": { terrainId: "forest" },
  },
  delete: ["5,5", "6,6"],
});

// Pattern 3: Large batch with error handling
try {
  const cells: Record<string, FreeformCell> = {};
  for (let i = 0; i < 1000; i++) {
    cells[`${i},0`] = { terrainId: "water" };
  }

  store.applyCellsDelta(layerId, { set: cells });
} catch (error) {
  console.error("Batch operation failed:", error);
}
```

---

## Error Handling

### Validation Strategy

```typescript
function validateBatchOperation(
  delta: CellsDelta,
  limits: BatchLimits,
): { valid: boolean; error?: string } {
  const operationCount =
    (delta.set ? Object.keys(delta.set).length : 0) +
    (delta.delete ? delta.delete.length : 0);

  if (operationCount > limits.maxOperations) {
    return {
      valid: false,
      error: `Operation count ${operationCount} exceeds limit ${limits.maxOperations}`,
    };
  }

  // Validate cell keys format
  const allKeys = [
    ...(delta.set ? Object.keys(delta.set) : []),
    ...(delta.delete ?? []),
  ];

  for (const key of allKeys) {
    if (!/^-?\d+,-?\d+$/.test(key)) {
      return {
        valid: false,
        error: `Invalid cell key format: ${key}`,
      };
    }
  }

  return { valid: true };
}
```

### Rollback Strategy

```typescript
function safeBatchUpdate<T>(
  store: CampaignStoreState,
  layerId: string,
  operation: () => void,
): BatchResult {
  // Capture current state for rollback
  const snapshot = store.current;

  try {
    operation();
    return { success: true };
  } catch (error) {
    // Rollback to snapshot
    store.setActive(snapshot);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### Error Scenarios

1. **Invalid Layer ID**: Return early with error message
2. **Malformed Cell Keys**: Validate format before processing
3. **Memory Limit Exceeded**: Monitor heap usage and abort if threshold exceeded
4. **Timeout**: Use setTimeout to prevent infinite processing
5. **State Corruption**: Atomic rollback to previous valid state

---

## Testing Strategy

### Unit Tests

**File: `src/test/unit/stores/test_batch_mutations.test.ts`**

```typescript
describe("Batch Layer State Mutations", () => {
  it("applyLayerStateBatch updates cells efficiently", () => {
    // Test functional updates with Immer
  });

  it("applyCellsDelta handles set and delete operations", () => {
    // Test delta operations
  });

  it("batch operations trigger single store update", () => {
    // Mock store.set and verify call count
  });

  it("validates operation limits", () => {
    // Test batch size constraints
  });

  it("handles error rollback correctly", () => {
    // Test transaction semantics
  });
});
```

**Core Test Cases:**

- Single store update per batch
- Immer structural sharing efficiency
- Delta operation correctness
- Error validation and rollback
- Memory usage within limits
- Performance under 50ms for 1000 operations

### Integration Tests

**File: `src/test/integration/test_batch_rendering.test.ts`**

```typescript
describe("Batch Operations Integration", () => {
  it("triggers single render invalidation", () => {
    // Test canvas-viewport.tsx layersKey calculation
  });

  it("maintains invalidation key consistency", () => {
    // Test adapter.getInvalidationKey behavior
  });

  it("supports existing updateLayerState compatibility", () => {
    // Test backward compatibility
  });
});
```

### Performance Tests

**File: `src/test/performance/test_batch_performance.test.ts`**

```typescript
describe("Batch Performance", () => {
  it("processes 1000 cell updates under 50ms", () => {
    // Benchmark batch operations
  });

  it("memory usage scales linearly", () => {
    // Test memory efficiency
  });

  it("invalidation key generation is O(1)", () => {
    // Test render optimization
  });
});
```

### Test Plan Summary

- **Unit**: 95% coverage for batch operation logic
- **Integration**: Canvas rendering pipeline validation
- **Performance**: Sub-50ms execution benchmarks
- **E2E**: Flood fill tool integration (T-023 dependency)

---

## Design Decisions

### 1. Immer vs Manual Immutability

**Decision**: Use Immer for batch operations
**Rationale**:

- Already available in codebase (zustand/middleware/immer)
- Structural sharing optimizes memory usage
- Developer ergonomics for complex mutations
- Prevents accidental mutations

**Alternative Considered**: Manual object spreading
**Rejected Because**: Memory overhead and complexity for large batches

### 2. API Design: Functional vs Declarative

**Decision**: Provide both APIs
**Rationale**:

- `applyLayerStateBatch`: Flexible for complex logic (flood fill algorithms)
- `applyCellsDelta`: Optimized for simple bulk operations (import/export)
- Different usage patterns have different performance characteristics

### 3. Error Handling: Rollback vs Partial Application

**Decision**: Atomic transactions with rollback
**Rationale**:

- Maintains data consistency
- Prevents corrupt layer states
- Clear error boundaries for debugging

**Alternative Considered**: Partial application
**Rejected Because**: Creates inconsistent state during failures

### 4. Validation Strategy: Upfront vs Lazy

**Decision**: Upfront validation
**Rationale**:

- Fail fast prevents wasted computation
- Clear error messages for developers
- Batch size limits prevent DoS scenarios

---

## Implementation Approach

### Phase 1: Core Batch API (Week 1)

1. **Store Extension**
   - Add `applyLayerStateBatch` to `CampaignStoreState`
   - Implement `_batchUpdateLayerState` helper
   - Add Immer integration for structural sharing

2. **Validation Framework**
   - Implement operation limits and validation
   - Add error handling with rollback semantics
   - Performance monitoring infrastructure

3. **Unit Tests**
   - Core batch operation functionality
   - Error handling and edge cases
   - Performance benchmarking setup

### Phase 2: Delta API & Optimization (Week 2)

1. **Delta Operations**
   - Implement `applyCellsDelta` with set/delete operations
   - Optimize for large cell collections
   - Memory usage monitoring

2. **Integration Testing**
   - Canvas viewport integration
   - Invalidation key consistency
   - Backward compatibility validation

3. **Performance Tuning**
   - Profile memory allocation patterns
   - Optimize Immer usage for large batches
   - GC optimization strategies

### Phase 3: Production Readiness (Week 3)

1. **Error Handling Enhancement**
   - Comprehensive validation rules
   - User-friendly error messages
   - Recovery strategies

2. **Documentation & Examples**
   - API documentation with TypeScript examples
   - Plugin developer migration guide
   - Performance best practices

3. **E2E Testing**
   - Large batch operation scenarios
   - Tool integration (foundation for T-023)
   - Memory leak detection

### Migration Path

**Existing Code**: No changes required
**New Features**: Use batch APIs for >10 cell operations
**Tool Developers**: Migrate to batch APIs for performance-critical operations

---

## Risk Analysis & Mitigations

### Technical Risks

| Risk                              | Probability | Impact | Mitigation                                             |
| --------------------------------- | ----------- | ------ | ------------------------------------------------------ |
| Memory leaks in large batches     | Medium      | High   | Memory monitoring, GC optimization, batch size limits  |
| Immer performance bottlenecks     | Low         | Medium | Fallback to manual mutations, performance benchmarking |
| Invalidation key computation cost | Low         | Medium | Memoization, lightweight key generation                |
| State corruption during rollback  | Low         | High   | Immutable snapshots, comprehensive testing             |

### Integration Risks

| Risk                          | Probability | Impact | Mitigation                                |
| ----------------------------- | ----------- | ------ | ----------------------------------------- |
| Canvas viewport compatibility | Low         | High   | Integration tests, backward compatibility |
| Tool ecosystem disruption     | Medium      | Medium | Gradual migration, dual API support       |
| Plugin API changes            | Low         | Medium | Maintain existing `updateLayerState`      |

### Performance Risks

| Risk                         | Probability | Impact | Mitigation                                   |
| ---------------------------- | ----------- | ------ | -------------------------------------------- |
| UI blocking on large batches | Medium      | High   | Batch size limits, timeout protection        |
| Memory pressure              | Medium      | Medium | Memory monitoring, efficient data structures |
| GC pause during mutations    | Low         | Low    | Incremental updates, allocation optimization |

### Monitoring Strategy

1. **Performance Metrics**: Track batch execution time and memory usage
2. **Error Rates**: Monitor validation failures and rollback frequency
3. **Usage Patterns**: Analyze batch sizes and operation types
4. **Render Performance**: Track invalidation key computation time

---

## Success Criteria

### Performance Benchmarks

- ✅ **Batch Operations**: 1000 cell updates in <50ms
- ✅ **Memory Efficiency**: <10MB overhead regardless of batch size
- ✅ **Render Performance**: Single invalidation per batch
- ✅ **API Response**: Synchronous batch calls return in <5ms

### Developer Experience

- ✅ **API Simplicity**: Minimal code changes for batch operations
- ✅ **Type Safety**: Full TypeScript support with proper generics
- ✅ **Error Handling**: Clear validation messages and rollback
- ✅ **Backward Compatibility**: Existing code continues working

### User Experience

- ✅ **Responsiveness**: Large operations feel instantaneous
- ✅ **Visual Consistency**: No intermediate render states
- ✅ **Tool Integration**: Foundation ready for T-023 Flood Fill
- ✅ **Memory Stability**: No leaks during extended usage

This design provides a robust foundation for efficient bulk editing operations while maintaining the professional content creation experience that Map&Territory users expect.
