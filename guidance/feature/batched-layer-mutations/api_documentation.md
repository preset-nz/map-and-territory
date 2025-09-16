# Batch Layer State Mutations API Documentation

## Overview

The Batch Layer State Mutations API provides efficient bulk operations for modifying layer state in Map&Territory. This API is designed to handle large-scale edits (500-1000+ cells) with optimal performance, serving as the foundation for advanced tools like flood fill, copy/paste, and bulk import operations.

## Core APIs

### `applyLayerStateBatch<T>()`

Applies a batch update to layer state using Immer draft patterns for efficient immutable updates.

```typescript
applyLayerStateBatch<T = Record<string, unknown>>(
  layerId: string,
  updater: (draft: T) => void | T,
  validator?: (state: unknown) => state is T,
): BatchResult<T>
```

#### Parameters

- **`layerId`**: Unique identifier of the target layer
- **`updater`**: Function that receives an Immer draft for mutation or returns new state
- **`validator`** (optional): Type guard function to validate layer state before operation

#### Returns

```typescript
interface BatchResult<T> {
  success: boolean;
  error?: string;
  result?: T;
  metrics?: BatchMetrics;
}
```

#### Basic Usage

```typescript
import { useCampaignStore, isValidLayerState } from "@/stores/campaign";

const store = useCampaignStore.getState();

// Simple batch update
const result = store.applyLayerStateBatch(layerId, (draft) => {
  draft.someProperty = "new value";
  draft.anotherProperty = { nested: "data" };
});

if (result.success) {
  console.log(
    "Batch update completed in",
    result.metrics?.executionTimeMs,
    "ms",
  );
} else {
  console.error("Batch update failed:", result.error);
}
```

#### Type-Safe Usage

```typescript
interface MyLayerState {
  cells: Record<string, MyCell>;
  settings: {
    visible: boolean;
    opacity: number;
  };
}

// Type guard for validation
function isMyLayerState(state: unknown): state is MyLayerState {
  return isValidLayerState(state) && "cells" in state && "settings" in state;
}

// Type-safe batch operation
const result = store.applyLayerStateBatch<MyLayerState>(
  layerId,
  (draft) => {
    // TypeScript provides full intellisense here
    draft.settings.opacity = 0.8;

    // Add multiple cells efficiently
    for (let i = 0; i < 100; i++) {
      draft.cells[`${i},0`] = { data: `cell_${i}` };
    }
  },
  isMyLayerState,
);
```

### `applyCellsDelta<TCell>()`

Applies explicit add/remove operations to cell collections with optional type validation.

```typescript
applyCellsDelta<TCell = FreeformCell>(
  layerId: string,
  delta: CellsDelta<TCell>,
  cellValidator?: (cell: unknown) => cell is TCell,
): BatchResult<void>
```

#### Parameters

- **`layerId`**: Unique identifier of the target layer
- **`delta`**: Delta object specifying cells to add/update and delete
- **`cellValidator`** (optional): Type guard function to validate cell data

#### Delta Format

```typescript
interface CellsDelta<TCell = FreeformCell> {
  set?: Record<string, TCell>; // Cells to add or update (key format: "q,r")
  delete?: string[]; // Cell keys to remove
}
```

#### Basic Usage

```typescript
import { useCampaignStore } from "@/stores/campaign";
import type { FreeformCell } from "@/layers/adapters/freeform-hex";

const store = useCampaignStore.getState();

// Add and remove cells in a single operation
const delta = {
  set: {
    "0,0": { terrainId: "grass" },
    "1,0": { terrainId: "water" },
    "0,1": { terrainId: "stone" },
  },
  delete: ["2,2", "3,3"], // Remove existing cells
};

const result = store.applyCellsDelta(layerId, delta);

if (result.success) {
  console.log(`Applied ${result.metrics?.operationCount} operations`);
} else {
  console.error("Delta operation failed:", result.error);
}
```

#### Bulk Import Example

```typescript
// Import large dataset efficiently
function importMapData(
  layerId: string,
  mapData: Array<{ x: number; y: number; terrain: string }>,
) {
  const delta = {
    set: {},
  };

  // Convert external format to internal format
  mapData.forEach(({ x, y, terrain }) => {
    const key = `${x},${y}`;
    delta.set[key] = { terrainId: terrain };
  });

  console.log(`Importing ${mapData.length} cells...`);

  const result = store.applyCellsDelta(layerId, delta);

  if (result.success) {
    console.log(`Import completed in ${result.metrics?.executionTimeMs}ms`);
    console.log(`Memory usage: ${result.metrics?.memoryUsageMB?.toFixed(2)}MB`);
  } else {
    throw new Error(`Import failed: ${result.error}`);
  }

  return result;
}
```

