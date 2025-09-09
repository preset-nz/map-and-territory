# Plugin: Core Campaign Actions (New Campaign / New Map)

Intent

- Migrate hardcoded "New Campaign" and "New Map" buttons/handlers to the plugin system using a minimal `AppAPI` facet. UX, labels, and shortcuts may change if preferred.

Problem Statement

- `AppLayout` registers `host.*` commands directly and loads ad hoc built-ins, violating platform seams defined in ADR-0002.
- This couples layout to project CRUD and bypasses a stable extension surface.

Goals

- Provide first-class plugin that contributes campaign actions via the command registry.
- Expose a typed, minimal `AppAPI.campaign` used by the plugin for actions.
- Allow renaming, regrouping, or changing shortcuts without constraints; update tests accordingly.

Non-Goals

- New dialogs/confirm flows (keep MVP: inline confirm for delete).
- Remote plugin loading or worker isolation.

Success Criteria

- No `ensureCommand('host.*')` in `src/components/layout/app-layout.tsx`.
- Buttons render from toolbar contributions; chosen command IDs and labels are consistent across code and docs.
- Full test suite passes with updated selectors/shortcuts as needed.
- Toolbar grouping uses two groups: `campaign` (New Campaign) and `map` (New Map).

Users / Roles

- Core Orchestrator: defines `AppAPI` seam and loader changes.
- Plugin Architect: authors the core actions plugin manifest/module.
- UI Lead: validates toolbar grouping and labels.

Constraints

- Follow `guidance/process/implementation_standards.md` and ADR-0002.

Open Questions

- Should `AppAPI.campaign` be available to all plugins or gated by a capability token? MVP: public within built-ins; evaluate gating later.
- Terminology alignment: "scene" currently overlaps with "campaign"; plan follow-up to reconcile naming (e.g., scene viewer → campaign viewer) and update ADR-0004.
