Render Pipeline (Overview)

- SceneFrame is constructed in the UI (CanvasViewport) from store state (size, paper, camera, layers, palette).
- A render service receives resize + frame messages and drives a backend:
  - Worker service (src/render/service.ts + src/render/worker.ts): uses OffscreenCanvas and a dedicated thread.
- Backend (src/render/backends/canvas2d.ts): orchestrates drawing and delegates visuals to layer adapters.

Key points

- Single source of truth: the backend calls getLayerType(layer.type).adapter.drawMain(ctx, state, env) for each visible layer (bottom → top).
- The backend computes screen-space layout once per frame:
  - the paper view via paperView (src/render/geometry.ts): the paper's screen rect and the fit that scales its fixed size in paper px (1200 on the long side) into it.
  - grid hint via deriveGridHint for adapters that align to the grid.
- The Paper adapter draws the paper fill; the backend draws only a simple paper outline.

Worker vs. Fallback

- In development/production, the app uses the worker exclusively and halts if unsupported.
- Fallback renderer has been removed; tests and E2E run with the worker.

Debugging

- The canvas element exposes data attributes during worker init (stage, error) and a small overlay can be enabled with NEXT_PUBLIC_DEBUG=renderer.
