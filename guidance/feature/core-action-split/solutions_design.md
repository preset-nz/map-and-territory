---
ticket: T-019
feature: Core Action Plugin Split
author: lead-developer
date: 2025-09-10
level: 2
---

## Overview & Assumptions

This is a pure refactoring to improve architectural clarity and scalability. It splits the `core-actions` plugin into two domain-focused plugins: `campaign` and `map`.

- It assumes the existing `AppAPI.campaign` seam is stable and sufficient for the actions being moved.
- The goal is to relocate command and contribution registrations, not to alter the underlying logic.
- This change anticipates the `plugin-properties-panel` feature, providing a more logical home for future campaign and map property contributions.

## Interfaces & Contracts

No changes will be made to the public `AppAPI` or the internal store structures. The refactoring focuses on how commands and toolbar items are registered.

### New Plugins

1.  **`campaign` plugin (`src/plugin/builtin/campaign.ts`)**
    - **Manifest ID**: `app.plugins.campaign`
    - **Contributes Command**: `campaign.new`
    - **Contributes Toolbar Item**: A button in the `campaign` group for the `campaign.new` command.

2.  **`map` plugin (`src/plugin/builtin/map.ts`)**
    - **Manifest ID**: `app.plugins.map`
    - **Contributes Commands**: `map.new`, `map.delete`
    - **Contributes Toolbar Item**: A button in the `map` group for the `map.new` command.

## Data/State Changes

None. This refactoring does not alter any data schemas or state management logic.

## Testing Strategy

- **Unit/Integration**: The logic within the command handlers is not changing, so no new unit tests are required. Existing tests related to the AppAPI calls should remain valid.
- **E2E**: Existing E2E tests should pass without modification, as there are no user-facing changes to behavior, labels, or command IDs. A smoke test will be performed to confirm the buttons remain functional.

## Impact/Risks

- **Risk**: Extremely low. This is a structural refactoring of existing, tested code.
- **Developer Experience (DX)**: Positive. The plugin structure becomes more intuitive, scalable, and easier for new developers to understand. It provides a clear place to add future campaign-specific or map-specific functionality.
- **User Experience (UX)**: None. The user will perceive no change.

## ADR Links

- This work is a direct follow-up to the architecture established in `guidance/adrs/0014-campaign-terminology-and-appapi-seam.md`. It improves upon the initial implementation by creating a more granular and scalable plugin structure.
