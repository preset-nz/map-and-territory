---
title: Capability-Based Plugin Architecture with Declarative Manifests
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, Plugin Architect, Security Lead, UI Lead
---

## Context

- Map&Territory aims for an extensible platform where community plugins can add tools, layers, UI, and workflows.
- We need clear, minimal, and predictable interfaces that align with SOLID/CUPID and avoid leaking internal details.
- Security and performance matter, but this is a learning project; we prefer a staged approach to sandboxing and complexity.

## Decision

1. Declarative Plugin Manifest

- Plugins declare capabilities and contributions (commands, toolbar, tools, layers, properties, panels).
- The platform validates capabilities and only exposes the corresponding `AppAPI` facets.

2. Commands-First Integration

- UI elements (toolbar items) bind to commands by ID for decoupling and testability.
- Plugins register command handlers in their module entry under their namespace.

3. Slot-Based UI Composition

- Named slots for toolbar groups, properties sections, and panels provide predictable placement and ordering.

4. Stable App API Surface

- Narrow, versioned `AppAPI` exposed to plugins; selector-oriented and independent from internal store shape.

AppAPI Utilities (initial):

- `util.newId(): string` — returns a UUIDv7 string. Single source of truth for IDs across core and plugins. See `guidance/reference/new_id_helper.md` and ADR-0012.

5. Progressive Isolation

- MVP: in-process ESM module loading with Content Security Policy restricting remote code.
- Phase 2: optional Worker-based isolation with a proxied `AppAPI` across `postMessage`.

## Rationale

- SOLID/CUPID: Clear interfaces (ISP), predictable behavior, domain-focused contributions, composable slot model.
- Platform Thinking: Start with minimal viable interfaces but preserve optionality (worker sandbox, marketplace) without breaking contracts.
- Testability: Commands registry, deterministic render adapters, and manifest validation support strong contract tests.

## Consequences

- Implementation agents create: plugin kernel (loader, validator), registries (commands, tools, layers), and slot renderers.
- Documentation and types become part of the public developer experience (DX) for plugin authors.
- Some overhead in manifest design and capability gating, balanced by maintainability and safety.

## Render Invalidation & Redraw Contracts (MVP)

- Host rendering (worker and fallback) issues redraws when specific dependencies change: paper aspect/color, canvas dimensions, and a `layersKey` string derived from the visible layers.
- All visual layer adapters MUST implement `getInvalidationKey(state): string`.
- The host composes `layersKey` strictly from `(type, visible, adapter.getInvalidationKey(state))` and does not inspect layer state.
- Adapter keys must be deterministic and change only when visuals change.
- Adding new layer types: implement `getInvalidationKey` using only visually salient fields. The host requires it; no fallback exists.

Notes

- Keep invalidation keys complete but minimal; avoid including non-visual or fast-flapping fields.
- Even if React re-renders, the renderer only submits a new frame when these dependencies change.

## Alternatives Considered

- Ad-hoc plugin hooks (rejected): too coupled, brittle, and hard to test.
- Full worker isolation from day one (deferred): higher complexity, slower feedback while learning.
- Extending internal stores to plugins (rejected): violates interface segregation and increases breakage risk.

## Validation

- A set of example plugins (scene buttons, paper layer, hexgrid layer, terrain layer, paint tool) integrate via the same extension points.
- End-to-end flows (new/save/load scene; paint terrain) pass in the MVP test suite.

## Follow-ups

- Define a minimal plugin authoring guide and examples in `docs/plugins/` after MVP.
- Evaluate Worker isolation performance impacts on rendering-heavy plugins.
