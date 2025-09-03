# ADR-0011: Render Backend Abstraction and GPU 2D Pipeline

## Context
INP is poor due to main-thread Canvas/SVG compositing and CPU masking. We need smooth interactions, scalable compositing, and a path to shader-based paper effects without locking the app to a single rendering library.

## Decision
- Introduce a `RenderBackend` interface that encapsulates rendering.
- Provide two implementations:
  - `Canvas2DBackend` (baseline/fallback)
  - `WebGL2Backend` based on PixiJS for 2D batching, textures, masks, and post-processing.
- Do not switch to three.js now. Re-evaluate if we introduce 3D camera/lighting/extrusions.
- Move rendering to a Worker using `OffscreenCanvas` where supported.
- Treat the paper layer as a shader-based post-process in the GPU backend.

## Rationale
- Abstraction preserves optionality: we can swap/upgrade backends (regl, three.js, WebGPU) without rewiring UI.
- PixiJS is purpose-built for 2D GPU pipelines (instancing, filters) and fits our needs today.
- Worker + OffscreenCanvas keeps React/UI responsive, directly improving INP.

## Consequences
- New boundary to maintain; initial integration effort.
- Two code paths (Canvas2D vs WebGL2) to keep coherent; mitigated by shared scene graph/diff protocol.
- Some features (filters/text) require different code in CPU vs GPU; abstract at the backend level.

## Alternatives Considered
- Three.js now: heavier for 2D, adds cognitive load without immediate benefit.
- Stay on Canvas2D only: limited scaling and CPU bottlenecks remain.
- Jump to WebGPU: premature; uneven support and higher complexity.

## Validation
- Spike to render 10k tiles with paper composite at 60fps on mid-tier hardware.
- Measure INP before/after; target p75 < 200ms during active editing.

## Follow-ups
- Define `RenderBackend` TypeScript interface and scene graph data model.
- Implement minimal PixiJS backend with layer FBOs and post-process shader for paper.
- Integrate Worker + command queue; add perf telemetry.
