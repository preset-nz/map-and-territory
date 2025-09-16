---
ticket: T-023
feature: freeform-flood-fill
author: production-coordinator
date: 2025-09-16
level: 2
---

## Milestones & Gates

- **M1**: Core flood fill algorithm and unit tests complete
- **M2**: Tool integration and UI implementation complete
- **M3**: Performance validation and E2E tests passing

## Tasks

### Phase 1: Core Algorithm (M1)

- [ ] Implement BFS flood fill algorithm with hex neighbors (owner: @dev, est: 1d, deps: AppAPI.hex, validation: unit tests pass)
- [ ] Add flood fill configuration types and interfaces (owner: @dev, est: 2h, deps: core algorithm, validation: TypeScript compilation)
- [ ] Create focused unit tests for flood fill algorithm (owner: @dev, est: 2h, deps: algorithm implementation, validation: core behavior + key edge cases covered)

### Phase 2: Tool Integration (M2)

- [ ] Create FloodFillToolHandler with click handling (owner: @dev, est: 4h, deps: algorithm, tool interfaces, validation: integration tests pass)
- [ ] Update freeform plugin manifest with fill command (owner: @dev, est: 1h, deps: tool handler, validation: command registration works)
- [ ] Add toolbar button to "tools" group (order: 3, after erase) with proper enablement conditions (owner: @dev, est: 2h, deps: manifest, validation: UI renders correctly)
- [ ] Integrate with batch API for atomic state updates (owner: @dev, est: 4h, deps: T-020, tool handler, validation: single undo/redo entry)
- [ ] Implement performance guardrails and hard cap (owner: @dev, est: 3h, deps: algorithm, validation: cap enforcement tests)
- [ ] Add fill mode support (empty-only vs same-value) (owner: @dev, est: 3h, deps: algorithm, validation: mode behavior tests)
- [ ] Create essential integration tests for tool behavior (owner: @dev, est: 2h, deps: tool integration, validation: tool activation + batch updates work)

### Phase 3: Validation & Polish (M3)

- [ ] Add single E2E test for complete fill workflow (owner: @qa, est: 2h, deps: integration complete, validation: happy path user journey works)
- [ ] Performance testing with large regions (owner: @qa, est: 2h, deps: algorithm, tests, validation: <100ms for 1000 cells)
- [ ] Update freeform plugin documentation (owner: @dev, est: 1h, deps: implementation complete, validation: docs review)

## Validation Hooks

- **`pnpm test:run`**: Phase 1 algorithm tests, Phase 2 integration tests - focused on core behavior, not exhaustive coverage
- **`CI=1 PORT=3210 pnpm test:e2e`**: Phase 3 complete workflow, undo/redo preservation, performance benchmarks
- **`pnpm lint`**: TypeScript compilation, code style validation
- **Manual validation per phase**:
  - Phase 1: Algorithm correctness with various connectivity patterns
  - Phase 2: Tool registration, UI integration, batch API behavior
  - Phase 3: User experience, performance under load, edge cases

## Rollback / Flag

- Feature can be disabled by removing command from plugin manifest
- No database migrations or persistent state changes required
- Tool state reverts to previous active tool on disable
