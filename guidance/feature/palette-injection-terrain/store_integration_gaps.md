---
ticket: T-006
feature: Palette Injection for Terrain
author: code-reviewer-typescript@countasone
date: 2025-09-05
status: IMPLEMENTATION GUIDANCE
---

# Store Integration Gaps and Implementation Guide

## Overview

The palette injection feature implementation is **functionally complete for read-only scenarios** but lacks the store integration necessary for **runtime palette updates**. This document provides specific guidance on implementing the missing store methods and interface updates.

## Critical Gap Analysis

### 1. **Store Interface Missing Palette Fields**

**Impact**: TypeScript compilation errors, no type safety for palette operations
**Location**: `src/stores/project.ts`, `src/types/`

**Required Changes:**

```typescript
// src/types/project.ts (or inline in store)
import type { MapPalette } from "@/palettes/types";

interface Project {
  // ... existing fields
  palette?: MapPalette; // Campaign-level palette
}

interface Map {
  // ... existing fields
  palette?: MapPalette; // Map-level palette override
}
```

### 2. **Store Methods Missing for Runtime Updates**

**Impact**: No way to update palettes at runtime, changes don't trigger re-renders
**Location**: `src/stores/project.ts`

**Required Methods:**

```typescript
interface ProjectStore {
  // Campaign palette methods
  setCampaignPalette: (palette: MapPalette | null) => void;
  clearCampaignPalette: () => void;

  // Map palette methods
  setMapPalette: (mapId: string, palette: MapPalette | null) => void;
  clearMapPalette: (mapId: string) => void;

  // Bulk update methods
  updatePalettes: (updates: {
    campaignPalette?: MapPalette | null;
    mapPalettes?: Record<string, MapPalette | null>;
  }) => void;
}
```

### 3. **No Invalidation/Re-rendering on Palette Changes**

**Impact**: Palette updates don't trigger visual updates without manual refresh
**Location**: Component subscriptions and render triggers

## Detailed Implementation Guide

### Phase 1: Interface and Type Updates

#### Step 1.1: Update Project/Map Interfaces

```typescript
// File: src/stores/project.ts
import type { MapPalette } from "@/palettes/types";

export interface Project {
  id: string;
  name: string;
  created: number;
  updated: number;
  activeMapId: string | null;
  maps: Map[];
  palette?: MapPalette; // ADD: Campaign-level palette
}

export interface Map {
  id: string;
  name: string;
  created: number;
  updated: number;
  size: { w: number; h: number };
  layers: LayerState[];
  palette?: MapPalette; // ADD: Map-level palette override
}
```

#### Step 1.2: Update Store Methods

```typescript
// File: src/stores/project.ts
import { create } from "zustand";
import type { MapPalette } from "@/palettes/types";

interface ProjectStore {
  // ... existing properties

  // Campaign palette management
  setCampaignPalette: (palette: MapPalette | null) => void;
  clearCampaignPalette: () => void;

  // Map palette management
  setMapPalette: (mapId: string, palette: MapPalette | null) => void;
  clearMapPalette: (mapId: string) => void;

  // Utility methods
  getEffectivePalette: (mapId?: string) => MapPalette | null;
  updatePalettes: (updates: {
    campaignPalette?: MapPalette | null;
    mapPalettes?: Record<string, MapPalette | null>;
  }) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // ... existing implementation

  // Campaign palette methods
  setCampaignPalette: (palette: MapPalette | null) => {
    set((state) => {
      if (!state.current) return state;
      return {
        current: {
          ...state.current,
          palette: palette ?? undefined,
          updated: Date.now(),
        },
      };
    });
  },

  clearCampaignPalette: () => {
    get().setCampaignPalette(null);
  },

  // Map palette methods
  setMapPalette: (mapId: string, palette: MapPalette | null) => {
    set((state) => {
      if (!state.current) return state;

      const mapIndex = state.current.maps.findIndex((m) => m.id === mapId);
      if (mapIndex === -1) return state;

      const updatedMaps = [...state.current.maps];
      updatedMaps[mapIndex] = {
        ...updatedMaps[mapIndex],
        palette: palette ?? undefined,
        updated: Date.now(),
      };

      return {
        current: {
          ...state.current,
          maps: updatedMaps,
          updated: Date.now(),
        },
      };
    });
  },

  clearMapPalette: (mapId: string) => {
    get().setMapPalette(mapId, null);
  },

  // Utility methods
  getEffectivePalette: (mapId?: string) => {
    const state = get();
    if (!state.current) return null;

    const targetMapId = mapId || state.current.activeMapId;
    if (targetMapId) {
      const map = state.current.maps.find((m) => m.id === targetMapId);
      if (map?.palette) return map.palette;
    }

    return state.current.palette || null;
  },

  updatePalettes: (updates) => {
    const { setCampaignPalette, setMapPalette } = get();

    if (updates.campaignPalette !== undefined) {
      setCampaignPalette(updates.campaignPalette);
    }

    if (updates.mapPalettes) {
      Object.entries(updates.mapPalettes).forEach(([mapId, palette]) => {
        setMapPalette(mapId, palette);
      });
    }
  },
}));
```

### Phase 2: Component Integration Updates

#### Step 2.1: Update Canvas Viewport to React to Store Changes

