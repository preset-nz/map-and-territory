# Migration Guide: Batch Layer State Mutations

This guide provides step-by-step instructions for migrating existing code to use the new Batch Layer State Mutations API, introduced in T-020. The new APIs provide significant performance improvements for bulk operations while maintaining full backward compatibility.

## Overview of Changes

### New APIs Added

- `applyLayerStateBatch<T>()` - Generic batch state updates using Immer draft patterns
- `applyCellsDelta<TCell>()` - Explicit add/remove operations for cell collections
- Type guards: `isValidLayerState()`, `isValidFreeformCell()`, `isValidCellsDelta()`
- Performance monitoring: `withBatchMetrics()`, enhanced `BatchMetrics`

### Backward Compatibility

- ✅ All existing APIs continue to work unchanged
- ✅ No breaking changes to existing plugin interfaces
- ✅ Performance of single operations unchanged

## Migration Scenarios

### Scenario 1: Individual Cell Updates → Batch Operations

**Before:** Multiple individual cell updates

```typescript
// Old approach - inefficient for bulk operations
function paintLargeArea(
  layerId: string,
  cells: Array<{ key: string; terrain: string }>,
) {
  const store = useCampaignStore.getState();

  cells.forEach(({ key, terrain }) => {
    store.updateLayerState(layerId, {
      [`cells.${key}`]: { terrainId: terrain },
    });
  });
}

// Problems with old approach:
// - N store updates (N render invalidations)
// - Poor performance for large N
// - Visible intermediate states
```

**After:** Single batch operation

```typescript
// New approach - optimized for bulk operations
function paintLargeArea(
  layerId: string,
  cells: Array<{ key: string; terrain: string }>,
) {
  const store = useCampaignStore.getState();

  const delta = {
    set: {},
  };

  cells.forEach(({ key, terrain }) => {
    delta.set[key] = { terrainId: terrain };
  });

  const result = store.applyCellsDelta(layerId, delta);

  if (!result.success) {
    console.error("Batch operation failed:", result.error);
    // Optional: fallback to individual updates
    return fallbackToIndividualUpdates(layerId, cells);
  }

  console.log(
    `Painted ${cells.length} cells in ${result.metrics?.executionTimeMs}ms`,
  );
  return result;
}

// Benefits of new approach:
// - Single store update (single render invalidation)
// - <50ms execution for 1000 cells
// - Atomic operation (all or nothing)
// - Built-in performance metrics
```

### Scenario 2: Complex State Mutations → Type-Safe Batch Updates

**Before:** Direct state manipulation

```typescript
// Old approach - prone to errors and poor performance
function updateLayerSettings(layerId: string, newSettings: any) {
  const store = useCampaignStore.getState();

  // Multiple individual updates
  store.updateLayerState(layerId, { "settings.opacity": newSettings.opacity });
  store.updateLayerState(layerId, { "settings.visible": newSettings.visible });

  // Complex nested updates
  if (newSettings.filters) {
    Object.entries(newSettings.filters).forEach(([key, value]) => {
      store.updateLayerState(layerId, { [`settings.filters.${key}`]: value });
    });
  }
}
```

**After:** Type-safe batch updates

```typescript
// Define your layer state type
interface MyLayerState {
  settings: {
    opacity: number;
    visible: boolean;
    filters: Record<string, any>;
  };
  cells: Record<string, FreeformCell>;
}

// Type guard for validation
function isMyLayerState(state: unknown): state is MyLayerState {
  return isValidLayerState(state) && "settings" in state && "cells" in state;
}

// New approach - type-safe and efficient
function updateLayerSettings(
  layerId: string,
  newSettings: Partial<MyLayerState["settings"]>,
) {
  const store = useCampaignStore.getState();

  const result = store.applyLayerStateBatch<MyLayerState>(
    layerId,
    (draft) => {
      // TypeScript provides full intellisense and type checking
      if (newSettings.opacity !== undefined) {
        draft.settings.opacity = newSettings.opacity;
      }

      if (newSettings.visible !== undefined) {
        draft.settings.visible = newSettings.visible;
      }

      if (newSettings.filters) {
        Object.assign(draft.settings.filters, newSettings.filters);
      }
    },
    isMyLayerState, // Optional type validation
  );

  if (!result.success) {
    console.error("Settings update failed:", result.error);
    return false;
  }

  return true;
}
```

