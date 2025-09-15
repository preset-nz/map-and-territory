Status: Draft
Last Updated: 2025-09-03

# Fog-of-War Plugin – Requirements

## Summary

Provide a plugin that renders a fog layer on hex maps and allows revealing areas by clicking on hexes in Present Mode. Support directional cones and lobe-shaped reveals.

## User Stories

- As a GM, I toggle Present Mode to show only the map to players.
- As a GM, I click a hex to reveal surrounding area with a chosen shape and radius.
- As a GM, I can reset or hide/reveal areas as needed during play.
- As a creator, my fog state persists with the map and supports undo/redo.

## Acceptance Criteria

- Toggling Present Mode hides non-canvas chrome and focuses interaction on the canvas.
- Clicking on a hex reveals per selected shape (circle, cone with direction, lobe presets).
- Fog state persists across save/load; undo/redo works for reveal/hide.
- Fog layer behaves like any other layer in Scene Tree (visibility, lock, reorder).

## Scope & Non-Goals

- In-scope: hex-based reveal/hide, basic shape presets, minimal UI for tool options.
- Out-of-scope (MVP): occlusion/obstacle-based FOV, continuous-angle cones, multiplayer sync.

## Dependencies

- ADR-0006 UI Modes (Present/Edit)
- ADR-0007 AppAPI Hex Geometry & Hit-Test
- ADR-0008 Fog-of-War as Plugin
