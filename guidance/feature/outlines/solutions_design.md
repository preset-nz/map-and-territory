# Hex Outlines Technical Design

**Feature:** Hex Outlines Drawing Tool
**Date:** September 23, 2025
**Status:** Design Phase

---

## Architecture Overview

The hex outlines feature will be implemented as a new layer type within the existing plugin architecture, following patterns established by the freeform and hexgrid layers.

### Core Components

1. **OutlineLayer** - New layer type for storing and rendering outline paths
2. **OutlinePlugin** - Plugin registration and property schema
3. **OutlineAdapter** - Canvas2D rendering implementation
4. **OutlineTool** - Interactive tool for creating/editing outlines
5. **PathfindingEngine** - Smart corner connection algorithms

## Data Structures

### Outline Path Representation

```typescript
interface OutlinePath {
  id: string; // unique path identifier
  corners: HexCorner[]; // sequence of hex corner points
  style: OutlineStyle; // visual styling properties
  closed: boolean; // whether path forms closed loop
}

interface HexCorner {
  hex: Axial; // hex coordinate containing this corner
  corner: 0 | 1 | 2 | 3 | 4 | 5; // corner index (clockwise from top)
}

interface OutlineStyle {
  color: string; // line color (supports palette integration)
  width: number; // line width in pixels (1-10)
  pattern: "solid" | "dashed" | "dotted";
  smoothing: "strict" | "smooth"; // path smoothing mode
  roughness?: number; // optional atmospheric roughening (0-1)
}
```

### Layer State Schema

```typescript
interface OutlineState {
  paths: Record<string, OutlinePath>; // keyed by path ID
  activePath?: string; // currently editing path ID
  opacity: number; // layer opacity (0-1)
  defaultStyle: OutlineStyle; // template for new paths
}
```

## Rendering Implementation

### Canvas2D Approach

The outline adapter will use Canvas2D Path2D objects for efficient rendering:

```typescript
class OutlineAdapter implements LayerAdapter<OutlineState> {
  drawMain(ctx: CanvasRenderingContext2D, state: OutlineState, env: RenderEnv) {
    for (const path of Object.values(state.paths)) {
      const path2d = this.buildPath2D(path, env);
      this.applyStyle(ctx, path.style);
      ctx.stroke(path2d);
    }
  }

  private buildPath2D(path: OutlinePath, env: RenderEnv): Path2D {
    // Convert hex corners to pixel coordinates
    // Apply smoothing/roughening algorithms
    // Return optimized Path2D object
  }
}
```

### Corner-to-Pixel Conversion

Leverage existing hex layout utilities:

```typescript
function cornerToPixel(corner: HexCorner, layout: Layout): Point {
  const hexCenter = toPoint(corner.hex, layout);
  const cornerOffsets = corners(hexCenter, layout);
  return cornerOffsets[corner.corner];
}
```

### Pathfinding Algorithm

For smart corner connection when users skip intermediate corners:

```typescript
interface PathfindingOptions {
  start: HexCorner;
  end: HexCorner;
  preferredDirection: "clockwise" | "counterclockwise" | "shortest";
}

function findOptimalPath(options: PathfindingOptions): HexCorner[] {
  // Implement hex corner pathfinding using:
  // 1. Dijkstra's algorithm for shortest path
  // 2. Corner adjacency rules (6 neighbors per hex)
  // 3. Direction preferences for natural-feeling paths
}
```

## Tool Implementation

### Interactive Outline Tool

Following the pattern from freeform tools:

