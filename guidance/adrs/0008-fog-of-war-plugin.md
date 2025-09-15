Status: Draft
Last Updated: 2025-09-03
title: Fog-of-War as Plugin (Layer + Tools)
deciders: Core Orchestrator, Plugin Architect, Rendering Lead, UX Lead

## Context

Users want a play-facing experience where the GM can reveal portions of a hex map during a session. Implementing Fog-of-War as a plugin preserves core simplicity, leverages ADR-0002 (plugin architecture), ADR-0003 (map defaults), ADR-0006 (UI modes), and ADR-0007 (hex geometry).

## Decision

1. Layer Type: `fogOfWar`

- State:
  - `revealed: Set<string /* 'q,r' axial */>`
  - `color: string` (default black)
  - `opacity: number` (0..1, default 0.75)
  - `blendMode?: CanvasCompositing` (optional)
  - `persist: boolean` (default true)
- Rendering: Draw dark overlay for unrevealed hexes; revealed set punches holes. Deterministic with z-order; defaults to top.

2. Tools

- `fog.reveal` with kernels: circle(radius), cone(radius, spread60s), lobe presets (e.g., 2–3 adjacent cones).
- `fog.hide` symmetric operation (optional for MVP).
- Tools target active map’s `fogOfWar` layer; degrade if missing.

3. Commands

- `fog.reset`, `fog.revealAt({q,r}, shape)`, `fog.hideAt({q,r}, shape)`.
- Use `app.mode.present.toggle` (ADR-0006) for UI Mode toggle but keep mode logic in host.

4. Persistence & Undo

- Persist `fogOfWar` state within map’s layers with plugin-controlled (de)serialization.
- Journal actions per ADR-0004 for undo/redo of reveal/hide operations.

## Rationale

- Keeps core engine generic (no special mask behavior), leveraging plugin rendering and standardized hex utilities.
- Aligns with platform extensibility; fog is optional and reorderable.

## Consequences

- Scene Tree shows `fogOfWar` as a normal layer with visibility/lock; default placed on top.
- Performance requires batching updates (kernel application) and redrawing dirty regions only.
- Minimal UI required: shapes, radius, direction in a compact control (can be toolbar or properties panel).

## Validation

- E2E: In Present Mode, clicking a hex reveals per selected shape/direction and persists after save/load.
- Unit: Kernel selection and set operations on `revealed` produce expected results.
- Integration: Z-order respected; visibility toggle hides effect.

## Follow-ups

- Explore advanced FOV/shadows; consider continuous angles and occluders as a separate plugin.
- Consider export/import of fog state for publishing or session continuity.
