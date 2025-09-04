---
ticket: T-002
feature: Plugin Toolbar Contract
author: prodcoord@countasone
date: 2025-09-04
level: 2
---

## Milestones & Gates

- M1: Types + registry in place; unit tests green.
- M2: Toolbar refactor complete; integration tests green.
- M3: E2E probe added; CI green; docs linked.

## Tasks

- [ ] Extend types: add `preconditions?: string[]` to toolbar item (owner: @dev, est: 1h, deps: none)
- [ ] Add capability registry `src/plugin/capabilities.ts` with `hasActiveMap` (owner: @dev, est: 2h, deps: stores)
- [ ] Update loader to retain `preconditions` (owner: @dev, est: 1h, deps: types)
- [ ] Refactor `AppToolbar` to evaluate `preconditions` generically; remove special casing (owner: @dev, est: 2h, deps: registry)
- [ ] Unit tests: sorting, registry predicates (owner: @qa-dev, est: 2h, deps: types)
- [ ] Integration tests: disabled/enabled toggle via store changes (owner: @qa-dev, est: 3h, deps: toolbar)
- [ ] E2E: toolbar enablement probe for hex noise add (owner: @qa, est: 2h, deps: M2)
- [ ] Docs: update ADR-0002 references; add brief to `guidance/process/implementation_standards.md` (owner: @doc, est: 1h)

## Validation Hooks

- `pnpm test` covers unit/integration; `pnpm test:e2e` adds enablement probe.
- Mapping: sorting → unit; enablement → integration; end-to-end toggle → e2e.

## Rollback / Flag

Removed per product direction (greenfield, no rollback path needed). Make it right.