```typescript
const outlineToolHandler: ToolHandler = {
  id: "outline",

  onPointerDown(pt: Point, env: RenderEnv, ctx: ToolContext) {
    const corner = this.findNearestCorner(pt, env);
    if (!corner) return;

    const state = ctx.getActiveLayerState<OutlineState>();
    if (state?.activePath) {
      this.extendActivePath(corner, ctx);
    } else {
      this.startNewPath(corner, ctx);
    }
  },

  onPointerMove(pt: Point, env: RenderEnv, ctx: ToolContext) {
    // Show preview of connection to nearest corner
    this.updatePreview(pt, env, ctx);
  },

  onKeyDown(key: string, ctx: ToolContext) {
    if (key === "Escape") this.finishActivePath(ctx);
    if (key === "Enter") this.closeActivePath(ctx);
  },
};
```

### Corner Detection

Efficient corner hit-testing with tolerance:

```typescript
function findNearestCorner(
  clickPoint: Point,
  env: RenderEnv,
  tolerance: number = 10,
): HexCorner | null {
  const layout = buildLayoutFromEnv(env);

  // Use spatial hashing for performance with large maps
  const candidateHexes = getSpatialCandidates(clickPoint, layout);

  let nearest: { corner: HexCorner; distance: number } | null = null;

  for (const hex of candidateHexes) {
    const cornerPoints = corners(toPoint(hex, layout), layout);

    for (let i = 0; i < 6; i++) {
      const distance = pointDistance(clickPoint, cornerPoints[i]);
      if (distance <= tolerance && (!nearest || distance < nearest.distance)) {
        nearest = { corner: { hex, corner: i as any }, distance };
      }
    }
  }

  return nearest?.corner ?? null;
}
```

## Plugin Integration

### Plugin Manifest

```typescript
export const outlinePluginManifest: PluginManifest = {
  id: "core.outline",
  name: "Hex Outlines",
  version: "1.0.0",
  apiVersion: "1.0",
  priority: 200,
  contributes: {
    commands: [
      { id: "layer.outline.add", title: "Add Outline Layer" },
      { id: "tool.outline.draw", title: "Draw Outline" },
      { id: "tool.outline.edit", title: "Edit Outline" },
    ],
    toolbar: [
      {
        group: "scene",
        items: [
          {
            type: "button",
            command: "layer.outline.add",
            icon: "lucide:pen-tool",
            label: "Outlines",
            order: 4,
            enableWhen: ["hasActiveMap"],
            disabledReason: "Select a map to add outlines",
          },
        ],
      },
      {
        group: "tools",
        items: [
          {
            type: "button",
            command: "tool.outline.draw",
            icon: "lucide:spline",
            label: "Draw",
            order: 4,
            enableWhen: ["activeLayerIs:outline", "gridVisible"],
            disabledReason: "Select an Outline layer",
          },
        ],
      },
    ],
  },
};
```

### Property Schema

```typescript
registerPropertySchema("layer:outline", {
  groups: [
    {
      id: "outline",
      title: "Outline Properties",
      rows: [
        {
          kind: "slider",
          id: "opacity",
          label: "Opacity",
          path: "opacity",
          min: 0,
          max: 1,
          step: 0.01,
        },
        {
          kind: "color",
          id: "defaultColor",
          label: "Default Color",
          path: "defaultStyle.color",
          presets: ["#000000", "#8B4513", "#2F4F4F", "#800000", "#191970"],
        },
        {
          kind: "slider",
          id: "defaultWidth",
          label: "Default Width",
          path: "defaultStyle.width",
          min: 1,
          max: 10,
          step: 1,
        },
        {
          kind: "select",
          id: "defaultPattern",
          label: "Default Pattern",
          path: "defaultStyle.pattern",
          options: [
            { value: "solid", label: "Solid" },
            { value: "dashed", label: "Dashed" },
            { value: "dotted", label: "Dotted" },
          ],
        },
        {
          kind: "select",
          id: "defaultSmoothing",
          label: "Default Smoothing",
          path: "defaultStyle.smoothing",
          options: [
            { value: "strict", label: "Follow Hex Edges" },
            { value: "smooth", label: "Smooth Curves" },
          ],
        },
        {
          kind: "slider",
          id: "defaultRoughness",
          label: "Atmospheric Roughness",
          path: "defaultStyle.roughness",
          min: 0,
          max: 1,
          step: 0.05,
          helperText: "Add organic variation for gritty aesthetic",
        },
      ],
    },
  ],
});
```

