---
ticket: T-019
feature: Core Action Plugin Split
author: production-coordinator
date: 2025-09-10
level: 2
---

## Milestones & Gates

- **M1**: `campaign` plugin created and functional.
- **M2**: `map` plugin created and functional.
- **M3**: `core-actions` plugin removed and all tests passing.

## Tasks

- [ ] Create `src/plugin/builtin/campaign.ts` with the manifest and module structure. (owner: @dev, est: 1h)
- [ ] Move the `campaign.new` command definition, handler, and toolbar contribution from `core-actions.ts` to `campaign.ts`. (owner: @dev, est: 0.5h, deps: previous task)
- [ ] Create `src/plugin/builtin/map.ts` with the manifest and module structure. (owner: @dev, est: 1h)
- [ ] Move the `map.new` and `map.delete` command definitions, handlers, and toolbar contributions from `core-actions.ts` to `map.ts`. (owner: @dev, est: 0.5h, deps: previous task)
- [ ] Update the plugin registry in `src/plugin/builtin/index.ts` to load the new `campaign` and `map` plugins, removing the `core-actions` plugin. (owner: @dev, est: 0.5h, deps: all previous)
- [ ] Delete the `src/plugin/builtin/core-actions.ts` file. (owner: @dev, est: 0.5h, deps: previous task)
- [ ] Run the full test suite (`unit`, `integration`, `e2e`) to validate that all functionality is preserved. (owner: @qa, est: 1h, deps: all previous)

## Validation Hooks

- `pnpm test` and `pnpm test:e2e` must pass with no regressions.
- Manual smoke test: Verify that the "New Campaign" and "New Map" buttons are present in the toolbar and functional.

## Rollback / Flag

- No feature flag is necessary for this refactoring.
- Rollback plan is to revert the commit(s) containing these changes.
