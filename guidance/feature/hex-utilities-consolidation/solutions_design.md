# Hex Utilities Consolidation - Solutions Design

## Overview

This document outlines the technical design for consolidating hex-related utilities across layer adapters. The solution migrates hexgrid and hex-noise adapters to use the existing shared hex utilities from `src/layers/hex-utils.ts`.

## Current State Analysis

### Existing Hex Utils (src/layers/hex-utils.ts)

```typescript
// Already implemented utilities
export function axialKey(q: number, r: number): string;
export function axialKeyFrom(a: Axial): string;
export function parseAxialKey(key: string): Axial;
export function centerFor(ax: Axial, layout: Layout): Point;
export function hexPath(
  ctx: CanvasRenderingContext2D,
  center: Point,
  layout: Pick<Layout, "size" | "orientation">,
);
```

### Duplication Analysis

#### Hexgrid Adapter Issues

- **Custom hex drawing**: Lines 35-46 implement manual hex path creation
- **Tiling logic mixed with rendering**: Grid calculation and hex drawing combined
- **Missing abstraction**: No use of shared coordinate utilities

#### Hex Noise Adapter Issues

- **Custom hex drawing**: Lines 56 and 90 use `hexPath` but duplicate layout creation
- **Redundant path calls**: Multiple similar calls to `hexPath` with same layout
- **Inconsistent patterns**: Different approach than hexgrid for same operations

## Design Solution

### 1. Enhanced Hex Utilities

Extend existing hex-utils.ts with tiling helpers while keeping core utilities unchanged:

```typescript
// Add to hex-utils.ts
export interface HexTilingConfig {
  size: number;
  orientation: "pointy" | "flat";
  center: Point;
  bounds: { w: number; h: number };
  padding?: number; // extra hexes beyond bounds
}

export interface HexTilePosition {
  center: Point;
  axial: Axial; // for noise/data lookups
  gridCoords: { col: number; row: number }; // for offset calculations
}

// Iterator for hex positions in a region
export function* hexTiles(config: HexTilingConfig): Generator<HexTilePosition> {
  const { size, orientation, center, bounds, padding = 2 } = config;
  const r = size;
  const sqrt3 = Math.sqrt(3);

  if (orientation === "flat") {
    const colStep = 1.5 * r;
    const rowStep = sqrt3 * r;
    const cols = Math.ceil(bounds.w / colStep) + padding;
    const rows = Math.ceil(bounds.h / rowStep) + padding;

    const cmin = -Math.ceil(cols / 2);
    const cmax = Math.ceil(cols / 2);
    const rmin = -Math.ceil(rows / 2);
    const rmax = Math.ceil(rows / 2);

    for (let c = cmin; c <= cmax; c++) {
      const yOffset = c & 1 ? rowStep / 2 : 0;
      for (let rr = rmin; rr <= rmax; rr++) {
        const x = c * colStep + center.x;
        const y = rr * rowStep + yOffset + center.y;

        yield {
          center: { x, y },
          axial: { q: c, r: rr }, // Simplified for flat orientation
          gridCoords: { col: c, row: rr },
        };
      }
    }
  } else {
    // pointy orientation
    const colStep = sqrt3 * r;
    const rowStep = 1.5 * r;
    const cols = Math.ceil(bounds.w / colStep) + padding;
    const rows = Math.ceil(bounds.h / rowStep) + padding;

    const rmin = -Math.ceil(rows / 2);
    const rmax = Math.ceil(rows / 2);
    const cmin = -Math.ceil(cols / 2);
    const cmax = Math.ceil(cols / 2);

    for (let rr = rmin; rr <= rmax; rr++) {
      const xOffset = rr & 1 ? colStep / 2 : 0;
      for (let c = cmin; c <= cmax; c++) {
        const x = c * colStep + xOffset + center.x;
        const y = rr * rowStep + center.y;

        yield {
          center: { x, y },
          axial: { q: c, r: rr }, // Simplified for pointy orientation
          gridCoords: { col: c, row: rr },
        };
      }
    }
  }
}

// Shared layout creation helper
export function createHexLayout(
  size: number,
  orientation: "pointy" | "flat",
): Pick<Layout, "size" | "orientation"> {
  return { size, orientation };
}
```

### 2. Hexgrid Adapter Migration

Replace custom hex drawing with shared utilities:

