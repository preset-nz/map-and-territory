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

## Interfaces & Contracts (MVP)

- Types (`src/plugin/types.ts`):
  - Define `CapabilityToken` union: `'hasActiveMap' | 'hasActiveLayer' | 'hasCampaign' | 'hasProject' | selectionIs:<kind> | canAddLayer:<typeId>`.
  - Toolbar item: `enableWhen?: CapabilityToken[]`, `disabledReason?: string`.
  - Manifest example:
    - `contributes.toolbar = [{ group: 'scene', items: [{ type: 'button', command: 'layer.hexnoise.add', icon: 'lucide:layers', label: 'Hex Noise', order: 2, enableWhen: ['hasActiveMap'], disabledReason: 'Select a map to add a layer' }]}]`.

- Loader (`src/plugin/loader.ts`):
  - Keep contributions data structure; store `enableWhen` and `disabledReason` as provided.
  - Emit `plugin:toolbar-updated` on load/unload unchanged.

- Toolbar (`src/components/layout/app-toolbar.tsx`):
  - Remove command-specific checks; evaluate `enableWhen` tokens via `resolvePreconditions`.
  - Compute `disabled` and `tooltip` (use `disabledReason` or registry-provided reason).
  - Preserve grouping and sorting; no other behavior changes.

## Data/State Changes

- No persistent schema changes. New runtime-only capability registry. Types extended for toolbar items.

## Testing Strategy

- Unit:
  - Sorting remains deterministic (group → order → label/command).
  - Loader retains contributions and surfaces `enableWhen`.
  - Capability registry resolves `hasActiveMap` correctly.
- Integration (React):
  - Toolbar renders items from contributions; disabled toggles with active map.
  - Tooltip shows disabled reason when present.
- E2E (baseline):
  - With no active map, "Add Hex Noise" disabled with reason; enabled after creating/selecting a map.
  - When `hexnoise` at max instances, button disabled with policy reason.

## Impact/Risks

- Perf: minimal; evaluation is O(items) per render with simple predicates.
- DX/UX: clearer contract; consistent tooltips for unmet preconditions.
- ADR links: ADR-0002 (Plugin Architecture), ADR-0006 (Toolbar Structure Policy).

## Notes on Command Execution vs. Capabilities

- UI capability checks are host-evaluated; plugins do not need a scene object for gating.
- Command execution remains plugin-implemented for now (see `src/plugin/builtin/hex-noise.ts`) and can use store APIs (`useProjectStore`, `useSelectionStore`).
- Follow-up (T-004/TBD): provide `PluginContext.scene` with a narrow host API for map/layer mutations to reduce direct store coupling.