#### Bulk Export Example

```typescript
// Export layer data efficiently
function exportLayerData(
  layerId: string,
): Array<{ x: number; y: number; terrain: string }> {
  const store = useCampaignStore.getState();
  const map = store.current?.maps.find(
    (m) => m.id === store.current?.activeMapId,
  );
  const layer = map?.layers?.find((l) => l.id === layerId);

  if (!layer?.state?.cells) {
    return [];
  }

  return Object.entries(layer.state.cells).map(([key, cell]) => {
    const [x, y] = key.split(",").map(Number);
    return {
      x,
      y,
      terrain: cell.terrainId,
    };
  });
}
```

## Type Guards and Validation

### Layer State Validation

```typescript
import { isValidLayerState } from "@/stores/campaign";

// Generic layer state validation
if (isValidLayerState(someState)) {
  // someState is now typed as Record<string, unknown>
  console.log("Valid layer state");
}

// Custom type guard for specific layer types
function isFreeformLayerState(
  state: unknown,
): state is { cells: Record<string, FreeformCell> } {
  return (
    isValidLayerState(state) &&
    "cells" in state &&
    typeof state.cells === "object"
  );
}
```

### Cell Data Validation

```typescript
import { isValidFreeformCell } from "@/stores/campaign";

// Validate freeform cells
if (isValidFreeformCell(cellData)) {
  // cellData is now typed as FreeformCell
  console.log("Valid freeform cell:", cellData.terrainId);
}

// Custom cell validator
function isMyCustomCell(cell: unknown): cell is MyCustomCell {
  return cell !== null && typeof cell === "object" && "customProperty" in cell;
}

// Use with applyCellsDelta
const result = store.applyCellsDelta(layerId, delta, isMyCustomCell);
```

### Delta Validation

```typescript
import { isValidCellsDelta } from "@/stores/campaign";

// Validate delta structure
if (isValidCellsDelta(deltaData)) {
  // deltaData is now properly typed
  console.log(
    "Valid delta with",
    Object.keys(deltaData.set || {}).length,
    "cells to set",
  );
}

// Validate with custom cell type
if (isValidCellsDelta(deltaData, isMyCustomCell)) {
  // deltaData is typed as CellsDelta<MyCustomCell>
  console.log("Valid delta with custom cells");
}
```

## Performance Monitoring

### BatchMetrics Interface

```typescript
interface BatchMetrics {
  executionTimeMs: number; // Operation execution time
  memoryUsageMB?: number; // Memory delta (when available)
  operationCount: number; // Number of operations in batch
  immerPatches?: number; // Immer patches for structural sharing analysis
}
```

### Using withBatchMetrics

```typescript
import { withBatchMetrics } from "@/stores/campaign";

// Wrap operations for detailed performance monitoring
const result = withBatchMetrics(
  () => store.applyCellsDelta(layerId, largeDelta),
  "Large Delta Operation",
);

// Metrics are automatically logged in debug mode
console.log("Operation metrics:", result.metrics);
```

### Performance Benchmarking

```typescript
// Benchmark batch operations
function benchmarkBatchOperation(
  operationName: string,
  operation: () => BatchResult<any>,
) {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const result = operation();

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

  console.log(`${operationName} Benchmark:`, {
    success: result.success,
    executionTime: endTime - startTime,
    memoryDelta: (endMemory - startMemory) / (1024 * 1024),
    operationMetrics: result.metrics,
  });

  return result;
}

// Usage
benchmarkBatchOperation("Flood Fill 1000 cells", () =>
  store.applyCellsDelta(layerId, floodFillDelta),
);
```

## Error Handling

### Error Types and Recovery

```typescript
// Handle different error scenarios
const result = store.applyCellsDelta(layerId, delta);

if (!result.success) {
  switch (result.error) {
    case "OPERATION_LIMIT_EXCEEDED":
      console.log("Batch too large, split into smaller operations");
      break;

    case "MEMORY_LIMIT_EXCEEDED":
      console.log("Insufficient memory, try smaller batch size");
      break;

    case "TIMEOUT":
      console.log("Operation timed out, optimize delta structure");
      break;

    case "INVALID_CELL_KEY_FORMAT":
      console.log('Fix cell key format to "q,r"');
      break;

    default:
      console.error("Batch operation failed:", result.error);
  }
}
```