## Performance Considerations

### Rendering Optimization

1. **Path2D Caching**: Cache compiled Path2D objects per outline path
2. **Viewport Culling**: Only render paths intersecting current viewport
3. **Level-of-Detail**: Simplify complex paths when zoomed out
4. **Invalidation Keys**: Efficient change detection for re-rendering

### Memory Management

```typescript
interface PathCache {
  path2d: Path2D;
  styleHash: string; // for invalidation
  viewportLevel: number; // for LOD
}

class OutlineAdapter {
  private pathCache = new Map<string, PathCache>();

  getInvalidationKey(state: OutlineState): string {
    // Include path count, style changes, active path status
    const pathCount = Object.keys(state.paths).length;
    const styleHashes = Object.values(state.paths)
      .map((p) => this.hashStyle(p.style))
      .join(":");

    return `outline:${pathCount}:${styleHashes}:${state.activePath ?? ""}`;
  }
}
```

## Integration Points

### Hex Coordinate System

- Leverages existing `src/lib/hex/` utilities for coordinate conversions
- Compatible with both pointy-top and flat-top hex orientations
- Maintains consistency with freeform and hexgrid layers

### Rendering Pipeline

- Follows Canvas2D backend patterns from `src/render/backends/canvas2d`
- Integrates with existing layer ordering and invalidation system
- Supports export to PNG/SVG through current export mechanisms

### Plugin Architecture

- Uses established plugin registration patterns from `src/plugin/`
- Compatible with property system from `src/properties/`
- Follows toolbar and command patterns from existing plugins

## Terrain-Following Auto-Outlines (Phase 8)

### Enhanced Data Structures

```typescript
interface OutlineState {
  paths: Record<string, OutlinePath>; // manual paths
  activePath?: string;
  opacity: number;
  defaultStyle: OutlineStyle;

  // New: Terrain-following capabilities
  linkedSources: LinkedOutlineSource[]; // auto-generated paths
}

interface LinkedOutlineSource {
  id: string; // unique source identifier
  layerId: string; // source freeform layer ID
  terrainFilter?: string; // specific terrain ID to outline
  style: OutlineStyle; // styling for generated outlines
  autoUpdate: boolean; // regenerate when source changes
  simplification: number; // corner reduction factor (0-1)
  generatedPaths: OutlinePath[]; // auto-generated outline paths
}
```

### Edge Detection Algorithm

```typescript
interface TerrainEdge {
  from: HexCorner;
  to: HexCorner;
  terrainId: string;
}

function detectTerrainEdges(
  cells: Record<string, FreeformCell>,
  terrainFilter?: string,
): TerrainEdge[] {
  const edges: TerrainEdge[] = [];

  for (const [key, cell] of Object.entries(cells)) {
    if (terrainFilter && cell.terrainId !== terrainFilter) continue;
    if (!cell.terrainId) continue;

    const hex = parseAxialKey(key);
    const neighbors = getHexNeighbors(hex);

    // Check each of the 6 hex edges
    for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
      const neighborHex = neighbors[edgeIndex];
      const neighborKey = `${neighborHex.q},${neighborHex.r}`;
      const neighborCell = cells[neighborKey];

      // Edge exists if neighbor has different terrain (or no terrain)
      const isDifferentTerrain =
        !neighborCell || neighborCell.terrainId !== cell.terrainId;

      if (isDifferentTerrain) {
        // Add edge from corner N to corner N+1 of current hex
        const corner1 = edgeIndex;
        const corner2 = (edgeIndex + 1) % 6;

        edges.push({
          from: { hex, corner: corner1 },
          to: { hex, corner: corner2 },
          terrainId: cell.terrainId,
        });
      }
    }
  }

  return edges;
}

function edgesToOutlinePaths(edges: TerrainEdge[]): OutlinePath[] {
  // Group edges by terrain type
  const edgesByTerrain = groupBy(edges, (e) => e.terrainId);
  const paths: OutlinePath[] = [];

  for (const [terrainId, terrainEdges] of Object.entries(edgesByTerrain)) {
    // Build connected paths from edge segments
    const connectedPaths = traceConnectedPaths(terrainEdges);

    paths.push(
      ...connectedPaths.map((cornerSequence) => ({
        id: generatePathId(),
        corners: cornerSequence,
        style: getDefaultStyle(),
        closed: isClosedLoop(cornerSequence),
        terrainId, // track source terrain
      })),
    );
  }

  return paths;
}
```

