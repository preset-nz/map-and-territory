---
ticket: T-017
feature: layer-naming
owner: product-owner
date: 2025-09-04
level: 1
---

## Problem & Value

- New layers all default to the same label (e.g., "Hex Noise"), making scenes ambiguous.
- Rename is available for Campaign/Map in Properties but not for selected Layer → inconsistency.
- Clear names improve selection, duplication, and E2E assertions.

## In Scope

- Default numbered names on insert: "<Layer Title> <nn>" (zero‑padded, width 2).
- Add a Name field for the selected layer in Properties; edits call `renameLayer`.
- Duplicate keeps " Copy" suffix and does not renumber others.

## Out of Scope

- Scene panel inline rename (may follow later).
- Global rename patterns or localization.

## Acceptance Criteria

- [ ] First Hex Noise insert → "Hex Noise 01"; second → "Hex Noise 02" (per map, per type).
- [ ] Properties panel shows a Name input when a layer is selected; typing updates the layer name live.
- [ ] Duplicating "Hex Noise 02" yields "Hex Noise 02 Copy".
- [ ] Numbering skips existing names; inserting after rename to "Hex Noise Alps" still produces the next numeric suffix.

## Risks & Assumptions

- Assumes store insertion helpers accept an optional default name; numbering done in store for single source of truth.
- Two‑digit padding is sufficient for MVP; can generalize later if needed.
