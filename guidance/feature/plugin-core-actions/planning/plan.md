# Plan: Migrate "New Campaign/Map" to Plugin

Objective

- Replace hardcoded host commands in `AppLayout` with a first‑class core plugin and minimal `AppAPI` facet for campaign actions. UI labels, groups, and shortcuts may change.

Scope

- Command registration, toolbar contributions, and host action wiring for `new campaign`, `new map`, and `delete map`.
- Non‑Goals: Modal UX (keep MVP prompts), marketplace loading, worker isolation.

Implementation Steps (dependency-ordered)

1. Define `AppAPI.campaign` facet

- Add typed methods: `newCampaign(params) → Campaign`, `newMap(params) → mapId`, `deleteMap(id)`, `selectMap(id)`, `selectCampaign()`.
- Internals call existing stores; keep store shapes private.

2. Extend PluginContext

- Provide `ctx.app` with `campaign` facet; document in `@/plugin/types`.
- Update loader to pass `ctx` to `activate` and command handlers where relevant.

3. Core Actions Plugin

- Create built‑in plugin `plugin-core-actions` contributing commands (finalize IDs during implementation):
  - e.g., `campaign.new`, `map.new`, `map.delete`.
- Toolbar contributions: two groups — `campaign` (New Campaign) and `map` (New Map).
- Implement handlers using `ctx.app.campaign.*` (no host‑only commands).

4. Bootstrap and Decouple

- Replace `ensureCommand('host.*')` in `AppLayout` with loading of built‑ins via a registry (`@/plugin/builtin/index`).
- Remove direct host command wiring and keep keyboard shortcuts bound to plugin commands.

5. Tests and Gates

- Update E2E selectors to match chosen labels.
- Add unit tests for `AppAPI.campaign` and plugin command wiring.
- Run full suite; validate no regressions in toolbar rendering and selection state.

Risks / Mitigations

- Early init order: load built‑ins during layout mount → Loader is idempotent and registry import at app boot.
- API creep: keep `AppAPI.campaign` minimal; document as experimental v0 in types.
- Selector drift: coordinate a one-time rename + test update.

Acceptance Criteria

- No `ensureCommand('host.*')` in `AppLayout`.
- Built‑in plugin provides the buttons and commands; tests pass after updating selectors.
- `AppAPI.campaign` documented and typed; plugin uses it exclusively.
