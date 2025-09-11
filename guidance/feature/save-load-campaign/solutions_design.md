# T-015 — Solutions Design: Save/Load Campaign v1

## Decisions

- Single versioned schema (v1) with root `{ version: 1, campaign }`; MIME `application/vnd.map-territory+json;version=1`.
- Layer adapters may implement optional `serialize/deserialize`. Host falls back to raw `state`.
- Unknown layer types load via a temporary placeholder `LayerType` registered at runtime to preserve render contracts.
- Exclude derived/cache fields from persistence; recompute on load (e.g., Hex Noise `paintColor`).

## Schema (v1)

```
type CampaignFileV1 = {
  version: 1,
  campaign: {
    id: string,
    name: string,
    description?: string,
    settingId?: string,
    palette?: MapPalette,
    maps: Array<{
      id: string,
      name: string,
      description?: string,
      visible: boolean,
      paper: { aspect: 'square' | '4:3' | '16:10', color: string },
      settingId?: string,
      palette?: MapPalette,
      layers: Array<{
        id: string,
        name?: string,
        visible: boolean,
        locked?: boolean,
        meta: { pluginId?: string, typeId: string, typeVersion?: number },
        state: unknown,
      }>,
    }>,
    activeMapId: string | null,
  }
}
```

## Module Outline

- File: `src/stores/campaign/persistence.ts`
- Exports:
  - `CAMPAIGN_MIME_V1`
  - `serializeCampaignV1(campaign): CampaignFileV1`
  - `saveActiveCampaignV1(): CampaignFileV1 | null`
  - `deserializeCampaignV1(file: unknown): Campaign`
  - `loadIntoStoreV1(file: unknown): void` (calls `setActive` and lets store normalize anchors)
- Helper: `ensurePlaceholderLayerType(typeId)` registers a minimal placeholder with a stable `getInvalidationKey`.

## Adapter Hooks

- `HexNoiseAdapter.serialize()` drops `paintColor`.
- `HexNoiseAdapter.deserialize()` restores defaults and leaves `paintColor` undefined.
- Other built‑ins persist raw state.

## Error Handling

- Loader rejects files without `version === 1` or missing `campaign` root.
- Unknown layer type → placeholder; no throw.

## Tests

- Unit: `persistence.save-load.test.ts` ensures omission of derived fields and identity round‑trip.
- E2E (follow‑up): Save→Load→Render triggers one invalidation.
