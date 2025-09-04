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

## In Scope

- Contract for plugin-contributed toolbar items (groups, order, icon, label, command).
- Capability-based enablement: disabled state with tooltip reason when preconditions fail.
- Deterministic render order (group, then order, then label/command) and stable updates.
- Remove remaining hardcoded tool buttons from the app toolbar.

## Out of Scope

- New visual design of toolbar; icons and spacing remain as-is.
- Complex condition language or arbitrary code execution in plugins.
- Command palette or keyboard shortcut registration beyond existing manifest `commands`.

## Acceptance Criteria

- [ ] No hardcoded tool buttons remain in `src/components/layout/app-toolbar.tsx`.
- [ ] Plugins render solely from contributions; groups and items sort deterministically.
- [ ] Capability checks drive `disabled` with tooltip reason when unmet (e.g., "Select a map to add a layer").
- [ ] Contract documented and linked from ADR-0002 and 0006; examples provided.
- [ ] Unit + integration tests cover ordering and enablement; E2E probes enable/disable states.

## Risks & Assumptions

- Keep plugin API narrow to avoid leaking host state shape; use named capability tokens.
- Backward compatibility: existing plugins without preconditions still work (default enabled).
- UX risk if reasons are inconsistent; provide host-side defaults for common tokens.
