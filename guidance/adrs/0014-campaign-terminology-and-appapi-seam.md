---
title: Campaign Terminology and AppAPI.campaign Seam
status: Accepted
date: 2025-09-09
deciders: Core Orchestrator, UI Lead, Plugin Architect
amends: 0004-platform-mvp-foundations (Campaign Naming vs Domain Model)
---

Context

- Earlier documents mixed "Project" (domain type), "Campaign" (UI term), and occasionally "Scene" (viewer/panel naming).
- Host code wired core actions directly in `AppLayout` via `ensureCommand('host.*')`, bypassing the plugin system and lacking a typed seam for plugins.

Decision

1. Terminology Alignment

- Prefer "Campaign" across all new user-facing and plugin API surfaces.
- "Scene" is considered a UI synonym for "Campaign" for now; future UI should converge on "Campaign" (e.g., Scene Viewer → Campaign Viewer).
- The internal store type remains `Project` temporarily; treat it as an implementation detail. Future refactor may rename to `Campaign` when churn risk is low.

2. Introduce AppAPI.campaign Seam

- Provide a minimal, typed host API under `AppAPI.campaign` for core actions:
  - `newCampaign(params?): Campaign`
  - `newMap(params?): string` (returns mapId)
  - `deleteMap(id: string): void`
  - `selectCampaign(): void`
  - `selectMap(id: string): void`
- Expose this seam to plugins (via `getAppAPI()` and on `PluginContext.app`).

3. Canonical Commands and Toolbar Groups

- Commands: `campaign.new`, `map.new`, `map.delete`.
- Toolbar groups: `campaign` (New Campaign) and `map` (New Map).

Rationale

- SOLID/CUPID: a clear seam (ISP) reduces coupling; predictable command IDs and groups improve composability and testability.
- Platform thinking: keeps UI decoupled from behavior; plugins target a stable AppAPI while the store evolves internally.

Consequences

- Host-only commands in `AppLayout` are removed in favor of a built-in plugin.
- Old built-ins (`new-campaign.ts`, `map-crud.ts`) are deleted; replaced by `core-actions` plugin.
- E2E tests may update selectors if labels change; labels currently unchanged.

Alternatives Considered

- Keep mixed terms and host-wired commands (rejected: inconsistent, brittle, not extensible).
- Immediate full rename of `Project` type to `Campaign` (deferred: broad churn; schedule when stable).

Validation

- Unit tests pass; toolbar renders actions from plugin contributions; commands execute via AppAPI.

Follow-ups

- Plan a staged rename of the store type `Project` → `Campaign` and related file paths.
- Audit UI for remaining "scene" occurrences and converge on "campaign" naming.
