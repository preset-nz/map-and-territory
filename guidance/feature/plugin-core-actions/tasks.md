# Tasks: Plugin Core Project Actions

Milestone A — API & Context

- [ ] Define `AppAPI` type and `campaign` facet in `src/plugin/types`.
- [ ] Implement `getAppAPI()` and wire to existing stores/selection.
- [ ] Extend `PluginContext` and `plugin/loader.ts` to pass `app` facet.

Milestone B — Core Plugin

- [ ] Create `src/plugin/builtin/core-actions.ts` (manifest + module).
- [ ] Implement commands using `ctx.app.campaign` methods.
- [ ] Contribute toolbar items in two groups: `campaign` and `map`.

Milestone C — Bootstrap & Cleanup

- [ ] Add `src/plugin/builtin/index.ts` registry and import in `AppLayout`.
- [ ] Remove `ensureCommand('host.*')` from `AppLayout`.
- [ ] Keep keyboard shortcuts mapped to plugin command IDs.

Milestone D — Tests & Docs

- [ ] Unit tests for `AppAPI.project` and command handlers.
- [ ] Update Playwright specs to new selectors/labels.
- [ ] Update `guidance/process/AGENTS.md` acceptance criteria.

Exit Criteria

- All acceptance criteria in product requirements met; test suite green.
