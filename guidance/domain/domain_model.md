# Domain Model: Campaigns, Maps, Layers

Purpose: establish a clear, testable domain model that drives state, persistence, and rendering adapters. This model is rendering‑engine agnostic and aligns with our plugin system.

## Naming
- Canonical term: Campaign (container for multiple maps). In code we currently use `Project` in places; treat it as an alias of Campaign for now. Plan a rename when low‑risk.

## Entities

### Campaign
- Fields
  - `id: string` — stable UUID
  - `version: number` — schema version for migrations
  - `name: string`
  - `description?: string`
  - `maps: Map[]`
  - `activeMapId: string | null`
- Invariants
  - `id` unique; `activeMapId` ∈ `maps[].id | null`
  - Version increments only via migration

### Map
- Fields
  - `id: string`
  - `name: string`
  - `description?: string`
  - `visible: boolean` — included in editors/navigation; not a render toggle for individual views
  - `paper: { aspect: 'square' | '4:3' | '16:10'; color: string }` — paper/aspect metadata
  - `layers: Layer[]` — ordered top‑to‑bottom
- Invariants
  - Layer order defines z‑stack; index 0 is bottom
  - Exactly one Paper layer is recommended (policy enforces max instances)

### Layer (instance)
- Fields (common)
  - `id: string`
  - `type: string` — references a registered layer type (plugin registry)
  - `name?: string`
  - `visible: boolean`
  - `opacity?: number` — default 1.0; [0..1]
  - `blendMode?: BlendMode` — default `normal`
  - `locked?: boolean` — prevents edits/hit‑test
  - `state: unknown` — type‑specific serializable state
- Invariants
  - `type` must be registered in Layer Registry
  - `state` must validate against the layer type’s schema

### Layer Type (definition)
- Registered by core or plugins
- Shape (conceptual)
```ts
interface LayerDefinition<State> {
  id: string;            // unique type id, e.g., 'paper', 'hexgrid'
  title: string;         // UI label
  defaultState: State;   // serializable default state
  schema?: unknown;      // validation schema (Valibot/Zod compatible)
  policy?: {
    canDelete?: boolean;     // default true
    canDuplicate?: boolean;  // default true
    maxInstances?: number;   // e.g., Paper: 1
  };
}
```

## Identifiers & Addressing
- IDs: UUIDv7 (see ADR-0012). Required for all new entities.
- Addressing paths (stable across stores and renderer diffs):
  - Campaign: `campaign:{id}`
  - Map: `map:{mapId}`
  - Layer: `layer:{layerId}`
  - Optional path strings for nested state: `layer:{layerId}.state.path.to.field`

## Operations (high‑level)
- Campaign
  - create, rename, setDescription, setActive
- Map
  - add, rename, setDescription, delete
  - setVisibility, setPaperAspect, setPaperColor
- Layer
  - add(typeId, name?), remove, duplicate, move(toIndex)
  - rename, setVisibility, setOpacity, setBlendMode, setLocked
  - patchState(patch)
- Invariants enforced by layer policy (e.g., Paper maxInstances=1)

## Events & Diffs (for rendering adapters)
- Events emitted after domain mutations; adapters consume and translate to render ops.
```ts
// Illustrative minimal bus payloads
 type DomainEvent =
  | { kind: 'MapAdded'; map: Map }
  | { kind: 'MapRemoved'; mapId: string }
  | { kind: 'LayerAdded'; mapId: string; layer: Layer }
  | { kind: 'LayerRemoved'; mapId: string; layerId: string }
  | { kind: 'LayerMoved'; mapId: string; layerId: string; toIndex: number }
  | { kind: 'LayerToggled'; mapId: string; layerId: string; visible: boolean }
  | { kind: 'LayerProps'; mapId: string; layerId: string; opacity?: number; blendMode?: BlendMode; locked?: boolean }
  | { kind: 'LayerPatched'; mapId: string; layerId: string; patch: unknown };
```
- Render backends should implement a compact diff protocol per map that avoids full redraws.

## Persistence
- JSON serialization of Campaign is the source of truth; includes all maps and layers with state.
- `version` used for migrations; write a small migration runner for future schema changes.
- File format: `application/vnd.map-territory+json;version={n}`

## Stores & Selection
- Zustand slices hold Campaign and UI selection state.
- Selection
  - Single: `selection = { kind: 'campaign' | 'map' | 'layer', id }`
  - Multi‑select (future): `selection = { kind: 'layers', ids: string[] }`
- Properties Panel binds to selection and edits via domain operations (not via render graph).

## Validation
- Layer state validated on mutation using the LayerDefinition schema (Valibot/Zod pattern).
- Common constraints: name non‑empty (UI may allow transient empty), opacity in [0..1], maxInstances, etc.

## Extensibility (Plugins)
- Plugins register LayerDefinitions at startup.
- Plugins must not directly mutate stores; they dispatch domain operations.
- Rendering: plugins can register display strategies per layer type in the rendering backend (behind an adapter API), not touch Pixi directly.

## Roadmap
- Add Items under Layers (tiles, vector strokes, text runs) with their own IDs and diffs.
- Define a normalized chunk model for tile layers to support partial updates and culling.
- Introduce BlendMode enum that maps to CSS/Canvas/Pixi backends consistently.
- Formalize a path‑based patching API (`patch(layerId, path, value)`).

## Alignment
- Matches current `src/stores/project` structure and layer registry.
- Consistent with the Rendering Proposal and Pixi Scene Graph docs: domain‑as‑source‑of‑truth, render adapters consume diffs.
