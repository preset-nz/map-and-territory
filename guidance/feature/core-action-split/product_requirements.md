---
ticket: T-019
feature: Core Action Plugin Split
owner: product-owner
date: 2025-09-10
level: 2
---

## Problem & Value

The current `core-actions` plugin combines both campaign and map-related actions. While small, it will inevitably grow as new features like persistence and properties are added. This consolidation can lead to a confusing and less maintainable structure.

Splitting this plugin into two distinct, domain-focused plugins (`campaign` and `map`) will:

- Improve separation of concerns, aligning with SOLID principles.
- Create a more logical and scalable plugin architecture.
- Simplify the future implementation of the properties panel, as properties can be contributed by their respective plugins.
- Better "dogfood" the plugin system by creating more realistic, granular plugins.

## In Scope

- Refactor the existing `src/plugin/builtin/core-actions.ts` into two new plugins.
- Create a `campaign` plugin that handles the `campaign.new` command and its associated toolbar button.
- Create a `map` plugin that handles the `map.new` and `map.delete` commands and their associated toolbar contributions.
- Ensure all existing functionality related to these actions remains identical to the user.
- Remove the old `core-actions.ts` plugin after the refactoring is complete.

## Out of Scope

- Adding any new features, commands, or UI elements.
- Changing any user-facing labels, icons, or behaviors.
- Implementing the properties panel feature itself. This refactoring is preparatory work.

## Acceptance Criteria

- [ ] The `src/plugin/builtin/core-actions.ts` file is deleted.
- [ ] A new `campaign.ts` plugin exists in `src/plugin/builtin/` and provides the "New Campaign" functionality.
- [ ] A new `map.ts` plugin exists in `src/plugin/builtin/` and provides the "New Map" and "Delete Map" functionalities.
- [ ] The application compiles and all existing tests pass.
- [ ] There is no observable change in application behavior for the user.
