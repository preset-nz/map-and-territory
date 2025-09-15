Status: Draft
Last Updated: 2025-09-03

# Subagent Tickets – New Campaign (Empty by Default)

These tickets orchestrate the minimal implementation to ship the New Campaign plugin without deep dependencies.

## Ticket NC-01 – Commands Registry (M2 Dependency)

- Owner: @ui-architect
- Goal: Implement minimal commands registry with `register(id, handler)` and `execute(id, payload?)` (supports async).
- Acceptance:
  - Can register and execute a command; errors bubble with stack.
  - Provenance logging: which plugin registered which command (store `pluginId`).

## Ticket NC-02 – Toolbar Slot: Campaign Group

- Owner: @interaction-agent
- Goal: Implement toolbar slot renderer with groups. Add group `campaign`; support button item binding to a command id with icon+label.
- Acceptance:
  - Rendering group `campaign` with one button bound to `app.campaign.new`.
  - Clicking button calls commands registry; icon uses `ri:file-plus`.

## Ticket NC-03 – Host Prompt Command

- Owner: @ui-architect
- Goal: Implement host command `host.prompt.newCampaign`. Show a minimal modal (name, description). Return values to caller.
- Acceptance:
  - When executed, returns `{ name, description }` or `{}` if cancelled.
  - Unit test can inject a mock prompt to simulate inputs.

## Ticket NC-04 – Project Service (Empty Campaign)

- Owner: @state-manager
- Goal: Implement a minimal project service with `createEmpty({ name, description })`, `setActive(project)`, and persistence hooks.
- Acceptance:
  - Creates `{ id: uuidv7, version: 1, name, description, maps: [], activeMapId: null }`.
  - Notifies UI (event bus) to update header and scene tree empty state.

## Ticket NC-05 – Plugin Manifest & Module

- Owner: @runtime-architect
- Goal: Provide manifest and module for `app.plugins.new-campaign` per design.
- Acceptance:
  - Manifest contributes command `app.campaign.new` and toolbar item in `campaign` group.
  - Module delegates to `host.prompt.newCampaign` via `app.commands.execute`.

## Ticket NC-06 – Empty State UI in Scene Tree

- Owner: @ui-architect
- Goal: When active project has zero maps, render a small CTA: "Create Map" (click executes `app.map.new` if available, else disabled).
- Acceptance:
  - Empty-state visible with new campaign; disappears once a map exists.

## Ticket NC-07 – Persistence: Project Metadata

- Owner: @data-engineer
- Goal: Ensure project name/description serialize/deserialize with project.
- Acceptance:
  - Round-trip save/load preserves metadata and empty `maps` array.

## Ticket NC-08 – Tests (E2E Happy Path)

- Owner: @quality-agent
- Goal: E2E test: click New Campaign → enter name/description → project created empty; toolbar and scene tree update.
- Acceptance:
  - Assertions on project state, header text, and empty-state CTA presence.
