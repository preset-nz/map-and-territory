# Pixi Scene Graph Model: Mapping Domain → Rendering

## Position

- Keep the domain model (Campaign → Maps → Layers → Items) independent of the rendering engine.
- The Pixi scene graph mirrors only what needs to be drawn, per visible Map, with a thin adapter.
- Benefits: clear separation of concerns, easier testing, optional backends (Canvas2D/WebGL2), and controlled performance.

## Domain Model (authoritative)

- Campaign
  - Maps[] (open/closed state, viewport/camera per open map)
    - Layers[] (ordered; visibility, opacity, blend mode, lock state)
      - Items[] (type-specific data: tiles, strokes, labels, masks, brushes)
- Stores: zustand slices for campaign/maps/layers/items. Immutable-ish edits; emit diffs for renderer.

## Render Model (per Map)

- One Renderer per visible Map (in Worker via OffscreenCanvas when supported).
- Pixi tree (example):

```
PIXI.Application
└── Stage (PIXI.Container)
    ├── Background (optional grid/backdrop)
    ├── LayersRoot (PIXI.Container)
    │   ├── Layer[0] (PIXI.Container)
    │   │   ├── StaticCache (PIXI.Sprite of RenderTexture) [optional]
    │   │   └── DynamicRoot (PIXI.Container)
    │   │       └── DisplayObjects ... (Sprites/Meshes/Particles/Text)
    │   ├── Layer[1] ...
    │   └── ...
    ├── PaperCompositeQuad (fullscreen quad with Filter chain)
    └── OverlayUI (selection marquee, cursors)
```

## Mapping Rules

- Map → Stage sub-tree (one per open map). No Campaign node in Pixi.
- Layer → Container with z-order derived from layer index.
- Visibility → `container.visible`; Opacity → `container.alpha`.
- Blend Mode → `container.blendMode` (mapped from domain enum).
- Lock → skip pointer hit-testing + edits; render unaffected.
- Items → type-specific display nodes owned by their Layer.
- IDs: Every domain entity has a stable `id`. Pixi nodes store `node.renderId = domainId` for hit-tests and diff routing.

## Layer Types → Display Strategy

- Tiles (hex grid)
  - Strategy: instanced mesh or batched sprites. Upload per-instance attributes (position, material, color mods).
  - Cache: chunks (e.g., 64×64 hex regions) as RenderTextures for static tiles; redraw when dirty.
- Vector Strokes/Shapes
  - Strategy: draw to a dedicated RenderTexture on edits; reuse as sprite (avoid per-frame Graphics costs).
- Labels/Text
  - Strategy: SDF/MSDF glyph atlas + Pixi `BitmapText` or custom SDF shader; batch updates.
- Effects (noise/fbm)
  - Strategy: generate into a texture in Worker; bind as input to filters or tile materials.
- Fog of War / Masks
  - Strategy: single-channel texture (R8) updated via `updateSubImage`; sampled in composite or layer shader.
- Paper Layer
  - Strategy: filter chain on the final composite quad (multiply/overlay + grain); configurable intensity.

## Culling & Chunking

- Split map into fixed-size chunks (screen-space or tile-space).
- Maintain dirty flags per chunk and per layer.
- Only rebuild display objects / RenderTextures for dirty chunks on edits.
- Frustum cull chunks outside the viewport.

## Update Flow (Diff-based)

1. Domain edit produces an action → store updates → diff (e.g., layer visibility toggle, tile paint in region).
2. UI thread sends compact ops to Render Worker (mapId, ops[] with paths + payload).
3. Worker applies ops to a light render state and updates Pixi nodes:
   - Create/destroy/move Layer Containers as needed.
   - Update visibility/alpha/blend.
   - Mark chunks dirty; rebuild affected RenderTextures or instance buffers.
4. On next rAF tick in Worker, render with batching and cached textures.

## Camera & Coordinate System

- Orthographic camera via Stage scale/position.
- Keep domain coordinates in tile-space; adapter converts to screen-space.
- Zoom steps snap to practical levels (mipmap-friendly) to reduce texture filtering issues.

## Hit Testing & Selection

- GPU picking (optional): render ids to an offscreen buffer for precise picks.
- CPU fallback: spatial index (RBush) per layer, tested in Worker.
- Selection marquee drawn in UI layer; hit tests happen in Worker and return ids.

## Resource Ownership

- Each Map Renderer owns its Pixi Application, textures, and buffers.
- Asset Manager uploads shared textures (paper, patterns, glyph atlas) once per Worker; maps reuse handles.
- On map close, dispose renderer, destroy containers/textures, free GPU memory.

## Plugin Integration

- Plugins contribute Layers/Items via domain schema; renderer has type registries to map item types → display strategies.
- Strict boundary: plugins must not touch Pixi nodes directly. They emit domain changes or register renderers via a safe API.

## Performance Guardrails

- Never rebuild entire stage on small edits; use chunk dirtying and instance buffers.
- Avoid Pixi.Graphics per-frame; prefer pre-render to textures.
- Minimize filter passes: collapse into a single composite shader when possible.
- Throttle pointermove to rAF; coalesce operations.
- Measure: INP, frame times, texture memory. Set budgets and alert thresholds.

## Open Questions

- SDF text path: BitmapText vs custom SDF pipeline trade-offs.
- Picking strategy default: CPU spatial index initially, GPU picking later if needed.
- Layer effect stack: how to expose a composable filter chain to plugins without perf traps.

## Decision

- Model Campaign/Maps/Layers in the domain stores only.
- Render per-Map Pixi scene graphs that mirror Layers and Items needed for drawing.
- Use an adapter + diff protocol between domain and renderer to keep INP low and rendering deterministic.
