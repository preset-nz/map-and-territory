# Product Backlog — Tickets (MoSCoW + Priority)

Legend: [M] Must, [S] Should, [C] Could. Cross‑links use ticket IDs.

References

- ADR-0002 Plugin Architecture: guidance/adrs/0002-plugin-architecture.md
- ADR-0007 Hex Geometry & Routing: guidance/adrs/0007-appapi-hex-geometry-and-hit-test.md
- Theming Audit: guidance/process/theming_audit_checklist.md
- TODOs Overview: guidance/todos.md

---

T-004 [M] AppAPI.hex + Pointer Routing

- Goal: Surface hex library via AppAPI and route pointer→hex through it.
- Dependencies: ADR-0007
- Links: ADR-0007, src/lib/hex/\*, public AppAPI surface (to be added)
- Acceptance:
  - AppAPI.hex exposes fromPoint/toPoint + kernels.
  - Pointer events use AppAPI; integration tests validate hex coordinates.

T-005 [M] E2E Baseline

- Goal: Guard core flows.
- Tests: toolbar enablement, layer insertion/duplication order, hex noise mode switching.
- Links: src/test/e2e/\* (add new specs)
- Acceptance: Tests green in CI, deterministic.

T-006 [S] Palette Injection for Terrain

- Goal: Remove hardcoded terrain colors; use map‑level palette provider.
- Links: src/render/backends/canvas2d.ts, src/components/map/canvas-viewport.tsx
- Acceptance:
  - Terrain colors sourced from palette; changing palette updates render.
  - Unit tests for palette application.

T-007 [S] Layers UX Foundations

- Goal: Clear affordances for visibility, stacking, selection; insertion feedback.
- Deliverables: Short spec + mocks; minimal icons and labels.
- Links: src/components/layout/app-sidebar.tsx
- Acceptance: Spec approved; initial UX implemented matching T-001 semantics.

T-008 [S] Layer Reorder + Rename

- Goal: Reordering (DnD or up/down) and inline rename in scene panel.
- Links: src/stores/project/index.ts, src/components/layout/app-sidebar.tsx
- Acceptance: Users can reorder and rename; tests ensure correct persistence and rendering order.

T-009b [S] Theming Audit

- Goal: Run checklist, fix token/contrast issues; verify components.
- Links: theming_audit_checklist.md
- Acceptance: Checklist complete; all views readable in dark and light; tokens updated.

T-010 [S] Camera Zoom/Pan

- Goal: Add camera state with zoom/pan; integrate into renderers and pointer→hex.
- Links: src/render/backends/canvas2d.ts, src/components/map/canvas-viewport.tsx
- Acceptance: Zoom/pan works; status bar positions correct; tests updated.

T-011 [C] Dual‑Ended Slider for Clamp

- Goal: Replace two number inputs with a two‑handle slider component; keep numeric inputs as fallback.
- Links: src/components/properties/\*, hex noise schema
- Acceptance: Slider adjusts [min,max] with keyboard/mouse; values persist and redraw.

T-012 [C] Map Settings / Palettes

- Goal: Define settings (e.g., high fantasy vs grimdark) that provide terrain categories and colors.
- Links: store model for map settings, palette provider; noise layer reads palette.
- Acceptance: Switching setting updates paint mode colors; tests for mapping.

T-013 [C] Performance Pass

- Goal: Profile grid + noise; add caching/batching if beneficial; ensure worker/fallback parity.
- Acceptance: Documented measurements; any optimizations covered by unit tests.

T-014 [C] E2E Expansion

- Goal: Extend E2E for rename/reorder flows, palette switching, dark mode visuals.
- Acceptance: New specs green and stable.

T-015 [M] Save/Load Campaign

- Goal: Export/import campaign (JSON) with versioned schema; minimal UI.
- Links: src/components/layout/app-header.tsx (menu/buttons), src/stores/project/index.ts (serialize/deserialize)
- Acceptance:
  - Save downloads JSON with version field; Load restores project/maps/layers; tests for round‑trip.
  - Optional localStorage autosave enabled behind a toggle.

Dependencies & Order

- Phase 1: T-004, T-005, T-015
- Phase 2: T-006, T-007, T-008, T-009b, T-010
- Phase 3: T-011, T-012, T-013, T-014

---

Working Notes

- Keep SOLID/CUPID: Layer adapters remain small and composable; AppAPI stays narrow and selector‑based.
- Platform thinking: early investment in layering, invalidation, and AppAPI yields long‑term extensibility.
