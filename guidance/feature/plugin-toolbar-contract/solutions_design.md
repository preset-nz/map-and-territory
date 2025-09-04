---
ticket: T-002
feature: Plugin Toolbar Contract
author: leaddev@countasone
date: 2025-09-04
level: 2
---

## Overview & Assumptions

- Goal: toolbar UI renders entirely from plugin contributions; host applies capability gating.
- Assume existing command registration via `registerCommand()` remains the execution path.
- Avoid exposing host state shape to plugins; use named capability tokens resolved by the host.

## Interfaces & Contracts

- Types (`src/plugin/types.ts`):
  - Extend toolbar item with `preconditions?: string[]` and `label?: string`, `order?: number` (order already present), `icon?: string`.
  - Manifest example:
    - `contributes.toolbar = [{ group: "layers", items: [{ type: "button", command: "layer.hexnoise.add", icon: "layers", label: "Add Hex Noise", order: 10, preconditions: ["hasActiveMap"] }]}]`.

- Capability Registry (host-only):
  - New module `src/plugin/capabilities.ts` exports `resolvePreconditions(tokens: string[]): { enabled: boolean; reason?: string }`.
  - Built-in tokens (MVP): `hasActiveMap`, `hasProject`, `canSave`.
  - Each token maps to a predicate over stores (e.g., `useProjectStore`).

- Loader (`src/plugin/loader.ts`):
  - Keep contributions data structure; store `preconditions` as provided.
  - Emit `plugin:toolbar-updated` on load/unload unchanged.

- Toolbar (`src/components/layout/app-toolbar.tsx`):
  - Replace command-specific checks with generic capability evaluation via `resolvePreconditions`.
  - Compute `disabled` and `tooltip` reason per item based on `preconditions`.
  - Preserve existing grouping and sorting behavior; remove special casing.

## Data/State Changes

- No persistent schema changes. New runtime-only capability registry. Types extended for toolbar items.

## Testing Strategy

- Unit:
  - Capability registry resolves tokens correctly given mocked store state.
  - Sorting is deterministic across groups and items (order → label/command).
  - Loader retains contributions and surfaces `preconditions` unchanged.
- Integration (React):
  - Toolbar renders items from contributions; disabled state toggles when store state changes.
  - Tooltip reason text reflects unmet capability (e.g., `hasActiveMap`).
- E2E (baseline):
  - With no active map, "Add Hex Noise" button appears disabled with reason; enabled after selecting/creating a map.

## Impact/Risks

- Perf: minimal; evaluation is O(items) per render with simple predicates.
- DX/UX: clearer contract; consistent tooltips for unmet preconditions.
- ADR links: ADR-0002 (Plugin Architecture), ADR-0006 (Toolbar Structure Policy).
