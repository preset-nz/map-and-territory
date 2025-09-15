Status: Draft
Last Updated: 2025-09-03
title: UI Modes: Edit/Present and Presentation Toggle
deciders: Core Orchestrator, UI Lead, Architecture Lead

## Context

We want a “game mode” that focuses the screen on the map and supports click-to-reveal interactions. Implementing this as a first-class UI mode (rather than a separate app state) preserves platform optionality, keeps the core generic, and allows plugins (e.g., Fog of War) to drive behavior without coupling to layout internals.

## Decision

1. Introduce UI Modes

- Add `edit` (default) and `present` modes to the host.
- Expose in `AppAPI.ui`:
  - `setMode(mode: 'edit'|'present'): void`
  - `getMode(): 'edit'|'present'`
  - `onModeChange(cb: (mode) => void): () => void`

2. Presentation Behavior

- Present Mode hides non-canvas chrome by policy: scene panel, properties panel, status bar, and non-essential toolbars. A minimal top-level toggle remains accessible (keyboard/command).
- No changes to rendering pipeline; canvas continues to render the active map and layers by z-order.

3. Commands

- Register `app.mode.present.toggle` (and `app.mode.set:edit|present`).
- Plugins and toolbar buttons may call these commands; the host enforces mode transitions.

4. Input Gating

- Present Mode routes pointer/keyboard to canvas/tools only. Global shortcuts are reduced to essentials (escape, toggle mode).

## Rationale

- Keeps layout concerns in the host while enabling “game mode” without bespoke code paths.
- Provides a narrow, stable interface for plugins to react to mode changes and toggle mode.
- Minimizes coupling between plugins (Fog of War) and UI implementation details.

## Consequences

- Layout must respect mode policy to hide/show chrome deterministically.
- A toolbar or command palette entry should expose the toggle, but this remains host-owned.
- E2E tests need to cover mode switching and input gating basics.

## Validation

- E2E: Toggling `app.mode.present.toggle` hides panels and focuses canvas; toggling again restores edit chrome.
- Integration: Plugin reacts to `onModeChange`, leaving behavior unchanged in edit mode.

## Follow-ups

- Evaluate kiosk-friendly refinements (cursor hiding, auto-fit zoom) in Present Mode.
- Consider per-project default mode and persistence once workflows stabilize.