### Scenario 3: Plugin State Management → Tool Context Pattern

**Before:** Direct store access from plugins

```typescript
// Old plugin approach - violates seam boundaries
import { useCampaignStore } from '@/stores/campaign';

export function MyPlugin() {
  const handleCellUpdate = (cellKey: string, terrain: string) => {
    // Direct store access - not recommended
    const store = useCampaignStore.getState();
    store.updateLayerState(currentLayerId, {
      [`cells.${cellKey}`]: { terrainId: terrain }
    });
  };

  return <PluginUI onCellUpdate={handleCellUpdate} />;
}
```

**After:** ToolContext seam pattern

```typescript
// New plugin approach - uses ToolContext seam
import { ToolContext } from '@/plugin/types';

interface MyPluginProps {
  toolContext: ToolContext;
}

export function MyPlugin({ toolContext }: MyPluginProps) {
  const handleCellUpdate = (cellKey: string, terrain: string) => {
    // Use ToolContext helper for proper seam boundaries
    toolContext.applyCellsDelta({
      set: {
        [cellKey]: { terrainId: terrain }
      }
    });
  };

  const handleBulkUpdate = (cells: Array<{ key: string, terrain: string }>) => {
    // Efficient bulk operations through ToolContext
    const delta = {
      set: {}
    };

    cells.forEach(({ key, terrain }) => {
      delta.set[key] = { terrainId: terrain };
    });

    toolContext.applyCellsDelta(delta);
  };

  return <PluginUI onCellUpdate={handleCellUpdate} onBulkUpdate={handleBulkUpdate} />;
}
```

### Scenario 4: Import/Export Operations → Delta-Based APIs

**Before:** Manual cell-by-cell processing

```typescript
// Old import approach - inefficient
async function importMapData(layerId: string, csvData: string) {
  const store = useCampaignStore.getState();
  const rows = csvData.split("\n");

  for (const row of rows) {
    const [x, y, terrain] = row.split(",");
    const key = `${x},${y}`;

    // Individual updates - very slow for large files
    store.updateLayerState(layerId, {
      [`cells.${key}`]: { terrainId: terrain.trim() },
    });

    // Artificial delay to prevent UI blocking
    if (Math.random() < 0.01) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
```

**After:** Efficient batch import

```typescript
// New import approach - fast and efficient
async function importMapData(layerId: string, csvData: string) {
  const store = useCampaignStore.getState();
  const rows = csvData.split("\n").filter((row) => row.trim());

  const delta = {
    set: {},
  };

  // Parse all data into batch operation
  rows.forEach((row) => {
    const [x, y, terrain] = row.split(",");
    const key = `${x},${y}`;
    delta.set[key] = { terrainId: terrain.trim() };
  });

  console.log(`Importing ${rows.length} cells...`);

  const result = store.applyCellsDelta(layerId, delta);

  if (result.success) {
    console.log(`Import completed in ${result.metrics?.executionTimeMs}ms`);
    console.log(`Memory usage: ${result.metrics?.memoryUsageMB?.toFixed(2)}MB`);
    return { success: true, cellCount: rows.length };
  } else {
    console.error("Import failed:", result.error);
    return { success: false, error: result.error };
  }
}

// For very large imports, use progressive processing
async function importLargeMapData(
  layerId: string,
  csvData: string,
  chunkSize: number = 1000,
) {
  const store = useCampaignStore.getState();
  const rows = csvData.split("\n").filter((row) => row.trim());

  let processed = 0;
  const totalRows = rows.length;

  for (let i = 0; i < totalRows; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const delta = {
      set: {},
    };

    chunk.forEach((row) => {
      const [x, y, terrain] = row.split(",");
      const key = `${x},${y}`;
      delta.set[key] = { terrainId: terrain.trim() };
    });

    const result = store.applyCellsDelta(layerId, delta);

    if (!result.success) {
      throw new Error(
        `Import failed at chunk ${i}-${i + chunk.length}: ${result.error}`,
      );
    }

    processed += chunk.length;
    console.log(
      `Progress: ${processed}/${totalRows} (${((processed / totalRows) * 100).toFixed(1)}%)`,
    );

    // Allow UI updates between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { success: true, cellCount: processed };
}
```

## Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

Migrate performance-critical operations first, keep existing code for smaller operations.

```typescript
// Hybrid approach - choose API based on operation size
function updateCells(
  layerId: string,
  cellUpdates: Array<{ key: string; terrain: string }>,
) {
  const store = useCampaignStore.getState();

  if (cellUpdates.length === 1) {
    // Single update - use existing API
    const { key, terrain } = cellUpdates[0];
    store.updateLayerState(layerId, {
      [`cells.${key}`]: { terrainId: terrain },
    });
    return { success: true };
  }

  if (cellUpdates.length > 100) {
    // Large update - use batch API
    const delta = {
      set: {},
    };

    cellUpdates.forEach(({ key, terrain }) => {
      delta.set[key] = { terrainId: terrain };
    });

    return store.applyCellsDelta(layerId, delta);
  }

  // Medium update - batch for consistency
  const delta = {
    set: {},
  };

  cellUpdates.forEach(({ key, terrain }) => {
    delta.set[key] = { terrainId: terrain };
  });

  return store.applyCellsDelta(layerId, delta);
}
```

### Strategy 2: Wrapper Functions

Create wrapper functions that provide both old and new interfaces.

```typescript
// Backward-compatible wrapper
function updateLayerCells(
  layerId: string,
  updates:
    | Array<{ key: string; terrain: string }>
    | { key: string; terrain: string },
) {
  const store = useCampaignStore.getState();

  // Normalize input
  const cellUpdates = Array.isArray(updates) ? updates : [updates];

  if (cellUpdates.length <= 10) {
    // Small operations - use existing API for consistency
    cellUpdates.forEach(({ key, terrain }) => {
      store.updateLayerState(layerId, {
        [`cells.${key}`]: { terrainId: terrain },
      });
    });
    return { success: true };
  }

  // Large operations - use batch API
  const delta = {
    set: {},
  };

  cellUpdates.forEach(({ key, terrain }) => {
    delta.set[key] = { terrainId: terrain };
  });

  return store.applyCellsDelta(layerId, delta);
}

// Usage works with both single and multiple updates
updateLayerCells(layerId, { key: "0,0", terrain: "grass" }); // Single
updateLayerCells(layerId, [
  { key: "0,0", terrain: "grass" },
  { key: "1,0", terrain: "water" },
]); // Multiple
```

### Strategy 3: Plugin Migration

Update plugins to use ToolContext seam pattern for better performance and proper boundaries.

```typescript
// Before: Direct store access
function OldPlugin() {
  const floodFill = (startKey: string, terrain: string) => {
    const store = useCampaignStore.getState();
    // Complex flood fill logic with many individual updates
    // ... many store.updateLayerState() calls
  };

  return <FloodFillTool onFloodFill={floodFill} />;
}

// After: ToolContext seam
function NewPlugin({ toolContext }: { toolContext: ToolContext }) {
  const floodFill = (startKey: string, terrain: string) => {
    // Flood fill algorithm generates delta
    const delta = generateFloodFillDelta(startKey, terrain);

    // Single efficient operation through seam
    toolContext.applyCellsDelta(delta);
  };

  return <FloodFillTool onFloodFill={floodFill} />;
}

function generateFloodFillDelta(startKey: string, terrain: string): CellsDelta {
  // Implement flood fill algorithm
  const toFill = runFloodFillAlgorithm(startKey, terrain);

  const delta = {
    set: {}
  };

  toFill.forEach(key => {
    delta.set[key] = { terrainId: terrain };
  });

  return delta;
}
```

## Testing Migration

### Unit Test Updates