### Path Tracing Algorithm

```typescript
function traceConnectedPaths(edges: TerrainEdge[]): HexCorner[][] {
  const adjacencyMap = new Map<string, HexCorner[]>();

  // Build corner adjacency from edges
  for (const edge of edges) {
    const fromKey = cornerToKey(edge.from);
    const toKey = cornerToKey(edge.to);

    if (!adjacencyMap.has(fromKey)) adjacencyMap.set(fromKey, []);
    if (!adjacencyMap.has(toKey)) adjacencyMap.set(toKey, []);

    adjacencyMap.get(fromKey)!.push(edge.to);
    adjacencyMap.get(toKey)!.push(edge.from);
  }

  const visited = new Set<string>();
  const paths: HexCorner[][] = [];

  // Trace each connected component
  for (const startCorner of adjacencyMap.keys()) {
    if (visited.has(startCorner)) continue;

    const path = tracePathFrom(startCorner, adjacencyMap, visited);
    if (path.length >= 2) {
      paths.push(path);
    }
  }

  return paths;
}

function tracePathFrom(
  startKey: string,
  adjacencyMap: Map<string, HexCorner[]>,
  visited: Set<string>,
): HexCorner[] {
  const path: HexCorner[] = [keyToCorner(startKey)];
  visited.add(startKey);

  let current = startKey;

  while (true) {
    const neighbors = adjacencyMap.get(current) || [];
    const unvisited = neighbors.filter((n) => !visited.has(cornerToKey(n)));

    if (unvisited.length === 0) break;

    // Prefer continuing in the same direction for smoother paths
    const next = selectBestNextCorner(current, unvisited, path);
    const nextKey = cornerToKey(next);

    path.push(next);
    visited.add(nextKey);
    current = nextKey;
  }

  return path;
}
```

### Integration with Property System

```typescript
// Enhanced property schema
registerPropertySchema("layer:outline", {
  groups: [
    {
      id: "outline",
      title: "Outline Properties",
      rows: [
        // ... existing manual outline properties
      ],
    },
    {
      id: "autoOutline",
      title: "Auto-Generated Outlines",
      rows: [
        {
          kind: "select",
          id: "autoOutlineSource",
          label: "Source Layer",
          path: "linkedSources.0.layerId",
          options: [
            { value: "", label: "Manual Drawing Only" },
            // Populated with available freeform layers
          ],
          optionsProvider: (app: unknown) => {
            const api = app as typeof AppAPI;
            const freeformLayers = api.layers.getByType("freeform");
            return [
              { value: "", label: "Manual Drawing Only" },
              ...freeformLayers.map((layer) => ({
                value: layer.id,
                label: layer.name || `Freeform Layer ${layer.id.slice(-6)}`,
              })),
            ];
          },
        },
        {
          kind: "select",
          id: "terrainFilter",
          label: "Terrain Filter",
          path: "linkedSources.0.terrainFilter",
          disabledWhen: { path: "linkedSources.0.layerId", equals: "" },
          options: [
            { value: "", label: "All Terrain Boundaries" },
            // Populated with terrain types from palette
          ],
          optionsProvider: (app: unknown) => {
            const api = app as typeof AppAPI;
            const terrains = api.palette.list();
            return [
              { value: "", label: "All Terrain Boundaries" },
              ...terrains.map((terrain) => ({
                value: terrain.id,
                label: terrain.themedName,
              })),
            ];
          },
        },
        {
          kind: "checkbox",
          id: "autoUpdate",
          label: "Auto-Update When Source Changes",
          path: "linkedSources.0.autoUpdate",
          disabledWhen: { path: "linkedSources.0.layerId", equals: "" },
        },
        {
          kind: "slider",
          id: "simplification",
          label: "Simplification",
          path: "linkedSources.0.simplification",
          min: 0,
          max: 1,
          step: 0.05,
          helperText: "Reduce corner count for smoother boundaries",
          disabledWhen: { path: "linkedSources.0.layerId", equals: "" },
        },
      ],
    },
  ],
});
```

