---
ticket: T-002
feature: Plugin Toolbar Contract
owner: product@countasone (PO)
date: 2025-09-04
level: 2
---

## Problem & Value

- Hardcoded toolbar buttons block extensibility and violate platform goals in ADR-0002.
- Plugins must contribute tools declaratively with predictable grouping/ordering.
- Host must handle enablement (disabled + reason) via capability checks for clear UX.

## In Scope (MVP)

- Contract for plugin-contributed toolbar items (group, order, icon, label, command).
- Lightweight capability registry with tokenized enablement: `enableWhen: CapabilityToken[]`.
  - Implemented tokens now: `hasActiveMap`, `hasProject`/`hasCampaign`, `hasActiveLayer`, `selectionIs:<kind>`.
  - Unknown tokens are ignored (treated as enabled) to preserve forward compatibility.
- Deterministic render order (group → order → label/command) and stable updates.
- Remove any command-specific gating from the toolbar (no hardcoded command ids).

## Out of Scope

- New visual design of toolbar; icons and spacing remain as-is.
- Complex condition language or arbitrary code execution in plugins.
- Command palette or keyboard shortcut registration beyond existing manifest `commands`.

## Acceptance Criteria

- [ ] Toolbar renders solely from contributions; groups and items sort deterministically.
- [ ] Gating uses tokenized `enableWhen` evaluated by the host registry (at least `hasActiveMap`).
- [ ] Disabled state shows `disabledReason` from manifest or a host default.
- [ ] No command-specific checks remain in `app-toolbar.tsx`.
- [ ] Hex Noise button is disabled without an active map; enabled after creating one (E2E passes).
- [ ] Contract documented in types and examples updated in built-in plugins.

## Risks & Assumptions

- Keep API narrow; MVP supports only `activeMap`. Broaden later with a capability registry.
- Backward compatibility: items without `enableWhen` remain enabled.
- UX: provide a sensible default disabled text when `disabledReason` is absent.
