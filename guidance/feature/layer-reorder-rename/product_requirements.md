---
ticket: T-008
feature: Layer Reorder + Rename
owner: @product
date: 2025-09-09
level: 2
---

## Problem & Value

- Users need to control visual stacking and naming to keep complex scenes understandable.
- Reordering must respect canonical anchors (paper bottom, hex grid top) to preserve mental model and rendering invariants.
- Inline rename reduces friction versus modal dialogs and encourages tidy, meaningful layer names.

## In Scope

- Reorder layers within a map via drag‑and‑drop in the scene panel.
- Persisted order in the project store; reflected in render order.
- Respect anchor rules from ADR‑0013: cannot move `paper` or `hexgrid`; non‑anchors clamped between anchors.

## Out of Scope

- Multi‑select and bulk reorder.
- Cross‑map moves or layer grouping.
- Inline rename in the scene panel (defer); keep rename in Properties panel consistent with campaign/map rename.
- Save/Load UI (covered by T‑015); this feature only ensures store persistence now.

## Acceptance Criteria

- [ ] Given a map with multiple non‑anchor layers, when the user drags a layer row and drops it between others, then its z‑order updates accordingly and remains clamped between anchors; anchors cannot be dragged.
- [ ] Given a reordered layer, when a redraw occurs, then the canvas render order matches the store array order (top of list = top of render).
- [ ] Unit/integration tests cover drag‑reorder semantics (anchors, clamping, reversed list index math).

## Risks & Assumptions

- Assumes `useProjectStore.moveLayer` provides canonical semantics (anchors, clamping) per ADR‑0013; UI must not bypass these.
- UX note: implement HTML5 drag‑and‑drop with sensible keyboard fallback later if needed; start with pointer interactions only to keep scope bounded.
- Rendering contract relies on array order (reference: render pipeline guidance). Any deviation would break acceptance.
