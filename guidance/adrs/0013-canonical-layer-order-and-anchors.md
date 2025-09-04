---
title: Canonical Layer Order and Anchors
status: Accepted
date: 2025-09-04
deciders: Platform Lead, Rendering Lead
supersedes: 0003-map-default-creation-policy (ordering clause)
---

## Context

Layer rendering and the scene panel must express one canonical order to avoid ambiguity. Early guidance allowed free reordering of all layers, including `paper` and `hexgrid` (ADR‑0003). As rendering and plugins matured, we need deterministic anchors and insertion rules to keep UX, store, and renderers consistent.

Related: ADR‑0007 (layer rendering pipeline and masking).

## Decision

- Array order is the single source of truth for z‑order.
- Anchors:
  - Bottom anchor: `paper` (background) at index 0.
  - Top anchor: `hexgrid` (overlay) at last index.
- Other layers must be strictly between anchors.

### Store Semantics

- Insert (no selection): insert just below top anchor (`hexgrid`).
- Insert (with selection): insert immediately above the selected layer.
- Duplicate: insert duplicated layer immediately above its source.
- Move: anchors (`paper`, `hexgrid`) cannot be moved; non‑anchors are clamped to `[paper+1, grid-1]`.
- Normalization: on map load/creation, ensure anchors exist and are positioned at extremes.

### Rendering Contract

- The host traverses `map.layers` in array order from bottom → top.
- Adapters render when invoked; backends must not reorder.
- `paper` color/aspect are read from the `paper` layer state (fallback to legacy map field during transition).

### UI Contract

- Scene panel top of list = top of render (reverse of array).
- Add button disabled with no active map. When grid is selected, Add inserts just below grid.

## Consequences

- Predictable insertion and duplication; consistent across store, UI, and render.
- Plugins can rely on stable anchors; selection‑based insertion is deterministic.
- ADR‑0003’s statement that all layers are freely reorderable is superseded by this policy.

## Migration

- On load, normalize existing maps: move any stray anchors to their canonical positions; add missing anchors with defaults.
- Keep a short note in release docs; no schema change beyond order normalization.

## Alternatives Considered

- No anchors (fully free order): rejected as it complicates UX and renderer invariants.
- Renderer special‑casing (e.g., always draw grid last regardless of order): rejected; hides inconsistencies and breaks mental model.

## References

- Ticket: T‑001 Layering Model Foundation (Order + Semantics).
- Solution design: guidance/feature/layering-model-foundation/planning/solutions_design.md.
- ADR‑0007 Layer Rendering Pipeline and Masking.
