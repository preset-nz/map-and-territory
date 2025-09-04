## TODOs

- Workflow: document agent Git workflow in `AGENTS.md` (branch naming, lint/test gates, PR protocol). (Done)
- Layering model: make stacking intuitive and consistent across sidebar, renderers, and insertion/duplication. Decide canonical order (array order vs. fixed sentinels), fix insertion semantics, and add tests + UI indicators (e.g., z-order badges/arrows).
- Theming audit: run `guidance/process/theming_audit_checklist.md` and address findings (tokens, contrast, states, dark-mode gaps).
- Dark mode toggle: expose a visible toggle in header; wire to `useLayoutStore().theme` and verify all views in dark. (Done)
- Plugin toolbar: remove any hardcoded tool buttons; ensure the toolbar is fully contribution-driven (commands + groups + order), with disabled tooltips and capability gating.
- Terrain colors injection: remove hardcoded colors from renderers; source from a map “setting”/palette or theme tokens. Provide a small API/context for layers to read current palette.
- Layer rename: enable inline renaming in the scene panel (store already supports `renameLayer`).
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
