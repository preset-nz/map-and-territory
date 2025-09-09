---
ticket: T-008
feature: Layer Reorder + Rename
author: @architect
date: 2025-09-09
level: 2
---

## Overview & Assumptions

- UI uses drag‑and‑drop on layer rows to change order. No inline rename; rename remains in the Properties panel consistent with campaign/map.
- The store is the single source of truth for ordering. We call `useProjectStore().moveLayer` only.
- Anchors per ADR‑0013: `paper` fixed at index 0, `hexgrid` fixed at last index; other layers must remain between them.
- Scene panel shows top of render at the top of the list by reversing the underlying array; index math must account for this.

## Interfaces & Contracts

- Store API (existing):
  - `moveLayer(layerId: string, toIndex: number): void` — clamps within anchors; ignores anchor moves.
- UI contract (dnd‑kit):
  - Use `@dnd-kit/core` + `@dnd-kit/sortable` with `verticalListSortingStrategy`.
  - Top of list = top of render. Sortable items include only non‑anchor layers, ordered by the reversed list (UI order).
  - On `onDragEnd`, translate `over`’s UI index to the target array index, then call `moveLayer`.
  - Drag handles only on non‑anchor rows; anchors render as static rows.
- References:
  - ADR: `guidance/adrs/0013-canonical-layer-order-and-anchors.md`.
  - Render pipeline: `guidance/reference/render_pipeline.md` (array order = render order).

## Data/State Changes

- No schema changes. Operate on `Project.current.maps[].layers: LayerInstance[]`.
- Persist through in‑memory store; round‑trip via T‑015 will serialize `layers` order.

## UI Behavior Details

- DnD model (dnd‑kit):
  - Wrap the list in `DndContext` + `SortableContext`.
  - Use `PointerSensor` and `closestCenter`; strategy: `verticalListSortingStrategy`.
  - Items: IDs of non‑anchor layers in reversed UI order.
  - On drop: if `active.id !== over?.id`, compute target array index from `over` UI index and invoke `moveLayer`.
  - Accessibility: keep pointer interaction for now; consider `KeyboardSensor` follow‑up.

## Testing Strategy

- Unit:
  - Existing `moveLayer` anchor clamp tests already cover semantics (extend as needed for boundary cases).
- Integration (React component):
  - Mount `AppSidebar` with a seeded project; simulate drag start/over/drop events to reorder and assert layer order in store changes as expected for reversed UI.
- E2E probe (extend in T‑014):
  - Basic flow: insert two layers, drag one above the other, confirm order changes; rename remains via Properties panel unchanged.

## Impact/Risks

- Perf: trivial; list length is small, operations are O(n) on a small array.
- DX/UX: HTML5 DnD nuances across browsers; test Chrome first (Playwright), add small shims if needed.
- ADR links: ADR‑0013 (anchors), render pipeline reference.
