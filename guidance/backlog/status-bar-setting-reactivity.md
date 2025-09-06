---
title: Status Bar — Setting Indicator Not Reactive
date: 2025-09-05
related: T-012 Map Settings / Palettes
status: Backlog
---

Context

- The status bar shows the active Setting name based on `AppAPI.palette.settingId()`.
- After creating a campaign, adding a map, and enabling a map override, the status bar label does not update immediately.

Problem

- No reactive subscription drives re-render when campaign/map `settingId` changes. The status bar reads once per render but does not track palette-setting changes via commands or store updates.

Hypothesis / Root Cause

- `StatusBar` pulls from `useLayoutStore` only; it does not subscribe to project store (where `settingId` lives) nor to a palette-specific store/event. Command handlers mutate project store, but the status bar isn't subscribed.

Proposed Fix (after Campaign/Map → plugins)

- Introduce a lightweight palette state selector hook (e.g., `useActiveSettingId()`), backed by the project store and exposing `map → campaign → default` resolution.
- Alternatively, emit a palette-changed event from `app.palette.*` commands and subscribe in `StatusBar`.

Acceptance Criteria

- Changing campaign setting updates the status bar within a frame.
- Enabling/disabling map override updates the status bar accordingly.
- Switching active map updates the status bar setting label.

Dependencies

- T-012 implemented; Campaign/Map settings available.
- Optional: palette domain hook or event bus.

Notes

- Parked until Campaign and Map settings UIs are fully pluginized to avoid coupling `StatusBar` to project internals.
