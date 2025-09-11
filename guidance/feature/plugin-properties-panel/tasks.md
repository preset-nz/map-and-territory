---
ticket: T-001
feature: plugin-properties-panel
author: production-coordinator
date: 2025-09-10
level: 2
---

## Milestones & Gates

- **M1**: Core parameter template system and registry (tasks 1-4)
- **M2**: Properties panel refactor and rendering (tasks 5-6)
- **M3**: Plugin migrations and testing (tasks 7-10)

## Tasks

### Core Infrastructure

- [ ] Define parameter template types and interfaces in `src/properties/types.ts` (est: 2h)
- [ ] Create properties registry in `src/properties/registry.ts` with registration/query functions (est: 3h)
- [ ] Update plugin types to include `propertiesPanel` contributions in manifest (est: 1h)
- [ ] Extend plugin loader to process and register properties contributions (est: 2h)

### Properties Panel Refactor

- [ ] Create parameter template renderer component in `src/properties/template-renderer.tsx` (est: 4h)
- [ ] Refactor properties panel to query registry and render templates dynamically (est: 3h, deps: task 5)

### Plugin Migrations

- [ ] Create core-properties plugin with Campaign and Map property templates (est: 3h, deps: tasks 1-6)
- [ ] Update hex-noise plugin to use parameter templates instead of property schema (est: 2h, deps: tasks 1-6)
- [ ] Update freeform plugin to use parameter templates (est: 2h, deps: tasks 1-6)
- [ ] Remove old property schema registry and hardcoded components (est: 1h, deps: tasks 7-9)

### Testing & Validation

- [ ] Write unit tests for template types, disable conditions, and registry (est: 3h)
- [ ] Write integration tests for template rendering and plugin contributions (est: 2h)
- [ ] Update existing properties panel tests for new architecture (est: 2h, deps: tasks 5-6)
- [ ] Add E2E test for conditional map palette override functionality (est: 1h)

## Validation Hooks

- `pnpm test` validates: Template type safety, registry functions, disable condition evaluation
- `pnpm test:e2e` validates: Campaign properties UI, Map palette override, Layer properties rendering
- Manual testing: All existing property functionality works identically

## Rollback / Flag

- Feature can be rolled back by reverting to hardcoded components if critical issues emerge
- No feature flag needed as this is an internal architecture change with no user-facing behavior changes
