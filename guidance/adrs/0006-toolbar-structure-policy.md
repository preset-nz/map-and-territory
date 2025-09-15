---
title: Toolbar Structure Policy (Panel Toggles, Group Ordering)
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, UI Lead
---

## Context

The toolbar should remain predictable and professional. We need a consistent placement for panel collapse toggles and a canonical ordering for functional groups starting with Campaign actions.

## Decision

1. Fixed Anchors

- Left anchor: Scene Panel Toggle button (collapse/expand) is always the first item.
- Right anchor: Properties Panel Toggle button (collapse/expand) is always the last item.

2. Dividers

- A vertical divider follows the left anchor.
- A vertical divider precedes the right anchor.

3. Group Ordering (Left → Right)

- First group: Campaign actions (e.g., New Campaign).
- Followed by: Creative tool groups and view tool groups as needed.

4. Tooltip Styling

- Tooltips must be readable with sufficient contrast. For MVP, the New Campaign button omits a tooltip until a better style is specified.

## Rationale

- Predictability and learnability: fixed anchors reduce scan effort.
- Visual rhythm: dividers create clear boundaries for functional clusters.
- MVP readability: avoid low-contrast tooltips until style tokens are settled.

## Consequences

- Toolbar components must render in the specified order regardless of feature flags.
- New Campaign appears immediately after the first divider.

## Follow-ups

- Define global tooltip theme tokens to ensure accessible contrast for keyboard hints.
