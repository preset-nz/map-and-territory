Status: Draft
Last Updated: 2025-09-03

# Plugin API – Capability-Gated Surface

## Goal

Expose a minimal, stable, capability-gated `AppAPI` to plugins so they can contribute tools, layers, UI, and workflows without direct access to internal stores or unsafe browser capabilities.

## Principles

- Default deny: capabilities explicitly grant access; no capability → no method.
- Facade over internals: never pass store references; only pass pure functions with validation.
- Deterministic and testable: commands and render adapters are pure at the edges.
- Namespaced & auditable: all registrations and events carry `pluginId` provenance.
- Backward-compatible: API is versioned; deprecations staged.

## Versioning

- `apiVersion: '1.0'` declared by host; plugins may declare `requiresApi: '^1.0'` in manifest.
- Minor-compatible changes add optional methods or fields; breaking changes bump major.

## Capabilities → API Facets

Capabilities are declared in the manifest (ADR-0002). The API provider constructs a per-plugin facade exposing only allowed facets.

- `scene:read`
  - `scene.getActiveId()`
  - `scene.list()`
- `scene:write`
  - `scene.create(name?)`, `scene.remove(id)`, `scene.rename(id, name)`, `scene.select(id)`, `scene.load(json)`, `scene.save()`
- `layer:read`
  - `layers.all()`, `layers.getById(id)`
- `layer:write`
  - `layers.add(type, initial?)`, `layers.update(id, patch)`, `layers.remove(id)`, `layers.rename(id, name)`, `layers.move(id, toIndex)`, `layers.setVisibility(id, v)`, `layers.lock(id, v)`
- `tool:register`
  - `tools.register(id, adapter)`, `tools.activate(id)`, `tools.active()`
- `render:canvas`
  - `render.requestFrame()`
- `storage:project`
  - `storage.get()`, `storage.set(next)` (project-scoped; plugin-private slot described below)

Future (Phase 2): scoped capabilities (e.g., `layer:write:terrain`) and network/file caps.

## API Construction (Runtime Gating)

`createPluginApi(pluginId, manifestCaps, hostServices)` returns a frozen object exposing only allowed methods. Each method:

- Validates input (ids, types) against the active project state.
- Enforces invariants (e.g., layer type exists, indices in range).
- Produces domain actions that integrate with undo/redo and re-render scheduling.
- Logs usage with `{ pluginId, action, payload: redactedMeta }` for audit.

If a method is called without capability, throw a typed `PluginCapabilityError` and optionally soft-disable the offending plugin.

## Data Shaping & Safety

- All reads return plain JSON-serializable snapshots (no live refs).
- All writes are via explicit methods; patches are shallow partials validated against layer schemas (Valibot) where applicable.
- The returned API object is deeply frozen to prevent mutation.

## Namespacing & Registration

- Commands: plugins must use a namespaced id (`<pluginId>.<name>`). Host may expose select core commands under `app.*` for common flows.
- Tools: plugin tool ids are namespaced; activation state is global but provenance is tracked.
- Layers: plugins register layer types via manifest; instances created via `layers.add(type)`.
- Panels/Properties: contributions are declared in manifest; rendering is orchestrated by host through slots.

## Event Bus

- Typed pub/sub with topic allowlist. Example topics: `scene.changed`, `layers.changed`, `selection.changed`.
- Capability-guarded: read-only caps may subscribe; write caps may also emit to limited plugin topics if needed (`plugin:<id>.*`).
- No direct rebroadcast of internal store events; payloads are sanitized snapshots.

## Storage Model

- Project-level storage (read/write) is available if `storage:project` is granted; used for plugin metadata saved in the project file under a reserved key `plugins[pluginId]`.
- No access to browser-wide storage from plugins in MVP; future capability may allow `local` plugin cache with quota.

## Error Handling & Isolation (MVP)

- Each command/tool handler runs inside a try/catch boundary; errors are logged with plugin provenance.
- Optional timeouts for long-running handlers to protect UX; offenders can be disabled.
- UI-facing renderers (properties/panels) wrapped in error boundaries.

## Example Capability Sets

1. Scene Buttons Plugin (New/Save/Load)

- Capabilities: `['scene:write','storage:project']`
- Access: register three commands; toolbar binds to those command ids.

2. Terrain Layer & Paint Tool

- Capabilities: `['layer:read','layer:write','tool:register','render:canvas']`
- Access: register layer type `terrain`, a `paint.brush` tool; pointer events mutate only selected terrain layers; `requestFrame()` after patch.

## Validation & Tests

- Contract tests: calling absent-capability methods throws `PluginCapabilityError`.
- Snapshot tests: API object shape per capability set.
- Integration: plugins limited to their declared capabilities still complete target workflows.

## Future Enhancements (Phase 2)

- Scoped capabilities (resource-level): `layer:write:{types: ['terrain']}`.
- Worker sandbox: proxy `AppAPI` over `postMessage` with structural cloning.
- Permissions UX: optional prompts for elevated capabilities.
- Rate limits / quotas for event emission and storage size.
