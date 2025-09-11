---
ticket: T-017
feature: layer-naming
author: production-coordinator
date: 2025-09-04
level: 1
---

## Tasks

- [ ] Store: add `generateName({ type, base, existing, padTo=2, duplicateOf? })` helper and unit test.
- [ ] Store: apply numbering when `name` param is absent in layer insert helpers.
- [ ] UI: Properties panel — show `Name` input for selected layer; wire to `renameLayer`.
- [ ] E2E: spec for numbering, rename in Properties, duplicate suffix.

## Validation Hooks

- `pnpm test` (unit) and `pnpm test:e2e` for the new flow.
