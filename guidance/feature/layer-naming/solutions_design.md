---
ticket: T-017
feature: layer-naming
author: lead-developer
date: 2025-09-04
level: 1
---

## Overview & Assumptions

- Implement default numbering in `useProjectStore` at insertion points to keep logic centralized.
- Expose Name field in Properties when selection.kind === 'layer', wiring to `renameLayer`.

## Interfaces & Contracts

- Store: augment `addLayer`, `insertLayerBeforeTopAnchor`, and `insertLayerAbove` to compute `name` when omitted.
- Numbering rule per map, per layer type: scan existing names with prefix `<title> ` and 2‑digit suffix.

## Data/State Changes

- None to schema. Name remains `string` on `LayerInstance`.

## Testing Strategy

- Unit: pure helper that computes next name given a list of existing names.
- E2E: create two Hex Noise layers → assert "01", "02"; rename via Properties; duplicate → "Copy" suffix.

## Impact/Risks

- Minimal perf impact (small arrays). Avoids UI‑only numbering to keep invariants.