```typescript
// Update tests to verify batch behavior
describe("Layer Updates Migration", () => {
  it("should handle both single and batch operations", () => {
    const store = useCampaignStore.getState();
    store.createEmpty();
    store.addMap();
    const layerId = store.addLayer("freeform-hex");

    // Test single operation (existing behavior)
    store.updateLayerState(layerId, {
      "cells.0,0": { terrainId: "grass" },
    });

    let state = getCurrentLayerState(layerId);
    expect(state.cells["0,0"].terrainId).toBe("grass");

    // Test batch operation (new behavior)
    const result = store.applyCellsDelta(layerId, {
      set: {
        "1,0": { terrainId: "water" },
        "0,1": { terrainId: "stone" },
      },
    });

    expect(result.success).toBe(true);
    expect(result.metrics?.operationCount).toBe(2);

    state = getCurrentLayerState(layerId);
    expect(state.cells["1,0"].terrainId).toBe("water");
    expect(state.cells["0,1"].terrainId).toBe("stone");
  });

  it("should maintain performance characteristics", () => {
    const store = useCampaignStore.getState();
    const layerId = setupTestLayer();

    // Test performance of batch operations
    const largeDelta = generateLargeDelta(1000);

    const startTime = performance.now();
    const result = store.applyCellsDelta(layerId, largeDelta);
    const endTime = performance.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(50); // <50ms target
    expect(result.metrics?.memoryUsageMB).toBeLessThan(10); // <10MB target
  });
});
```

### Performance Regression Tests

```typescript
// Add performance benchmarks to prevent regressions
describe("Performance Regression Prevention", () => {
  it("should maintain single operation performance", () => {
    const store = useCampaignStore.getState();
    const layerId = setupTestLayer();

    // Benchmark single operations
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      store.updateLayerState(layerId, {
        [`cells.${i},0`]: { terrainId: "grass" },
      });
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    expect(avgTime).toBeLessThan(5); // Should maintain <5ms per single operation
  });

  it("should demonstrate batch performance improvement", () => {
    const store = useCampaignStore.getState();
    const layerId = setupTestLayer();

    const cellCount = 1000;

    // Benchmark individual operations
    const startIndividual = performance.now();
    for (let i = 0; i < cellCount; i++) {
      store.updateLayerState(layerId, {
        [`cells.individual_${i},0`]: { terrainId: "grass" },
      });
    }
    const endIndividual = performance.now();
    const individualTime = endIndividual - startIndividual;

    // Reset layer
    store.updateLayerState(layerId, { cells: {} });

    // Benchmark batch operation
    const delta = {
      set: {},
    };
    for (let i = 0; i < cellCount; i++) {
      delta.set[`batch_${i},0`] = { terrainId: "grass" };
    }

    const startBatch = performance.now();
    const result = store.applyCellsDelta(layerId, delta);
    const endBatch = performance.now();
    const batchTime = endBatch - startBatch;

    expect(result.success).toBe(true);
    expect(batchTime).toBeLessThan(50); // Batch should be <50ms
    expect(batchTime).toBeLessThan(individualTime / 10); // Batch should be >10x faster
  });
});
```

## Common Migration Pitfalls

### Pitfall 1: Forgetting Error Handling

```typescript
// ❌ Bad: Ignoring batch operation results
function badMigration(layerId: string, delta: CellsDelta) {
  const store = useCampaignStore.getState();
  store.applyCellsDelta(layerId, delta); // No error checking!
}

// ✅ Good: Proper error handling
function goodMigration(layerId: string, delta: CellsDelta) {
  const store = useCampaignStore.getState();
  const result = store.applyCellsDelta(layerId, delta);

  if (!result.success) {
    console.error("Batch operation failed:", result.error);
    // Implement fallback strategy
    return fallbackToIndividualUpdates(layerId, delta);
  }

  return result;
}
```

### Pitfall 2: Over-Batching Small Operations

```typescript
// ❌ Bad: Using batch API for single operations
function inefficientSingleUpdate(
  layerId: string,
  key: string,
  terrain: string,
) {
  const store = useCampaignStore.getState();

  // Overkill for single operation
  const result = store.applyCellsDelta(layerId, {
    set: { [key]: { terrainId: terrain } },
  });
}

// ✅ Good: Use appropriate API for operation size
function efficientUpdate(layerId: string, key: string, terrain: string) {
  const store = useCampaignStore.getState();

  // Simple operation - use simple API
  store.updateLayerState(layerId, {
    [`cells.${key}`]: { terrainId: terrain },
  });
}
```

