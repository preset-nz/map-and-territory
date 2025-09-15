# Rendering Architecture Proposal: Low-INP Layering and Paper Masking

## Objectives

- Deliver smooth interactions (low INP, sub-100ms input→paint) while editing large hex maps.
- Keep the paper texture/mask aesthetic without main-thread jank.
- Preserve plugin extensibility and pave a path to GPU acceleration.

## Constraints & Context

- React + Next.js app with a professional UI; canvas/SVG content should not block UI.
- Layers: hex grid, terrain/labels/effects, fog-of-war, overlays.
- “Paper” layer applies a texture/mask to the composite (multiply/overlay/curves/LUT style).
- Future: more effects (FBM noise, domain warp, texture swizzles) and large selections.

## Current Pain (INP root causes)

- Heavy compositing on the main thread (Canvas2D/SVG) on every interaction.
- State updates → React render → paint on same thread; pointermove floods.
- Masking/post-processing done in CPU, often re-sampling large bitmaps.

## Options (2D rendering)

- A. Optimized Canvas2D (CPU)
  - Pros: zero deps, straightforward. Cons: CPU-bound, limited batching, costly masks.
- B. WebGL2 2D pipeline (PixiJS or regl)
  - Pros: sprite batching, GPU textures, instancing, shader-based masks/post-fx.
  - Cons: adds a rendering library; learning curve.
- C. Three.js (orthographic 2D)
  - Pros: mature, rich ecosystem, future 3D path.
  - Cons: heavier abstraction for 2D; batching/masks doable but overkill for now.
- D. WebGPU (future)
  - Pros: modern API and performance. Cons: availability, tooling, learning curve.

Recommendation: adopt a 2D WebGL2 pipeline (PixiJS or regl) behind a small render backend interface. Keep an optimized Canvas2D backend as fallback. Consider Three.js only if we foresee 3D camera/extrusions/lighting shortly.

## Proposed Architecture

### 1) Render Backend Boundary

Define an internal `RenderBackend` interface and decouple all drawing from React. Provide at least two implementations:

- `Canvas2DBackend` (baseline)
- `WebGL2Backend` (preferred; PixiJS or regl)

Minimal API (illustrative):

- `init(canvas: HTMLCanvasElement | OffscreenCanvas, opts)`
- `resize(w,h)`
- `uploadTextures(assets)`
- `updateScene(sceneGraphDelta)`
- `render(frameState)`
- `destroy()`

### 2) OffscreenCanvas + Worker

- Transfer an `OffscreenCanvas` to a dedicated Worker; run the backend inside the Worker.
- Main thread handles UI + input; batches scene ops to the Worker via a command queue.
- All heavy compositing stays off the main thread, reducing INP.

### 3) Scene Graph + Diffs

- Maintain a minimal, serializable scene graph (layers, tiles, quads, text glyphs).
- Compute diffs for edits (dirty tiles/regions), send compact ops to the Worker.
- Avoid full re-upload per frame; leverage GPU buffers for static data and dynamic instance attributes.

### 4) GPU Compositing Pipeline

- Render each logical layer to a framebuffer/texture only when it changes (dirty flags per layer).
- Final pass: composite cached layer textures into a single full-screen quad.

### 5) Paper Masking as Post-Process

- Keep a pre-uploaded paper texture (or generated via noise) as a GPU texture.
- Apply via fragment shader in the final composite: multiply/overlay (configurable), with optional LUT/curves.
- Optional: bind a film grain/noise texture for subtle animated grain (time-based) with low cost.

### 6) Hex Grid via Instancing

- Store a single hex mesh (or quad with SDF hex in shader) and draw N instances with per-instance attrs:
  - position/scale, tile id/material indices, color mods, state flags.
- This allows large grids to render in a handful of draw calls.

### 7) Text & Labels

- Use SDF glyph atlas for crisp text at multiple zoom levels (msdf or sdf); batch text as sprites in GPU.
- Only rebuild text buffers when content changes.

### 8) Input Pipeline (Low INP)

- Sample pointer events via `requestAnimationFrame`; drop intermediate move events.
- Debounce expensive ops (selection flood, hit-testing) and move them to a Worker.
- Keep React updates small; avoid re-rendering canvas; drive rendering via messages.

### 9) Asset Management

- Texture atlas for tile fills/brush patterns and SVG-baked textures.
- GPU residency: upload once, reuse; mipmap for zoom; nearest/linear per art direction.

### 10) Fog of War & Masks

- Use a single channel texture (R8) for FOW mask; update via partial texture updates (subimage2D).
- Apply in composite or as a layer blend in shader (discard/darken based on mask).

## Technology Choice

- Short list: `PixiJS` (2D sprite batching, filters, masks), `regl` (low-level WebGL2 helper), `three.js` (ortho 2D viable, heavier).
- Proposal: Pilot `PixiJS` for speed to value; it gives batching, filters, masks, render-to-texture out of the box. Keep backend abstraction to allow swapping to regl/three.js later.
- Three.js Decision Criterion: choose if we need 3D camera/elevation/lighting/parallax soon. Otherwise, 2D engines are leaner.

## Rollout Plan

1. Spike (time-boxed)
   - Implement `RenderBackend` interface.
   - Build `Canvas2DBackend` and a minimal `PixiBackend` rendering a 10k-tile grid with a paper composite pass.
   - Measure INP, FPS, CPU/GPU time.
2. Integrate Worker + OffscreenCanvas
   - Main thread: UI/input → command queue.
   - Worker: scene ops → backend.render.
3. Migrate features incrementally
   - Hex grid, brushes, selection rects.
   - Layers as textures + composite shader.
   - Paper mask post-process.
4. Telemetry + Budgets
   - Record INP, long tasks, frame time percentiles.
   - Set budgets: INP p75 < 200ms during editing; frame time p95 < 16ms on target hardware.

## Risks & Mitigations

- Worker transfer support: use feature detection; fall back to main-thread backend.
- Texture memory: atlasing + texture pooling; limit resolution.
- Filter cost: collapse filters into a single composite shader pass where possible.
- Complexity: hide behind `RenderBackend`; keep Canvas2D fallback.

## Validation

- Benchmarks: grid sizes (1k, 10k, 50k tiles), pan/zoom stress, brush strokes.
- INP: simulate high-frequency pointer events; ensure Worker keeps main thread responsive.
- Visual: compare CPU vs GPU outputs; tolerance-based pixel compare for filters.

## Decision Snapshot

- Do not hard-commit to three.js now. Implement a backend abstraction and pilot PixiJS for GPU-accelerated 2D. Revisit three.js if/when 3D requirements emerge.
