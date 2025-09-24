---
title: Scale Bar Placement and Setting-Derived Units
status: Accepted
date: 2025-09-24
deciders: Platform Lead, Mapping Experience Lead
---

## Context

Campaign maps lacked an at-a-glance scale indicator. Designers asked for a scale bar that could sit either on top of the map or just beneath it, while automatically matching the fiction of each setting (space charts vs. nautical patrols vs. wasteland treks). We also needed an override so advanced users could pick alternative units when a specific map diverges from its parent setting.

## Decision

- Introduce a per-setting scale profile describing default units, short labels, and units-per-hex ratios.
- Persist a `scale` config on each map (`enabled`, `placement`, `useSettingUnits`, `customUnitId`). Maps follow their setting profile by default, but can override placement and units.
- Surface scale controls in the map properties panel (show/hide, placement select, unit override toggle and picker).
- Render a client-side `ScaleBar` overlay in the viewport worker host, positioning it either inside the paper bounds (overlay) or just below the paper edge (below) using the same render geometry math.
- Expose the resolved scale configuration through `AppAPI.scale` and a `useActiveScaleConfig` selector for other UI consumers.

## Consequences

- Campaign store schema grows to include map scale metadata (existing saves load with normalized defaults).
- Plugins and properties registry now rely on scale profiles when populating unit options.
- Rendering layer includes a new React overlay that depends on hex grid sizing; future render backends must continue to provide hex size state.
- Opening the door for additional placement styles (e.g., right-aligned) now only requires adding new enum values and presentation tweaks.

## Follow-up

- Consider persisting user-selected bar widths or segment counts once we gather usability feedback.
- Extend scale profiles with narrative descriptors or alternate conversion tables when settings need multiple canonical units.