```typescript
// BEFORE (hexgrid.ts lines 35-46)
const drawHex = (cx: number, cy: number, startAngle: number) => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = startAngle + i * (Math.PI / 3);
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
};

// AFTER - using shared utilities
import { hexPath, hexTiles, createHexLayout } from "@/layers/hex-utils";

const layout = createHexLayout(r, orientation);
const tilingConfig = {
  size: r,
  orientation,
  center: { x: w / 2, y: h / 2 },
  bounds: { w, h },
  padding: 2,
};

for (const tile of hexTiles(tilingConfig)) {
  hexPath(ctx, tile.center, layout);
  ctx.stroke();
}
```

### 3. Hex Noise Adapter Migration

Consolidate layout creation and optimize hex drawing:

```typescript
// BEFORE (hex-noise.ts multiple locations)
const layout = { size: r, orientation } as const;
hexPath(ctx as CanvasRenderingContext2D, { x: cx, y: cy }, layout);

// AFTER - using shared utilities and tiling
import { hexPath, hexTiles, createHexLayout } from "@/layers/hex-utils";

const layout = createHexLayout(gridSize, orientation);
const tilingConfig = {
  size: gridSize,
  orientation,
  center: { x: env.size.w / 2, y: env.size.h / 2 },
  bounds: env.size,
  padding: 2,
};

for (const tile of hexTiles(tilingConfig)) {
  // Apply noise calculation
  let v = perlin.normalized2D(
    tile.axial.q * freq + ox,
    tile.axial.r * freq + oy,
  );
  v = Math.pow(v, gamma);
  if (v < clampMin || v > clampMax) continue;

  // Draw hex with shared utility
  hexPath(ctx, tile.center, layout);
  ctx.fillStyle = determineColor(v, state, env);
  ctx.fill();
}
```

## Implementation Strategy

### Phase 1: Extend Hex Utils (Safe Addition)

Add new utilities to hex-utils.ts without modifying existing functions:

```typescript
// hex-utils.ts - ADD these functions
export function* hexTiles(config: HexTilingConfig): Generator<HexTilePosition>
export function createHexLayout(size: number, orientation: "pointy" | "flat"): Pick<Layout, "size" | "orientation">
```

### Phase 2: Migrate Hexgrid Adapter

Replace custom tiling and drawing with shared utilities:

```typescript
// hexgrid.ts - REPLACE drawMain implementation
drawMain(ctx, state, env: RenderEnv) {
  const { w, h } = env.size;
  const { size, orientation, color, alpha, lineWidth } = state;
  const r = Math.max(4, size || 16);

  // ... existing setup code ...

  const layout = createHexLayout(r, orientation);
  const tilingConfig = {
    size: r,
    orientation,
    center: { x: w / 2, y: h / 2 },
    bounds: { w, h },
    padding: 2
  };

  for (const tile of hexTiles(tilingConfig)) {
    hexPath(ctx, tile.center, layout);
    ctx.stroke();
  }
}
```

### Phase 3: Migrate Hex Noise Adapter

Optimize and consolidate hex drawing:

```typescript
// hex-noise.ts - REPLACE drawMain implementation
drawMain(ctx, state, env) {
  // ... existing setup code ...

  const layout = createHexLayout(gridSize, orientation);
  const tilingConfig = {
    size: gridSize,
    orientation,
    center: { x: env.size.w / 2, y: env.size.h / 2 },
    bounds: env.size,
    padding: 2
  };

  for (const tile of hexTiles(tilingConfig)) {
    const noiseValue = calculateNoise(tile.axial, state);
    if (shouldSkipHex(noiseValue, state)) continue;

    hexPath(ctx, tile.center, layout);
    ctx.fillStyle = determineColor(noiseValue, state, env);
    ctx.fill();
  }
}
```

## Testing Strategy

### Unit Tests for New Utilities

```typescript
describe("hex-utils extensions", () => {
  describe("hexTiles", () => {
    test("generates correct number of tiles for flat orientation", () => {
      const config = {
        size: 10,
        orientation: "flat" as const,
        center: { x: 50, y: 50 },
        bounds: { w: 100, h: 100 },
        padding: 1,
      };

      const tiles = Array.from(hexTiles(config));
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0]).toHaveProperty("center");
      expect(tiles[0]).toHaveProperty("axial");
    });

    test("generates correct positions for pointy orientation", () => {
      const config = {
        size: 10,
        orientation: "pointy" as const,
        center: { x: 50, y: 50 },
        bounds: { w: 100, h: 100 },
      };

      const tiles = Array.from(hexTiles(config));
      tiles.forEach((tile) => {
        expect(tile.center.x).toBeFinite();
        expect(tile.center.y).toBeFinite();
        expect(tile.axial.q).toBeFinite();
        expect(tile.axial.r).toBeFinite();
      });
    });
  });

  describe("createHexLayout", () => {
    test("creates valid layout object", () => {
      const layout = createHexLayout(20, "pointy");
      expect(layout.size).toBe(20);
      expect(layout.orientation).toBe("pointy");
    });
  });
});
```

