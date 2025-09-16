---
ticket: T-023
feature: freeform-flood-fill
author: lead-developer
date: 2025-09-16
level: 2
---

## Overview & Assumptions

- Implement BFS (Breadth-First Search) algorithm for predictable, outward-expanding fill behavior
- Leverage existing `AppAPI.hex.neighbors()` for hex connectivity detection
- Use T-020 batch API (`applyLayerStateBatch`) for atomic state updates to prevent partial fills
- Default hard cap of 1000 cells with configuration option to prevent runaway operations
- Two fill modes: "empty-only" (fills null/undefined cells) and "same-value" (replaces matching terrain)

## Interfaces & Contracts

- **Command Registration**: `tool.freeform.fill` in freeform plugin manifest
- **Toolbar Integration**: Button in "tools" group (alongside paint/erase) with order 3 and enablement conditions `["activeLayerIs:freeform", "gridVisible"]`
- **Tool Handler**: `FloodFillToolHandler` implementing standard tool interface with click handling
- **Batch API Usage**: `useCampaignStore().applyLayerStateBatch<FreeformState>(layerId, updateFn)`
- **AppAPI Integration**: `AppAPI.hex.neighbors(axial)` for connectivity traversal

## Data/State Changes

- **Freeform Layer State**: Bulk updates to `cellData` map with terrain values
- **Tool State**: Active tool tracking in campaign store (`activeTool: "tool.freeform.fill"`)
- **Configuration**: Add `floodFillMaxCells` setting (default: 1000) to user preferences
- **Performance Metrics**: Track fill operation time and cell count for monitoring

```typescript
interface FloodFillConfig {
  maxCells: number;
  mode: "empty-only" | "same-value";
  enableBounds: boolean;
}

interface FloodFillResult {
  cellsModified: number;
  operationTime: number;
  boundaryHit: boolean;
  capReached: boolean;
}
```

## Testing Strategy

- **Focused Unit Tests** (~5-8 tests):
  - BFS algorithm core behavior: basic fill, boundary stopping
  - Fill modes: empty-only vs same-value replacement
  - Key edge cases: single cell, max cap enforcement

- **Essential Integration Tests** (~3-5 tests):
  - Tool activation and batch API integration
  - UI interactions: tool selection and click handling
  - Performance validation with representative regions (100-500 cells)

- **Single E2E Test**:
  - Happy path: tool selection → click → fill → undo works
  - Validates complete user workflow without exhaustive edge case coverage

## Impact/Risks

- **Performance**: BFS with 1000 cells should complete in <100ms; monitor for UI blocking
- **Memory**: Batch operations may temporarily increase memory usage during large fills
- **UX**: Clear visual feedback needed when fill operations hit boundaries or caps
- **DX**: Tool follows existing plugin architecture patterns for maintainability
- **Dependencies**: Relies on stable hex neighbor algorithm and batch API performance
