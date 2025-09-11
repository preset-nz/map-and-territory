# T-015 — Tasks

## Breakdown

- Types & Module
  - [x] Add v1 types and MIME constant
  - [x] Implement `serializeCampaignV1` and `deserializeCampaignV1`
  - [x] Add `loadIntoStoreV1`
  - [x] Placeholder registration for unknown layer types
- Adapters
  - [x] Hex Noise: add `serialize/deserialize` to drop `paintColor`
- Tests
  - [x] Unit tests for omission of derived fields
  - [x] Unit tests for dirty state toggle on edits/save
  - [ ] E2E round‑trip (Save→Load→Render, single invalidation)
- UI (follow‑up PR)
  - [ ] Add File→Save and File→Load actions to `app-header`
  - [ ] Download file with `CAMPAIGN_MIME_V1`; upload parse+load with guardrails
  - [x] Add unsaved‑changes confirm for New Campaign and Load (Radix dialogs)

## Dependencies

- Core layer types must be registered in tests (`registerCoreLayerTypes`).

## Owners

- Dev: Platform
- QA: Pre‑prod reviewer