### Graceful Degradation

```typescript
// Fallback to individual operations if batch fails
function robustCellUpdate(layerId: string, delta: CellsDelta) {
  // Try batch operation first
  let result = store.applyCellsDelta(layerId, delta);

  if (result.success) {
    return result;
  }

  console.warn("Batch operation failed, falling back to individual updates");

  // Fallback: apply operations individually
  if (delta.set) {
    for (const [key, cell] of Object.entries(delta.set)) {
      store.updateLayerState(layerId, { [`cells.${key}`]: cell });
    }
  }

  if (delta.delete) {
    for (const key of delta.delete) {
      store.updateLayerState(layerId, { [`cells.${key}`]: undefined });
    }
  }

  return { success: true, error: "Used fallback individual operations" };
}
```

## Advanced Usage Patterns

### Flood Fill Implementation

```typescript
// Foundation for T-023 Flood Fill Tool
function floodFill(
  layerId: string,
  startKey: string,
  targetTerrain: string,
  replaceTerrain?: string,
): BatchResult<void> {
  const store = useCampaignStore.getState();
  const layer = getCurrentLayer(layerId);

  if (!layer?.state?.cells) {
    return { success: false, error: "Layer has no cells" };
  }

  // Flood fill algorithm
  const toFill = new Set<string>();
  const visited = new Set<string>();
  const queue = [startKey];

  const startCell = layer.state.cells[startKey];
  const originalTerrain = startCell?.terrainId;

  // If replacing specific terrain, check match
  if (replaceTerrain && originalTerrain !== replaceTerrain) {
    return {
      success: false,
      error: "Start cell does not match replace terrain",
    };
  }

  // BFS flood fill
  while (queue.length > 0) {
    const currentKey = queue.shift()!;

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const currentCell = layer.state.cells[currentKey];
    if (!currentCell || currentCell.terrainId !== originalTerrain) continue;

    toFill.add(currentKey);

    // Add neighbors to queue
    const [q, r] = currentKey.split(",").map(Number);
    const neighbors = [
      `${q + 1},${r}`,
      `${q - 1},${r}`,
      `${q},${r + 1}`,
      `${q},${r - 1}`,
      `${q + 1},${r - 1}`,
      `${q - 1},${r + 1}`,
    ];

    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }

  // Apply flood fill as batch operation
  const delta: CellsDelta = {
    set: {},
  };

  toFill.forEach((key) => {
    delta.set![key] = { terrainId: targetTerrain };
  });

  console.log(`Flood filling ${toFill.size} cells`);
  return store.applyCellsDelta(layerId, delta);
}
```

### Copy/Paste Operations

```typescript
// Copy cells from source area
function copyCells(
  layerId: string,
  area: { minQ: number; maxQ: number; minR: number; maxR: number },
) {
  const store = useCampaignStore.getState();
  const layer = getCurrentLayer(layerId);

  const copiedCells: Record<string, FreeformCell> = {};

  for (let q = area.minQ; q <= area.maxQ; q++) {
    for (let r = area.minR; r <= area.maxR; r++) {
      const key = `${q},${r}`;
      const cell = layer?.state?.cells?.[key];
      if (cell) {
        copiedCells[key] = { ...cell };
      }
    }
  }

  return copiedCells;
}

// Paste cells to target area
function pasteCells(
  layerId: string,
  copiedCells: Record<string, FreeformCell>,
  offset: { q: number; r: number },
): BatchResult<void> {
  const delta: CellsDelta = {
    set: {},
  };

  // Apply offset to each cell
  Object.entries(copiedCells).forEach(([sourceKey, cell]) => {
    const [sourceQ, sourceR] = sourceKey.split(",").map(Number);
    const targetKey = `${sourceQ + offset.q},${sourceR + offset.r}`;
    delta.set![targetKey] = { ...cell };
  });

  console.log(`Pasting ${Object.keys(copiedCells).length} cells`);
  return useCampaignStore.getState().applyCellsDelta(layerId, delta);
}
```

### Progressive Rendering for Large Operations

