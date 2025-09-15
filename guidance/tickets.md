# Product Backlog — Tickets (MoSCoW + Priority)

Legend: [M] Must, [S] Should, [C] Could. Cross‑links use ticket IDs.

References

- ADR-0002 Plugin Architecture: guidance/adrs/0002-plugin-architecture.md
- ADR-0007 Hex Geometry & Routing: guidance/adrs/0007-appapi-hex-geometry-and-hit-test.md
- Theming Audit: guidance/process/theming_audit_checklist.md
- TODOs Overview: guidance/todos.md

---

T-007 [S] Layers UX Foundations

- Goal: Clear affordances for visibility, stacking, selection; insertion feedback.
- Deliverables: Short spec + mocks; minimal icons and labels.
- Links: src/components/layout/app-sidebar.tsx
- Acceptance: Spec approved; initial UX implemented matching T-001 semantics.

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

T-013 [C] Performance Pass

- Goal: Profile grid + noise; add caching/batching if beneficial; ensure worker/fallback parity.
- Acceptance: Documented measurements; any optimizations covered by unit tests.

T-014 [C] E2E Expansion

- Goal: Extend E2E for rename/reorder flows, palette switching, dark mode visuals.
- Acceptance: New specs green and stable.

Dependencies & Order

- Phase 1: T-020
- Phase 2: T-023, T-007, T-008, T-009b, T-010
- Phase 3: T-011, T-013, T-014, T-018

---

Working Notes

- Keep SOLID/CUPID: Layer adapters remain small and composable; AppAPI stays narrow and selector-based.
- Platform thinking: early investment in layering, invalidation, and AppAPI yields long-term extensibility.
- Interdependencies Refactor Migration: when a ticket touches plugins/tools, ensure adoption of the `ToolContext` seam (no `@/stores/**` imports) and leave lint passing with zero warnings.

---

T-018 [S] Consolidate Hex Utilities

- Goal: Migrate Hex Grid and Hex Noise adapters to shared hex utilities introduced for Freeform (centerFor, hexPath, axialKey).
- Deliverables: refactor adapters to use `src/layers/hex-utils.ts`; remove duplicated tiling/path math where safe; add unit tests.
- Links: src/layers/adapters/hexgrid.ts, src/layers/adapters/hex-noise.ts, src/layers/hex-utils.ts
- Acceptance:
  - Adapters compile and render identically (snapshot or pixel-diff tolerance acceptable).
  - Unit tests for utils; integration tests remain green.
  - No behavioral regressions in E2E.

---

---

T-020 [M] Batched Layer State Mutations

- Goal: Efficiently apply large edits (e.g., flood fill) with a single render invalidation.
- Deliverables:
  - Store API: `applyLayerState(layerId, updater)` using immer OR `applyCellsDelta(layerId, { set: Record<key,cell>; del: string[] })`.
  - Ensure renderer recomputes once per batch; avoid intermediate re-renders.
- Links: src/stores/project/index.ts, freeform layer docs
- Acceptance:
  - Applying 1k cell edits executes <50ms in local tests on baseline hardware.
  - Invalidation key updates once per batch.
  - Unit tests cover add/remove/replace semantics.

---

T-023 [S] Freeform Flood Fill Tool

- Goal: Add bucket/flood fill to Freeform layer using hex neighbors.
- Deliverables:
  - Command + toolbar item: `tool.freeform.fill` with proper enablement (`activeLayerIs:freeform`, `gridVisible`).
  - BFS/DFS fill based on `AppAPI.hex.neighbors()` with bounds: paper rect, max-hex cap, and optional mode (empty-only vs. same-value).
  - Uses T-020 batch API to apply changes in one commit.
- Links: src/plugin/builtin/freeform.ts, src/components/map/canvas-viewport.tsx, AppAPI.hex
- Acceptance:
  - Unit: fill region sizing and boundary conditions.
  - Integration: pointer triggers fill; store state updates as a single batch; visual re-render occurs once.
  - Guardrail: hard cap prevents runaway fills (configurable).
