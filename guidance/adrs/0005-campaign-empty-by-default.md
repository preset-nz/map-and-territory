---
title: Campaign Creation is Empty by Default
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, UX Lead, State Architect
---

## Context

Initial plan for the New Campaign plugin auto-created a first map to demonstrate default layer policy. To reduce dependency fan-out and learn faster, we prefer creating a Campaign (Project) with no maps, letting map creation be an explicit subsequent action.

## Decision

- `app.campaign.new` creates a new `Project` with `maps: []` and `activeMapId: null`.
- No map is created implicitly. Users add the first map via a separate command (e.g., `app.map.new`).
- UI reflects the empty state with a minimal, unobtrusive cue (e.g., CTA: "Create Map").

## Rationale

- Minimizes immediate dependencies (layer registry, render pipeline) for the first plugin.
- Accelerates feedback and de-risks early integration.
- Keeps policies decoupled: map defaults are tested when map creation is implemented.

## Consequences

- New Campaign plugin requires only project storage capability and a host prompt.
- Scene Tree must gracefully render the empty state.
- Map creation flows (and ADR-0003 defaults) are deferred until a dedicated plugin/feature.

## Validation

- Creating a campaign results in a project with zero maps; UI indicates empty.
- Save/Load preserves campaign metadata.
