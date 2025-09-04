---
title: Layer Rendering Pipeline with Paper Mask and Camera Transform
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, Rendering Engineer, UX Lead
amended-by: 0013-canonical-layer-order-and-anchors
---

## Context

- We are introducing a layer system with built-in layers (paper, hexgrid) and plugin-extensible layer types.
- We need a predictable rendering contract that keeps the "paper" as the framing element while allowing other layers to pan/zoom within it.
- ADR-0006 (UI modes present/edit) defines that edit mode respects paper size; present mode can go fullscreen later.

## Decision

1. Paper as Frame (Screen Space)

- Compute a `paperRect` from the selected aspect ratio and viewport size (top-aligned with whitespace).
- Draw the paper fill in screen space; not affected by camera transforms.

2. Masking via Clip

- Clip all non-paper layer rendering to `paperRect` using a single host-managed clip region.
- Layers do not manage their own clipping.

3. Camera Transform (Edit Mode)

- After clipping, translate to `paperRect.topLeft` and apply camera (pan/zoom).
- Non-paper layers render in this transformed space; paper remains fixed.

4. Plugin-Friendly Adapters

- `LayerAdapter.drawMain(ctx, state, env)` receives a `RenderEnv` with:
  - `size`: paperRect size (w,h)
  - `paperRect`: x,y,w,h
  - `camera`: x,y,zoom (for future interaction)
  - `pixelRatio`, `zoom` (current scale)
- Layers draw as if (0,0) is the top-left of the paper; the host applies transforms and clip.

5. Policies & Registry

- Core types `paper` and `hexgrid` are registered with policies: `canDelete=false`, `canDuplicate=false`, `maxInstances=1`.
- Other layer types (e.g., terrain) follow default permissive policies unless specified.

## Rationale

- Predictability: Centralized clip+transform keeps adapters simple and composable.
- UX consistency: Paper acts as a stable frame; content pan/zoom remains intuitive.
- Extensibility: Plugins target a stable adapter API without screen-space concerns.
- Performance: Single clip and transform per frame; minimal per-layer overhead.

## Consequences

- Host renderer owns layout math (aspect, margins) and camera state.
- Hit-testing will mirror the same transforms; adapters can remain local-coordinate based.
- Present mode later can disable the clip and scale paper to fullscreen without breaking adapter contracts.

## Ordering & Anchors

- Rendering order follows the array order from bottom → top. See ADR‑0013 for canonical anchors (`paper` bottom, `hexgrid` top) and insertion/move semantics. Backends must not reorder layers.

## Alternatives Considered

- Per-layer clipping: rejected as repetitive and error-prone.
- Paper as a regular layer: rejected for UX (paper should not pan/zoom) and complexity. Note: paper state (aspect/color) is owned by the `paper` layer for consistency, but the paper fill remains a host‑drawn element in screen space (not a transformed adapter render).
- Fixed canvas-to-paper mapping: rejected; we want zoom/pan for non-paper layers.

## Validation

- Implemented `CanvasViewport` with paperRect computation and clip.
- Hexgrid adapter renders inside the paper frame; behavior matches expectations.
- Store seeds base layers (paper, hexgrid) with non-deletable, single-instance policies.

## Follow-ups

- Add camera interactions (wheel zoom, drag pan) in edit mode.
- Move map-level paper properties fully into the paper layer once the pipeline is complete. (Done in ADR‑0013: host derives paper properties from the `paper` layer state with legacy fallback.)
- Document hit-testing transform contract for tool adapters.
