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

- [x] Extend types: add `CapabilityToken` union and `enableWhen?: CapabilityToken[]`, `disabledReason?` (owner: @dev, est: 1h) ✅ Complete - comprehensive token types added
- [x] Add registry: `src/plugin/capabilities.ts` with `resolvePreconditions()` implementing `hasActiveMap` (owner: @dev, est: 1h) ✅ Complete - registry implemented with all major tokens
- [x] Update loader to retain `enableWhen` and `disabledReason` (owner: @dev, est: 0.5h) ✅ Complete - loader passes through capability fields
- [x] Refactor `AppToolbar` to evaluate tokens via registry; remove command-specific checks (owner: @dev, est: 1h) ✅ Complete - hardcoded checks removed, uses registry
- [x] Unit test: registry `hasActiveMap` and loader pass-through (owner: @qa-dev, est: 1h) ✅ Complete - basic capability test added
- [ ] Integration/E2E: toolbar enablement probe for hex noise add (owner: @qa, est: 1h) ⚠️ Incomplete - E2E tests pass but specific toolbar tests missing
- [x] Docs: example usage in built-in hex-noise plugin (owner: @doc, est: 0.5h) ✅ Complete - hex-noise updated with enableWhen example

## Validation Hooks

- `pnpm test` covers unit/integration; `pnpm test:e2e` adds enablement probe.
- Mapping: sorting → unit; enablement → integration; end-to-end toggle → e2e.

## Rollback / Flag

No rollback path needed.
