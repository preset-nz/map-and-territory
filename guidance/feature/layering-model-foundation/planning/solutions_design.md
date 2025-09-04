# Layering Model Foundation — Solutions Design

Status: Draft  
Last updated: 2025-09-04  
Owner: @lead-developer  
Related ticket: T-001 (guidance/tickets.md)

## Summary

Establish a canonical layer ordering and consistent insertion/duplication semantics across store, UI, and renderers. Align scene panel ordering with render order and formalize anchors for background (paper) and overlay (grid).

## Goals

- Canonical z-order policy adopted across data model, UI, and rendering.
- Deterministic insertion and duplication behavior.
- Scene panel conveys and preserves stack order.
- Tests validate ordering and insertion semantics.

## Non-Goals

- Comprehensive theming work, palette injection, or camera features.
- Invalidation API changes (covered by T-003).

## Canonical Ordering Policy

- Array order is the source of truth for stacking.
- Interpretation: `layers[0]` is bottom-most; `layers[layers.length - 1]` is top-most.
- Anchors:
  - Bottom anchor: `paper` (background)
  - Top anchor: `grid` (overlay)
- Other layers must exist strictly between anchors.

### Rendering Rule

- Render in array order from bottom → top. The last drawn (top-most) layer must be the grid overlay.
- No renderer may reorder layers ad-hoc; adapters render when invoked by host in order.

## Insertion & Duplication Semantics

- Add — no selection: insert just below the top anchor (`grid`).
- Add — with selection: insert immediately above the selected layer.
- Duplicate: insert duplicated layer immediately above its source.
- Constraints: cannot insert above the top anchor or below the bottom anchor. Moves crossing anchors are disallowed.

## UI Behavior

- Scene panel order matches render: top of list = top of render.
- Add button disabled when no map is selected.
- When a layer is selected, Add inserts above selection; Duplicate inserts above source.
- Provide minimal z-order cues (e.g., arrows or badges) to reinforce ordering.

## Data Model & Store API

- Data: `Map.layers: Layer[]` with `Layer.type` identifying anchors (`'paper' | 'grid' | ...`).
- Normalization: on map load/creation, ensure anchors are present and positioned at extremes.
- Store functions (proposed or clarified):
  - `insertLayerAbove(targetId: LayerId, newLayer: Layer): void`
  - `insertLayerBeforeTopAnchor(newLayer: Layer): void` // before `'grid'`
  - `duplicateLayerAbove(sourceId: LayerId): LayerId`
  - `moveLayer(fromIndex: number, toIndex: number): void` (guard against crossing anchors)
  - `getTopAnchorIndex(): number` and `getBottomAnchorIndex(): number`

Guard rails: All mutators must preserve anchor positions; throw or no-op on invalid requests.

## Rendering Host Updates

- Host traverses `map.layers` in order and delegates to adapters; no internal reordering.
- Verify `grid` layer renders last; if host currently draws grid separately, ensure that behavior is equivalent to top anchor semantics.

## Migration & Compatibility

- On first load, normalize existing maps:
  - Ensure `paper` is at index 0; `grid` is at last index.
  - Move any stray anchors to their canonical positions.
- Document normalization in a short note; no persistent schema change needed beyond layer order.

## Testing Strategy

Unit (store):

- insert without selection → index = `getTopAnchorIndex()`
- insert above selection → new index = `selectedIndex + 1`
- duplicate above source → new index = `sourceIndex + 1`
- moveLayer respects anchors (cannot cross top/bottom anchors)

Integration (UI + store):

- Scene panel displays layers top-to-bottom matching array reversal.
- Add disabled with no selected map; enabled with selected map/layer.
- Add above selection and duplicate above source reflect in UI order.

Rendering verification:

- Render order follows array sequence; `paper` drawn first, `grid` last.
- If practical, assert draw-call order via a test adapter or log capture.

E2E (Playwright):

- Toolbar Add disabled without active map; enabled when a map is selected.
- Create layer → appears below grid; Duplicate → appears above source.
- Reorder controls do not allow moving across anchors.

## Acceptance Criteria

- Canonical ordering documented and enforced; anchors at extremes.
- Add/Duplicate semantics implemented and tested.
- Scene panel order matches render order.
- Unit + integration + representative E2E added and green in CI.

## Risks & Open Questions

- Plugins adding custom anchors: out of scope; must remain between current anchors.
- Multi-map contexts: confirm active map selection is required for layer operations.
- Existing rendering paths that special-case grid: ensure consistency after adopting canonical order.

## Work Breakdown (hand-off)

1. Store layer semantics: insert/duplicate/move guards + normalization.
2. Scene panel: ordering, disable rules, minimal cues.
3. Rendering host: verify traversal and anchor draw order.
4. Tests: unit (store), integration (UI/store), E2E basics.

References

- src/stores/project/index.ts (layer operations)
- src/components/layout/app-sidebar.tsx (scene panel)
- src/components/layout/app-toolbar.tsx (toolbar add/duplicate)
- src/render/backends/canvas2d.ts (draw order)
- guidance/tickets.md → T-001
