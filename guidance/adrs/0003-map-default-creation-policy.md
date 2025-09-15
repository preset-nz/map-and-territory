---
title: Default Map Creation Policy (Paper, Hexgrid, Terrain)
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, UX Lead, Layer Architect
---

## Context

Campaigns support multiple maps. For a fast, predictable start, a new map should include the essential layers used across flows (paper background, hex grid, and at least one terrain). This complements ADR-0002 (plugin architecture) and the Scene Tree solutions design.

## Decision

1. Default Layers on Map Create

- When `scene.create()` is called for a blank map, the system auto-adds three layers in this order (z-order bottom → top):
  1. `paper` (name: "Paper")
  2. `hexgrid` (name: "Hex Grid")
  3. `terrain` (name: "Terrain 1")
- `visible=true`, `locked=false` by default.
- Layer `state` is initialized from each layer type's `defaultState` (declared in its layer type contribution/schema).

2. Ordering Policy (MVP)

- No hard pinning: all layers, including `paper` and `hexgrid`, are reorderable.
- UX may hint that `paper` is typically the bottom layer, but engine does not enforce.
- Future optionality: a layer type may declare `policy.pinnedToBottom` or `policy.pinnedToTop`; ignored in MVP but reserved for Phase 2.

3. Idempotence & Templates

- If creation is based on a template that already includes required layers, do not inject duplicates.
- Default injection applies only to the "blank" map creation path.

4. Naming & Counters

- Terrain layers created by default or subsequently are named with an incrementing counter per map: "Terrain 1", "Terrain 2", ...

## Rationale

- Reduces setup friction and aligns with common workflows (paint on terrain immediately).
- Predictable initial render order without complex policies.
- Keeps platform generic; defaults derive from layer-type schemas contributed by plugins.

## Consequences

- `scene.create()` must:
  - Create a new map doc.
  - Add required layers in the specified order using the layer registry’s `defaultState`.
  - Select the new map as active.
- Tests must cover order, visibility defaults, and persistence round-trip.

## Alternatives Considered

- Map creation wizard (rejected for MVP complexity; possible later as a plugin/panel).
- Template-first creation (deferred; templates can be implemented atop this policy).

## Validation

- E2E: Create new map → see Paper/Hex Grid/Terrain present and rendered with expected order.
- Persistence: Save/Load preserves order and layer states.
