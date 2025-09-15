Status: Draft
Last Updated: 2025-09-03

# Plugin System – Request Index & Prompt Template

Use this page to request new plugins rapidly. Paste the prompt template into chat, fill what you know, and I will orchestrate subagents, ask only what’s missing, and produce the design + tasks per our process.

## TL;DR – One-Liner Requests

Say one sentence and I’ll ask the right follow‑ups:

- "Add a plugin for Scene Buttons: New/Save/Load in toolbar group 'scene'."
- "Add a Terrain layer type with paint tool and properties for opacity + blend mode."
- "Add a Hexgrid layer with size and rotation controls, shown in scene + main views."

## Plugin Request Prompt (Copy/Paste)

Provide what you know; leave blanks with `?` and I’ll fill via questions.

```
REQUEST: Add a plugin for <name>

Intent & User Story:
- As a <role>, I want to <goal>, so that <value>.

Extension Points (check all that apply):
- Commands: [ ] ids: <e.g., app.scene.new, my.plugin.doX> shortcuts: <Mod+N?>
- Toolbar: [ ] group: <scene|tools|layers|...> items: <buttons binding to command ids>
- Tools: [ ] id: <e.g., paint.brush> targetLayerTypes: <['terrain']> cursor: <?>
- Layers: [ ] type: <e.g., terrain> title: <Terrain> defaultState: <?> schema notes: <?>
- Properties: [ ] scope: <scene|layer:terrain> groups/fields: <bulleted list or 'defer to custom'>
- Panels: [ ] slot: <left|right|bottom|floating> id/title: <?> purpose: <?>

UI Placement & Behavior:
- Toolbar group order: <number?> item order: <number?> icons: <ids?>
- Scene view rendering: <yes/no> Main view rendering: <yes/no>
- Selection/hit-test needed: <yes/no>

Data & Persistence:
- State fields (layer or tool): <list with types, defaults>
- Save/Load requirements: <any custom (de)serialization?>
- Migration considerations (if any): <?>

Capabilities Requested:
- [ ] scene:read  [ ] scene:write  [ ] layer:read  [ ] layer:write
- [ ] render:canvas  [ ] render:scene-view  [ ] tool:register  [ ] storage:project

Acceptance Criteria:
- <3–6 bullet points>

Open Questions for You:
- <anything you want me to ask/decide>
```

## What I Will Do (Orchestration)

- Map request → contributions (commands, toolbar, tools, layers, properties, panels).
- Confirm capabilities and finalize `AppAPI` usage per Plugin API design.
- Produce: solutions design delta, manifest sketch, module skeleton outline, tasks, and test plan.
- Ensure consistency with ADR-0002 (plugin architecture) and ADR-0003 (map defaults).

## Follow‑Up Questions I May Ask

- Commands: exact ids, labels, tooltips, shortcuts, when-conditions.
- Toolbar: group and ordering; icons and labels.
- Layer: type id, defaults, schema fields, draw behavior; whether it supports hit-test.
- Tool: pointer behavior, constraints (target layers), cursor, pressure/size.
- Properties: groups/fields, bindings, conditional visibility, widget kinds.
- Panels: slot, layout, interactions; how it coordinates with properties/tools.
- Performance: expected size of data; need for debounced updates.
- Security: any remote assets or elevated capabilities needed.

## Quick Examples

1. Scene Buttons Plugin

```
REQUEST: Add a plugin for Scene Buttons
Intent: Quick access to create/save/load maps.
Extensions: Commands [app.scene.new|save|load], Toolbar [group: scene with 3 buttons]
Capabilities: scene:write, storage:project
Acceptance: Buttons show in 'scene' group; commands work; project saves round-trip.
```

2. Terrain Layer + Paint Tool

```
REQUEST: Add a plugin for Terrain + Paint
Intent: Paint terrain onto maps.
Extensions: Layer [type: terrain], Tool [id: paint.brush target: terrain], Properties [opacity, blendMode]
Rendering: scene+main; hit-test: yes
Capabilities: layer:read|write, tool:register, render:canvas
Acceptance: Paint modifies terrain; undo/redo; properties update rendering.
```

3. Hexgrid Layer

```
REQUEST: Add a plugin for Hexgrid Layer
Intent: Configurable hex grid overlay.
Extensions: Layer [type: hexgrid], Properties [size, rotation]
Rendering: scene+main; hit-test: optional
Capabilities: layer:read
Acceptance: Grid renders correctly; properties update live; persists across save/load.
```

## Outputs You Can Expect

- Updated solutions design (only the diff relevant to your plugin).
- Manifest sketch (ids, capabilities, contributions) ready for implementation agents.
- Module skeleton outline for handlers/adapters.
- Task list for subagents including tests mapped to acceptance criteria.

## References

- Solutions Design: `planning/solutions_design.md`
- Plugin API: `planning/plugin_api_design.md`
- Properties System: `planning/properties_system_design.md`
- ADRs: `guidance/adrs/0002-plugin-architecture.md`, `guidance/adrs/0003-map-default-creation-policy.md`