### Pitfall 3: Incorrect Key Formats

```typescript
// ❌ Bad: Wrong key format
function badKeyFormat(layerId: string) {
  const store = useCampaignStore.getState();

  const result = store.applyCellsDelta(layerId, {
    set: {
      "0:0": { terrainId: "grass" }, // Wrong format!
      x0y0: { terrainId: "water" }, // Wrong format!
    },
  });
  // Will fail validation
}

// ✅ Good: Correct key format
function goodKeyFormat(layerId: string) {
  const store = useCampaignStore.getState();

  const result = store.applyCellsDelta(layerId, {
    set: {
      "0,0": { terrainId: "grass" }, // Correct!
      "-1,1": { terrainId: "water" }, // Correct!
    },
  });
}
```

## Performance Monitoring During Migration

```typescript
// Track migration performance
function migrationPerformanceMonitor(operation: string, fn: () => any) {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const result = fn();

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const metrics = {
    operation,
    executionTime: endTime - startTime,
    memoryDelta: (endMemory - startMemory) / (1024 * 1024),
    success: result?.success !== false,
  };

  console.log("Migration Performance:", metrics);

  // Log slow operations for investigation
  if (metrics.executionTime > 100) {
    console.warn(
      `Slow operation detected: ${operation} took ${metrics.executionTime}ms`,
    );
  }

  return result;
}

// Usage during migration
const result = migrationPerformanceMonitor("Import 1000 cells", () =>
  store.applyCellsDelta(layerId, largeDelta),
);
```

## Rollback Strategy

If issues arise during migration, here's how to rollback safely:

```typescript
// Feature flag for batch operations
const USE_BATCH_OPERATIONS =
  process.env.NODE_ENV !== "production" ||
  localStorage.getItem("enable-batch-ops") === "true";

function adaptiveUpdateCells(
  layerId: string,
  updates: Array<{ key: string; terrain: string }>,
) {
  const store = useCampaignStore.getState();

  if (!USE_BATCH_OPERATIONS || updates.length < 10) {
    // Fallback to individual operations
    updates.forEach(({ key, terrain }) => {
      store.updateLayerState(layerId, {
        [`cells.${key}`]: { terrainId: terrain },
      });
    });
    return { success: true };
  }

  try {
    // Try batch operation
    const delta = {
      set: {},
    };

    updates.forEach(({ key, terrain }) => {
      delta.set[key] = { terrainId: terrain };
    });

    const result = store.applyCellsDelta(layerId, delta);

    if (result.success) {
      return result;
    }

    // Fallback on failure
    console.warn("Batch operation failed, falling back to individual updates");
    updates.forEach(({ key, terrain }) => {
      store.updateLayerState(layerId, {
        [`cells.${key}`]: { terrainId: terrain },
      });
    });

    return { success: true, fallback: true };
  } catch (error) {
    console.error("Batch operation error, using fallback:", error);

    // Safe fallback
    updates.forEach(({ key, terrain }) => {
      store.updateLayerState(layerId, {
        [`cells.${key}`]: { terrainId: terrain },
      });
    });

    return { success: true, fallback: true };
  }
}
```

## Next Steps

1. **Identify Performance Bottlenecks**: Profile your current code to find operations that would benefit from batching
2. **Start with High-Impact Areas**: Migrate flood fill, import/export, and copy/paste operations first
3. **Add Performance Monitoring**: Use `withBatchMetrics()` to track improvements
4. **Update Tests**: Ensure your test suite covers both old and new APIs
5. **Monitor Production**: Watch for performance improvements and any unexpected issues

## Support and Resources

- **API Documentation**: See [api_documentation.md](./api_documentation.md) for detailed API reference
- **Performance Guidelines**: Optimal batch sizes and memory management patterns
- **Type Safety**: Full TypeScript support with enhanced intellisense
- **Testing**: Comprehensive test suite examples and patterns

The batch layer state mutations API provides a powerful foundation for building responsive, efficient tools in Map&Territory. Take advantage of the performance improvements while maintaining the reliability and developer experience you expect.