```typescript
// Handle very large operations with progressive updates
async function progressiveBatchUpdate(
  layerId: string,
  largeDelta: CellsDelta,
  chunkSize: number = 1000,
  onProgress?: (progress: number) => void,
): Promise<BatchResult<void>> {
  const totalOps =
    Object.keys(largeDelta.set || {}).length + (largeDelta.delete?.length || 0);

  if (totalOps <= chunkSize) {
    // Small enough for single batch
    return useCampaignStore.getState().applyCellsDelta(layerId, largeDelta);
  }

  // Split into chunks
  const chunks: CellsDelta[] = [];
  let currentChunk: CellsDelta = { set: {}, delete: [] };
  let currentSize = 0;

  // Process set operations
  if (largeDelta.set) {
    for (const [key, cell] of Object.entries(largeDelta.set)) {
      if (currentSize >= chunkSize) {
        chunks.push(currentChunk);
        currentChunk = { set: {}, delete: [] };
        currentSize = 0;
      }
      currentChunk.set![key] = cell;
      currentSize++;
    }
  }

  // Process delete operations
  if (largeDelta.delete) {
    for (const key of largeDelta.delete) {
      if (currentSize >= chunkSize) {
        chunks.push(currentChunk);
        currentChunk = { set: {}, delete: [] };
        currentSize = 0;
      }
      currentChunk.delete!.push(key);
      currentSize++;
    }
  }

  if (currentSize > 0) {
    chunks.push(currentChunk);
  }

  // Apply chunks progressively
  const store = useCampaignStore.getState();
  let totalMetrics: BatchMetrics = {
    executionTimeMs: 0,
    operationCount: 0,
    memoryUsageMB: 0,
  };

  for (let i = 0; i < chunks.length; i++) {
    const result = store.applyCellsDelta(layerId, chunks[i]);

    if (!result.success) {
      return result; // Failed chunk
    }

    // Accumulate metrics
    if (result.metrics) {
      totalMetrics.executionTimeMs += result.metrics.executionTimeMs;
      totalMetrics.operationCount += result.metrics.operationCount;
      totalMetrics.memoryUsageMB = Math.max(
        totalMetrics.memoryUsageMB || 0,
        result.metrics.memoryUsageMB || 0,
      );
    }

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / chunks.length);
    }

    // Allow UI updates between chunks
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { success: true, metrics: totalMetrics };
}
```

## Performance Guidelines

### Optimal Batch Sizes

- **Small batches (1-100 cells)**: Use regular `updateLayerState` for simplicity
- **Medium batches (100-1000 cells)**: Perfect for batch APIs, expect <50ms execution
- **Large batches (1000-5000 cells)**: Use batch APIs, expect <100ms execution
- **Very large batches (5000+ cells)**: Consider progressive rendering

### Memory Optimization

```typescript
// Memory-efficient pattern for large operations
function memoryEfficientBatch(
  layerId: string,
  cellGenerator: () => Iterator<[string, FreeformCell]>,
) {
  const CHUNK_SIZE = 1000;
  const MAX_MEMORY_MB = 50;

  let currentChunk: CellsDelta = { set: {} };
  let chunkSize = 0;

  for (const [key, cell] of cellGenerator()) {
    currentChunk.set![key] = cell;
    chunkSize++;

    if (chunkSize >= CHUNK_SIZE) {
      // Apply chunk
      const result = useCampaignStore
        .getState()
        .applyCellsDelta(layerId, currentChunk);

      if (!result.success) {
        throw new Error(`Batch failed: ${result.error}`);
      }

      // Check memory usage
      if (
        result.metrics?.memoryUsageMB &&
        result.metrics.memoryUsageMB > MAX_MEMORY_MB
      ) {
        console.warn(`High memory usage: ${result.metrics.memoryUsageMB}MB`);
      }

      // Reset for next chunk
      currentChunk = { set: {} };
      chunkSize = 0;

      // Allow GC
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Apply final chunk if needed
  if (chunkSize > 0) {
    return useCampaignStore.getState().applyCellsDelta(layerId, currentChunk);
  }

  return { success: true };
}
```

## Migration Guide

See [migration_guide.md](./migration_guide.md) for detailed instructions on migrating existing code to use the batch APIs.

## Related Documentation

- [Product Requirements](./product_requirements.md) - Feature requirements and success criteria
- [Solutions Design](./solutions_design.md) - Technical architecture and design decisions
- [Migration Guide](./migration_guide.md) - Step-by-step migration instructions
- [Testing Standards](../../process/testing_standards.md) - Testing patterns and requirements
