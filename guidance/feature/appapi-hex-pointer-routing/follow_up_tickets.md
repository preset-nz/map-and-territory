# Tickets

---

number: T-005
title: Consolidate Plugin API on central AppAPI and expose via PluginContext
owner: Programme Manager, Platform
date: 2025-09-05
level: 2
status: Proposed

---

## Problem

Plugins and core features access internal stores and registries directly (e.g., `useProjectStore`, `useSelectionStore`, layer registries). ADR-0002 and guidance reference a versioned `AppAPI`, but we lacked a concrete, central entry point. This increases coupling and makes future isolation (Worker proxy) harder.

## Goal

Introduce a single, minimal, versioned `AppAPI` surface as the canonical boundary for plugins and internal extension points. Expose it on `PluginContext` and migrate built-in plugins away from direct store access.

## Scope (In)

- Add `app: AppAPI` to `PluginContext` (read-only), passed by `plugin/loader` on activation.
- Extend `AppAPI` with `util.newId()` (UUIDv7) per ADR‑0012 and `guidance/reference/new_id_helper.md`.
- Provide minimal `scene`/`layers` mutations needed by built-in plugins, implemented via internal selectors/actions (no direct store shape exposure).
- Migrate built-in `hex-noise` plugin to use `AppAPI` instead of stores for: insert layer, select layer (via `AppAPI.layers` and `AppAPI.selection`).
- Version tag `apiVersion` on `AppAPI` for future evolution.

## Out of Scope

- Full Worker sandbox/proxying (future ticket).
- Third-party plugin migration (not present yet).

## Acceptance Criteria

- [ ] `PluginContext` includes `app: AppAPI` and loader passes it to `activate(ctx)`.
- [ ] `AppAPI.util.newId()` implemented (UUIDv7) and tested.
- [ ] `AppAPI.layers.insertBeforeTopAnchor(typeId)`, `AppAPI.layers.insertAbove(targetId, typeId)`, `AppAPI.selection.selectLayer(id)` added; implemented without leaking store internals.
- [ ] Built-in `hex-noise` plugin uses only `AppAPI` (no direct store imports).
- [ ] Unit + integration tests cover `AppAPI` facets and plugin command path.
- [ ] Docs: link ADR‑0002 and `new_id_helper.md`; update guidance for plugin authors to prefer `AppAPI`.

## Design Notes

- `src/appapi/index.ts` is the central entry. Keep surface minimal; extend behind versioning.
- `PluginContext` stays narrow: `log`, `app`. Future facets (history, properties) can arrive without breaking callers.
- Internal implementation can adapt store structure; `AppAPI` presents stable selectors/actions.

## Risks & Mitigations

- Risk: scope creep (too many methods). Mitigation: Level 2 — only util.id, layers insert, selection select.
- Risk: test flakiness around UI integration. Mitigation: command-level tests with mocked stores.

## Validation

- Unit: `AppAPI.util.newId()` format/version; layers/selection methods call through.
- Integration: executing `layer.hexnoise.add` adds a layer via `AppAPI` and updates selection.
- Coverage: maintain global ≥80%; `AppAPI` facet ≥90% lines.

## Migration Plan

- Step 1: Add `app: AppAPI` to context and loader wiring.
- Step 2: Implement minimal `AppAPI.util`, `AppAPI.layers`, `AppAPI.selection`.
- Step 3: Migrate built-in plugin(s); remove direct store imports.
- Step 4: Update docs and add examples.

References: ADR‑0002 `guidance/adrs/0002-plugin-architecture.md`, ADR‑0012 `guidance/adrs/0012-id-strategy-uuidv7.md`, `guidance/reference/new_id_helper.md`.

## Milestones & Gates

- M1: Define minimal `AppAPI` facets (`util`, `layers`, `selection`) — Gate: design sign‑off, types in `src/appapi/index.ts` added.
- M2: Wire `PluginContext.app` and pass from `plugin/loader` — Gate: example plugin receives `ctx.app` in `activate()`.
- M3: Migrate built‑in `hex-noise` plugin to `AppAPI` — Gate: repo‑wide search shows no plugin store imports.
- M4: Tests + Coverage — Gate: global ≥80%, `appapi/**` ≥90%.
- M5: Docs — Gate: references added to ADR‑0002 and `new_id_helper.md`.

## Tasks

- [ ] Extend `AppAPI` with `util.newId()` and stub `layers`, `selection` methods (owner: @architect, est: 4h, deps: ADR‑0012)
- [ ] Add `app: AppAPI` to `PluginContext`; update `loader` to pass it (owner: @dev, est: 3h)
- [ ] Refactor `hex-noise` plugin commands to use `AppAPI` (owner: @dev, est: 3h)
- [ ] Unit tests: `AppAPI.util.newId()`; integration: command path uses `AppAPI` (owner: @dev, est: 4h)
- [ ] Docs: update guidance for plugin authors; link ADRs (owner: @pm, est: 1h)

## Dependencies

- ADR‑0002 (plugin architecture), ADR‑0012 (ID strategy)
- Commands registry and loader exist (`src/lib/commands`, `src/plugin/loader.ts`)

## Breaking Changes

- None. This is additive. Built‑in plugin migrates within the same PR.
