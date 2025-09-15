Status: Draft
Last Updated: 2025-09-03

# Plugin System – Dependency-Driven Task Plan

This plan sequences work by extension-point dependencies. Each task lists outputs, dependencies, and tests. Critical path is marked [CP].

## Milestones

M0 – Foundations [CP]

- T0.1 IDs & Types: ULID/UUIDv7 util, type aliases for `PluginId`, `MapId`, `LayerId`. Output: `@/types/core`. Tests: id format.
- T0.2 Event Bus & Logger: minimal typed pub/sub, namespaced logger. Output: `@/core/events`, `@/core/log`. Tests: subscribe/emit behavior.
- T0.3 CSP Baseline: restrict remote scripts, disable eval in dev. Output: Next.js config. Tests: config presence.

M1 – Plugin Kernel [CP]

- T1.1 Manifest Schema: Valibot schema + parser. Output: `@/plugin/manifest`. Tests: valid/invalid manifests.
- T1.2 Loader: dynamic `import()` + validation + lifecycle `activate/deactivate`. Output: `@/plugin/kernel`. Tests: activation order, error handling.
- T1.3 Capability Gating: `createPluginApi()` facade (Plugin API design). Output: `@/plugin/api`. Tests: missing-cap throws, shape snapshots.

M2 – Commands & Toolbar [CP]

- T2.1 Commands Registry: register/execute with provenance. Output: `@/plugin/commands`. Tests: handler dispatch.
- T2.2 Toolbar Slots: group registry + renderer. Output: `@/ui/toolbar`. Tests: items render by group/order.
- T2.3 Context Expressions (MVP): simple `when` evaluator (whitelist). Output: small evaluator. Tests: truthy/falsey.
- T2.4 Sample Plugin: Scene Buttons (new/save/load). Output: sample manifest/module. Tests: e2e flow.

M2.5 – New Campaign Plugin

- T2.5.1 Manifest + Toolbar: `campaign` group, `app.campaign.new` command, icon `ri:file-plus`, shortcut `Mod+Shift+N`. Output: sample manifest. Tests: toolbar render, shortcut triggers command.
- T2.5.2 Host Command: `host.prompt.newCampaign` to collect name/description (stub UI). Output: host command handler. Tests: mock prompt returns values.
- T2.5.3 Integration: command flow creates fresh empty project (no maps) and sets it active. Output: e2e test wiring.

M3 – Layers Core [CP]

- T3.1 Layer Registry: register layer types; defaultState + schema. Output: `@/layers/registry`. Tests: add/get type.
- T3.2 Render Pipeline: main + scene view, ordered by z-index, visibility. Output: `@/render/pipeline`. Tests: order/visibility.
- T3.3 Scene Tree Basics: list layers, reorder, toggle visibility. Output: `@/ui/scene-tree` (MVP UI). Tests: reorder updates order.
- T3.4 Sample Layers: Paper, Hexgrid. Output: sample modules. Tests: render snapshots.

M4 – Properties Engine [CP]

- T4.1 Schema Engine: parse `PropertySchema`, bindings (path adapter), conditional visibility. Output: `@/properties/engine`. Tests: field → patch.
- T4.2 Renderer: groups/rows/widgets (number/slider/select/toggle/color/text/angle/vec2). Output: `@/properties/ui`. Tests: user input → patch.
- T4.3 Schemas: paper, hexgrid. Output: contributed schemas. Tests: integration with sample layers.

M5 – Persistence & Defaults [CP]

- T5.1 Project Schema: maps[], activeMapId, layers[]. Output: `@/project/schema`.
- T5.2 Default Creation Policy: implement ADR-0003 in `scene.create()`. Output: `@/scene/service`. Tests: default layers order.
- T5.3 Save/Load Roundtrip. Output: `@/project/io`. Tests: round-trip integrity.
- T5.4 Project Metadata: name/description stored and surfaced in UI header. Tests: persistence and display.
- T5.5 Empty State: scene tree shows CTA when no maps exist. Tests: UI state reflects empty project.

M6 – Terrain & Paint Tool [CP]

- T6.1 Terrain Layer: state/schema, render adapters, properties. Output: layer module + schema. Tests: render + properties.
- T6.2 Tool Registry & Pointer Router: active tool, event dispatch. Output: `@/tools/registry`. Tests: pointer lifecycle.
- T6.3 Paint Tool: modify terrain cells; undo/redo. Output: tool module. Tests: paint → state change → render.

M7 – Hardening & E2E

- T7.1 Contract Tests: capabilities across API facets.
- T7.2 Error Boundaries & Timeouts for handlers.
- T7.3 Performance Pass: basic profiling, debounced sliders, minimal re-renders.

## Critical Path Summary

M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7

## Dependencies (Graph Excerpts)

- Scene Buttons depends on: Kernel + Commands + Toolbar.
- Paper/Hexgrid depend on: Layer Registry + Render Pipeline.
- Properties depend on: Layer Schemas (paper/hexgrid) + Schema Engine.
- Terrain depends on: Layers Core + Persistence.
- Paint Tool depends on: Tool Registry + Terrain + Render Pipeline.

## Open Decisions (Blockers to Start)

1. Icon System: source (shadcn/radix? custom), id conventions.
2. Shortcut Library: which lib or custom map for `Mod+*`.
3. Expression Evaluator: `when`/`disabled` mini-language scope for MVP.
4. Undo/Redo: patch journaling API and scope (scene/layers only for MVP).
5. ID Scheme: ULID vs UUIDv7 (prefer UUIDv7 for sortability).

## Definition of Done (Per Milestone)

- Contracts documented, types exported from `@/plugin` (or `@/types`), and passing tests per Testing Standards.
- Sample(s) for that milestone load and function through UI.
- Docs updated (solutions design deltas) and ADR references where applicable.

## Delegation Map (Roles)

- Plugin Kernel: @runtime-architect, @security-agent
- Commands/Toolbar: @ui-architect, @interaction-agent
- Layers/Rendering: @rendering-engineer, @layer-architect
- Properties: @ux-systems-designer, @forms-engineer
- Persistence/Scene: @data-engineer, @state-manager
- Tools/Paint: @input-systems, @terrain-specialist
- QA: @quality-agent (contract/e2e/perf)