### Command Integration

```typescript
// New command for manual terrain outline generation
"tool.outline.generate-from-terrain": () => {
  const outlineLayer = getActiveLayer();
  if (outlineLayer?.type !== "outline") return;

  const state = outlineLayer.state as OutlineState;
  const sourceLayerId = state.linkedSources[0]?.layerId;

  if (!sourceLayerId) {
    showDialog({
      title: "No Source Layer",
      message: "Please select a Freeform layer as the outline source."
    });
    return;
  }

  generateOutlinesFromTerrain(outlineLayer.id, sourceLayerId);
}
```

### Live Update System

```typescript
// Monitor freeform layer changes and regenerate linked outlines
class OutlineLayerManager {
  private subscriptions = new Map<string, () => void>();

  setupLiveUpdates(outlineLayerId: string, sourceLayerId: string) {
    // Clean up existing subscription
    this.cleanupSubscription(outlineLayerId);

    // Subscribe to source layer changes
    const unsubscribe = subscribeToLayerChanges(sourceLayerId, () => {
      this.regenerateLinkedOutlines(outlineLayerId);
    });

    this.subscriptions.set(outlineLayerId, unsubscribe);
  }

  private regenerateLinkedOutlines(outlineLayerId: string) {
    const layer = getLayerById(outlineLayerId);
    if (!layer || layer.type !== "outline") return;

    const state = layer.state as OutlineState;

    for (const source of state.linkedSources) {
      if (!source.autoUpdate) continue;

      const newPaths = this.generatePathsFromSource(source);

      applyLayerState(outlineLayerId, (draft) => {
        const sourceIndex = draft.linkedSources.findIndex(
          (s) => s.id === source.id,
        );
        if (sourceIndex >= 0) {
          draft.linkedSources[sourceIndex].generatedPaths = newPaths;
        }
      });
    }
  }
}
```

---

## Future Enhancements

### Phase 2 Features

- **Path Editing**: Select and modify existing outline paths
- **Multi-Selection**: Edit multiple paths simultaneously
- **Copy/Paste**: Duplicate outline patterns across maps
- **Snapping**: Snap to existing paths for precise connections

### Phase 8: Terrain-Following Auto-Outlines

- **Automatic Boundary Detection**: Generate outlines by tracing edges of painted terrain
- **Freeform Layer Integration**: Link outline layers to source freeform layers
- **Terrain Filtering**: Outline specific terrain types or all terrain boundaries
- **Live Updates**: Auto-regenerate outlines when source terrain changes
- **Edge Simplification**: Reduce corner count for cleaner boundaries

### Advanced Styling

- **Gradient Fills**: Color transitions along path length
- **Texture Brushes**: Apply bitmap textures to outline strokes
- **Shadow Effects**: Drop shadows for depth perception
- **Animation**: Animated outline effects (marching ants, glow)

This design provides a solid foundation for hex outline functionality while maintaining consistency with the existing codebase architecture and performance requirements.
