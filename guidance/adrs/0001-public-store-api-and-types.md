---
title: Public Layout Store API, Canonical Types, and Next.js Config
status: Accepted
date: 2025-09-02
deciders: Core Orchestrator, Store Architect, TS Specialist, Next.js Specialist
---

## Context

- Greenfield Next.js application with a professional layout system.
- Zustand powers layout state across sidebar, preferences, and navigation.
- Tests and consumers require a clear, minimal public store surface and stable type exports.
- Inconsistencies existed around `Theme` typing and `SidebarSection` domain values.
- Next.js config mixed CJS/ESM in a TypeScript project.

## Decision

1. Canonical Domain Types
   - Sidebar sections use: `'navigation' | 'tools' | 'layers'` (Option A, no legacy variants).
   - Export `Theme` from `@/types/layout` as `type Theme = LayoutPreferences['theme']` to avoid local duplicates.

2. Public Store API Surface
   - `useLayoutStore` remains the core primitive.
   - Provide narrow, ergonomic selector hooks as the official public surface:
     - State: `useSidebarState`, `useLayoutPreferences`, `useNavigationState`
     - Actions: `useSidebarActions`, `useThemeActions`, `useNavigationActions`
   - Composition helpers remain internal; do not expose a parallel store API.

3. Next.js Config Consistency
   - Use ESM consistently in `next.config.ts` (`import path from 'node:path'`).

## Rationale

- SOLID/CUPID: Selector hooks provide interface segregation and predictable behavior; avoid overexposing store internals.
- Performance: Narrow selectors reduce unnecessary re-renders while staying idiomatic for Zustand.
- Maintainability: Single canonical `Theme` type and a single `SidebarSection` domain prevent drift.
- Platform thinking: Leaves optionality for future selectors and features without breaking contracts.

## Consequences

- Tests and consumers import `Theme` from `@/types/layout` and rely on selector hooks instead of ad hoc selection.
- Clear guidance: developers use the public hooks or minimal `useLayoutStore` selections.
- No backwards-compat baggage (greenfield).

## Alternatives Considered

- Extend `SidebarSection` with VS Code-like variants (rejected as unnecessary for domain fit).
- Keep local `Theme` aliases in components (rejected due to duplication and drift risk).
- Expose a composed store API in addition to `useLayoutStore` (rejected to avoid surface duplication).

## Implementation Notes

- Types
  - `src/types/layout/index.ts`: export `Theme` from preferences; re-used across components and tests.
  - `src/components/layout/theme-toggle.tsx`: import `Theme` from `@/types/layout`.

- Store
  - `src/stores/layout/index.ts`: added selector hooks (state and actions) and public API doc block.

- Config
  - `next.config.ts`: converted to ESM import for `path`.

- Tests
  - `src/test/type-safety.test.ts`: updated to canonical `SidebarSection` values; import `Theme` from `@/types/layout`.

## Validation

- Full test suite passed (11 tests across 2 files).
- TypeScript strict mode maintained; no new `any`.

## Follow-ups

- If hydration flicker arises from persisted store, consider an explicit hydration-ready flag.
- Add short contributor note in implementation standards referencing the selector-first pattern.
