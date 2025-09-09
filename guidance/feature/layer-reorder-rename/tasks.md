---
ticket: T-008
feature: Layer Reorder + Rename
author: @pm
date: 2025-09-09
level: 2
---

## Milestones & Gates

- M1: Drag‑and‑drop reordering wired to store — Gate: design review + unit/integration tests green.
- M2: Accessibility labels and edge‑case polish — Gate: a11y pass (drag handles, roles, keyboard fallback TBD).

## Tasks

- [ ] Implement drag‑and‑drop reordering for layer rows in `src/components/layout/app-sidebar.tsx` using dnd‑kit (`@dnd-kit/core`, `@dnd-kit/sortable`) (owner: @ui, est: 6h, deps: ADR‑0013)
- [ ] Convert drag hover position to target array index (reversed list) and call `useProjectStore().moveLayer` on drop (owner: @ui, est: 2h)
- [ ] Prevent drag on anchors; add drag handle affordance and hover/active styles (owner: @ui, est: 1h)
- [ ] Keep rename in Properties panel only; no inline rename work (owner: @ui, est: 0h)
- [ ] Unit tests for store interactions (extend existing ordering tests as needed) (owner: @test, est: 2h)
- [ ] Component tests for drag‑reorder interactions in `AppSidebar` (owner: @test, est: 4h)
- [ ] Update guidance cross‑links if file paths or semantics shift (owner: @docs, est: 1h)

## Validation Hooks

- `pnpm test` validates ordering and rename store behavior and sidebar interactions.
- Key specs to (extend/add):
  - `src/test/layer-ordering-store.test.ts` — anchor clamp and relative moves
  - `src/test/components/app-sidebar.layer-reorder-dnd.test.tsx` (new) — DnD UI wiring

## Rollback / Flag

- If DnD proves too brittle, fall back to Up/Down controls without changing store semantics.