### Visual Regression Tests

```typescript
describe("adapter visual consistency", () => {
  test("hexgrid renders identically after migration", async () => {
    // Render with old implementation
    const beforeCanvas = await renderHexgrid(state, env);

    // Render with new implementation
    const afterCanvas = await renderHexgridWithSharedUtils(state, env);

    // Compare pixel-by-pixel or use snapshot
    expect(afterCanvas).toMatchCanvas(beforeCanvas, { threshold: 0.01 });
  });

  test("hex noise renders identically after migration", async () => {
    const beforeCanvas = await renderHexNoise(state, env);
    const afterCanvas = await renderHexNoiseWithSharedUtils(state, env);

    expect(afterCanvas).toMatchCanvas(beforeCanvas, { threshold: 0.01 });
  });
});
```

### Integration Tests

```typescript
describe("shared utility integration", () => {
  test("all adapters use consistent hex positioning", () => {
    const layout = createHexLayout(20, "pointy");
    const axial = { q: 0, r: 0 };

    // Test that all adapters would position hex at same location
    const freeformCenter = centerFor(axial, {
      ...layout,
      origin: { x: 0, y: 0 },
    });

    // Verify tiling produces same center for origin hex
    const tilingConfig = {
      size: 20,
      orientation: "pointy" as const,
      center: { x: 0, y: 0 },
      bounds: { w: 100, h: 100 },
    };

    const tiles = Array.from(hexTiles(tilingConfig));
    const originTile = tiles.find((t) => t.axial.q === 0 && t.axial.r === 0);

    expect(originTile?.center).toEqual(freeformCenter);
  });
});
```

## Performance Considerations

### Generator Pattern Benefits

- **Lazy evaluation**: Only generate hex positions as needed
- **Memory efficient**: No large arrays of positions
- **Early termination**: Can break out of loops

### Layout Object Reuse

```typescript
// GOOD: Create layout once, reuse
const layout = createHexLayout(size, orientation);
for (const tile of hexTiles(config)) {
  hexPath(ctx, tile.center, layout); // Reuse layout
}

// AVOID: Creating layout in loop
for (const tile of hexTiles(config)) {
  hexPath(ctx, tile.center, { size, orientation }); // New object each time
}
```

### Tiling Optimization

- Maintain existing tiling algorithms (proven performance)
- Add padding parameter to avoid edge calculations
- Use integer arithmetic where possible

## Migration Checklist

### Code Changes

- [ ] Add hexTiles generator to hex-utils.ts
- [ ] Add createHexLayout helper to hex-utils.ts
- [ ] Migrate hexgrid adapter drawMain method
- [ ] Migrate hex-noise adapter drawMain method
- [ ] Remove duplicate hex drawing code
- [ ] Update imports in both adapters

### Testing

- [ ] Unit tests for new hex utilities
- [ ] Visual regression tests for both adapters
- [ ] Integration tests for shared behavior
- [ ] Performance benchmarks before/after
- [ ] E2E tests pass without changes

### Validation

- [ ] Code review for consistency
- [ ] Documentation updates
- [ ] No ESLint/TypeScript errors
- [ ] All existing tests pass

## Risks and Mitigations

### Risk: Visual Differences

**Mitigation**: Extensive visual regression testing with pixel-diff comparison

### Risk: Performance Regression

**Mitigation**: Benchmark existing performance, optimize tiling generator if needed

### Risk: Coordinate System Inconsistencies

**Mitigation**: Comprehensive integration tests ensuring consistent positioning

### Risk: Breaking Changes

**Mitigation**: Maintain adapter interfaces, only change internal implementation

## Future Enhancements

### Additional Utilities

Once consolidation is complete, consider adding:

- Hex neighbor calculations
- Hex distance functions
- Hex line drawing
- Hex flood fill utilities

### Performance Optimizations

- WebGL-based hex rendering for large grids
- Spatial indexing for large hex datasets
- Instanced rendering for identical hexes

### Developer Experience

- TypeScript strict mode compatibility
- Better error messages for invalid configurations
- Debug utilities for hex positioning

This design provides a clean migration path that eliminates code duplication while maintaining exact behavioral compatibility.
