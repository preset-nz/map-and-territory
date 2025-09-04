## TODOs

- NEXT — Layer naming UX: default numbering + properties‑panel rename. When inserting a layer without a provided name, default to `<Layer Title> <n>` where `n` is the next available number for that type within the active map (e.g., `Hex Noise 1`, `Hex Noise 2`). Add a `Name` field for selected layer in the Properties panel (parity with Campaign/Map) wired to `renameLayer`. Optional later: inline rename in scene panel (click/F2) if needed after parity lands. E2E: create 2 Hex Noise layers and assert numbered names; rename via Properties persists; duplicate preserves “Copy” suffix and does not renumber others.
- Workflow: document agent Git workflow in `AGENTS.md` (branch naming, lint/test gates, PR protocol). (Done)
- Layering model: align implementation and UI with ADR‑0013 (anchors + insertion semantics). Verify array order is the single source of truth, anchors are fixed (paper bottom, hexgrid top), and scene panel mirrors top‑of‑render at top of list. Add/confirm tests. (Done)
- Theming audit: run `guidance/process/theming_audit_checklist.md` and address findings (tokens, contrast, states, dark-mode gaps).
- Plugin toolbar: remove any hardcoded tool buttons; ensure the toolbar is fully contribution-driven (commands + groups + order), with disabled tooltips and capability gating.
- Terrain colors injection: remove hardcoded colors from renderers; source from a map “setting”/palette or theme tokens. Provide a small API/context for layers to read current palette.
- Layer reorder: add drag-and-drop or up/down controls in the scene panel (store has `moveLayer`).
- Map properties: remove “visibility” control from the map item in the properties panel; keep map visibility implicit via selection/active map. (Done)
- Layers UX: design pass on layers panel (grouping, icons, reordering affordances, lock/visibility consistency, insertion feedback) with a short spec + mocks.
- Map “setting” palettes: define map-level settings (e.g., high fantasy vs. grimdark) to control terrain categories and colors; noise paint mode should read from these palettes.
- Hex lib polish: add dual-ended slider UI for clamp min/max and consider remap-within-range option.
- Camera: add zoom/pan and integrate into pointer→hex mapping; verify status bar and renderers.
- AppAPI.hex integration: surface hex utilities and pointer→hex via `AppAPI.hex` per ADR-0007; add unit/integration tests.
- Invalidation API: formalize `adapter.getInvalidationKey(state)` as required for visual layers; migrate any ad-hoc keys to adapter-provided.
- Performance pass: profile hex noise + grid drawing, consider batching or caching, and verify worker/fallback parity.
- E2E coverage: add Playwright tests for toolbar enablement, layer insert/reorder/rename, and noise mode switching.
- Save/Load Campaign: implement export/import of campaign state (JSON) with versioned schema; add UI in header or menu and tests; consider localStorage autosave for convenience.

See ticket breakdown and priorities in guidance/tickets.md.
