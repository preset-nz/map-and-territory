# Solution Design: Plugin Core Campaign Actions

References: ADR-0002 (Plugin Architecture), ADR-0012 (IDs), `guidance/feature/plugin-toolbar-contract`

Architecture

- `AppAPI.campaign` (new): narrow facade over campaign/selection stores.
  - `newCampaign(params?: { name?: string; description?: string }): Campaign`
  - `newMap(params?: { name?: string; description?: string }): string`
  - `deleteMap(id: string): void`
  - `selectMap(id: string): void`
  - `selectCampaign(): void`
- `PluginContext.app.campaign` exposes the above to plugins during activation and in command handlers.
- Built-in plugin `plugin-core-actions` contributes commands and toolbar items.

Command Mapping (IDs are proposals; finalize in implementation)

- `campaign.new` → `app.campaign.newCampaign()` then `selectCampaign()`.
- `map.new` → `app.campaign.newMap()` then select returned id.
- `map.delete` → confirm (MVP) then `app.campaign.deleteMap(id)` and `selectCampaign()`.

Loader Changes

- Extend `PluginContext` to include `app` facet.
- Provide `ctx` to `activate` as today; command handlers can import `getAppAPI()` or capture `ctx` in closure during `activate`.

Toolbar Contributions

- Groups and labels are flexible. Decision:
  - Group `campaign`: New Campaign (`lucide:box`, order 1)
  - Group `map`: New Map (`lucide:map`, order 2)

Bootstrap

- `src/plugin/builtin/index.ts` exports a registry of built-ins.
- `AppLayout` imports and loads built-ins from the registry; remove `ensureCommand('host.*')`.

Testing

- Unit: invoke command handlers and assert store changes via `AppAPI`.
- E2E: update selectors to new labels/roles as needed.

Risks & Mitigations

- Init order: loader is idempotent; load on layout mount.
- API surface creep: keep `AppAPI.campaign` minimal and documented as experimental.
- Test churn: plan a single rename pass and update E2E selectors once.