```typescript
// File: src/components/map/canvas-viewport.tsx
import { useMemo } from "react";
import { useProjectStore } from "@/stores/project";
import { resolvePalette } from "@/stores/selectors/palette";

export function CanvasViewport() {
  const { current, activeId } = useProjectStore();

  // This will automatically re-run when store updates
  const palette = useMemo(
    () => resolvePalette(current ?? null, activeId),
    [current, activeId, current?.palette, current?.maps], // Include palette dependencies
  );

  // ... rest of component
}
```

#### Step 2.2: Add Invalidation Keys for Layer Updates

```typescript
// The layer system should invalidate when palettes change
// This may require extending the invalidation key system

// Example: Add palette version to invalidation keys
const paletteInvalidationKey = useMemo(() => {
  if (!current) return "no-project";

  const effectivePalette = resolvePalette(current, activeId);
  return `palette-${JSON.stringify(effectivePalette)}`;
}, [current, activeId]);
```

### Phase 3: Testing the Store Integration

#### Step 3.1: Unit Tests for Store Methods

```typescript
// File: src/test/stores/project.palette.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import type { MapPalette } from "@/palettes/types";

describe("Project Store Palette Integration", () => {
  const testPalette: MapPalette = {
    terrain: {
      water: { fill: "#test" },
      // ... other terrain
    },
    grid: { line: "#testgrid" },
  };

  beforeEach(() => {
    // Reset store state
    useProjectStore.getState().reset?.();
  });

  it("should set and get campaign palette", () => {
    const { setCampaignPalette, current } = useProjectStore.getState();

    setCampaignPalette(testPalette);

    expect(current?.palette).toEqual(testPalette);
  });

  it("should set and get map palette", () => {
    const { setMapPalette, current } = useProjectStore.getState();

    setMapPalette("map-1", testPalette);

    const map = current?.maps.find((m) => m.id === "map-1");
    expect(map?.palette).toEqual(testPalette);
  });

  // ... more tests
});
```

#### Step 3.2: Integration Tests for Live Updates

```typescript
// File: src/test/integration/palette-updates.test.tsx
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { useProjectStore } from '@/stores/project';
import { CanvasViewport } from '@/components/map/canvas-viewport';

describe('Palette Live Updates', () => {
  it('should update rendering when campaign palette changes', () => {
    const { result } = render(<CanvasViewport />);

    act(() => {
      useProjectStore.getState().setCampaignPalette(testPalette);
    });

    // Verify component re-rendered with new palette
    // This would require spy on render calls or visual testing
  });
});
```

## Implementation Priority and Timeline

### Priority 1: Immediate (Required for Basic Functionality)

1. **Add palette fields to Project/Map interfaces** (30 min)
2. **Implement basic store methods** (setCampaignPalette, setMapPalette) (1 hour)
3. **Update component memoization dependencies** (30 min)

### Priority 2: Essential (Required for Production)

4. **Add comprehensive store tests** (1 hour)
5. **Implement bulk update methods** (30 min)
6. **Add proper invalidation handling** (1 hour)

### Priority 3: Quality of Life (Nice to Have)

7. **Add utility methods** (getEffectivePalette, etc.) (30 min)
8. **Add integration tests for live updates** (1 hour)
9. **Add error handling for invalid palettes** (30 min)

**Total Estimated Time: 4-6 hours**

## Potential Pitfalls and Solutions

### 1. **Re-render Performance Issues**

**Problem**: Palette changes could trigger excessive re-renders
**Solution**: Use shallow comparison in useMemo dependencies, consider palette versioning

### 2. **Invalid Palette Data**

**Problem**: Runtime palette data might not match TypeScript interface
**Solution**: Add validation in store methods, provide fallback mechanisms

### 3. **Concurrent Updates**

**Problem**: Multiple palette updates happening simultaneously
**Solution**: Use Zustand's atomic updates, consider batching updates

### 4. **Persistence Integration**

**Problem**: Palette changes need to be saved/loaded (future T-015)
**Solution**: Design store methods to be persistence-friendly from the start

## Migration Strategy

### Step 1: Extend Types (Non-breaking)

- Add optional palette fields to interfaces
- Existing code continues to work

### Step 2: Add Store Methods (Non-breaking)

- Implement new methods alongside existing ones
- No impact on current functionality

### Step 3: Update Components (Careful)

- Update memoization dependencies
- Test thoroughly to ensure no regression

### Step 4: Add Tests (Safe)

- Comprehensive test coverage for new functionality
- Validate edge cases and error conditions

## Validation Checklist

- [ ] TypeScript compilation passes without errors
- [ ] Store methods correctly update state
- [ ] Component re-renders when palettes change
- [ ] Selector functions work with new store structure
- [ ] Tests pass with >80% coverage
- [ ] No performance regressions in re-rendering
- [ ] Error handling works for invalid data
- [ ] Integration with existing layer system intact

## Next Steps

1. **Implement Priority 1 items immediately** - Required for basic runtime updates
2. **Create comprehensive test suite** - Validate the integration works correctly
3. **Performance testing** - Ensure updates don't cause excessive re-renders
4. **Documentation updates** - Update API docs with new store methods
5. **Consider UI integration** - Prepare for palette editing UI (T-012)

---

**Note**: This implementation maintains backward compatibility while adding the missing runtime update capability. The design is future-ready for the palette editing UI planned in T-012.
