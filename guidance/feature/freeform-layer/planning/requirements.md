---
ticket: T-017
feature: Freeform Layer (Hex Paint)
owner: @product-owner
date: 2025-09-09
level: 2
status: Draft
---

## Problem & Value

- Authors want to hand-paint specific hexes (not procedurally generated) to fine-tune terrain and highlights.
- Provide a simple, predictable “paint/erase” workflow that reuses the existing hexgrid for coordinates and palette for colors.
- Establish a reusable layer type that future tools (brush radius, flood fill) can extend without breaking the model.

## In Scope

- New content layer type “Freeform Layer” for per-hex fills, rendered under the grid.
- Tooling: `paint` and `erase` tools act on the selected Freeform layer only.
- Multiple terrain types per layer: allowed. The Properties “Terrain” selector sets the current brush (per‑cell choice is stored on each painted hex).
- Color source: pick from current map/campaign palette (via `terrainId`) with an optional direct color override (override wins if set).
- Pointer→hex routing based on existing AppAPI hex helpers; single-hex brush MVP.
- Toolbar/shortcuts: enable `paint`/`erase` via toolbar buttons and `2`/`4` keys.
- Properties: minimal schema for brush color (terrain selection or color override), opacity.

## Out of Scope

- Multi-hex radius brushes, flood fill, or shape tools (future tickets).
- Undo/redo stack and history UI (tracked separately).
- Persistence/export beyond existing project save (no new storage backend).

## Acceptance Criteria

- [ ] Add Freeform layer via toolbar/command; inserted below grid per canonical policy.
- [ ] With Freeform layer selected and `paint` tool active, dragging colors hexes under the pointer using current brush color.
- [ ] `erase` tool removes painted cells for hexes under the pointer.
- [ ] Rendering respects hexgrid size/orientation; grid remains on top; paper remains at bottom.
- [ ] Properties panel lets the user choose a terrain entry (palette-driven) and optional color override; opacity is respected.
- [ ] A single Freeform layer can contain multiple terrain types/colors (mix within the same layer); palette changes re-color cells painted via terrainId; cells with explicit color remain unchanged.
- [ ] Keyboard shortcuts: `2` selects paint, `4` selects erase; UI reflects active tool.
- [ ] Unit, integration, and E2E tests cover state updates, invalidation, and basic painting flow.

## Risks & Assumptions

- Assumes hexgrid layer exists and is visible to derive size/orientation; if absent, painting is disabled with a clear reason.
- Sparse storage keyed by axial coordinates must remain performant for typical map sizes; plan for chunking if needed later.
- Palette changes must re-color painted cells deterministically when using `terrainId` (do not bake palette into state unless overridden).
- Rendering/backing store should not block future brush radius/fill tools (design for optionality per Platform‑First MVP).
- Hex utilities will be centralized in a small shared module to avoid duplication and prepare for additional hex layer types.

References: process/implementation_standards.md, process/testing_standards.md, adrs/0002-plugin-architecture.md, adrs/0013-canonical-layer-order-and-anchors.md.
