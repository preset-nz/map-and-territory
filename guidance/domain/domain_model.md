# Domain Model: Campaigns, Maps, Layers

Purpose: establish a clear, testable domain model that drives state, persistence, and rendering adapters. This model is rendering‑engine agnostic and aligns with our plugin system.

## Naming

- Canonical term: Campaign (container for multiple maps). As of 2025‑09‑11 the codebase and APIs are standardized on Campaign (store: `useCampaignStore`). No `Project` alias remains.

## Entities

### Campaign

- Fields
  - `id: string` — UUIDv7
  - `version: number` — schema version for migrations
  - `name: string`
  - `description?: string`
  - `notes?: string` — freeform, multi-line user notes
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
  - `notes?: string` — freeform, multi-line map notes
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
  - `description?: string`
  - `notes?: string` — freeform, multi-line; e.g., how this layer is used
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
  id: string; // unique type id, e.g., 'paper', 'hexgrid'
  title: string; // UI label
  defaultState: State; // serializable default state
  schema?: unknown; // validation schema (Valibot/Zod compatible)
  policy?: {
    canDelete?: boolean; // default true
    canDuplicate?: boolean; // default true
    maxInstances?: number; // e.g., Paper: 1
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

Notes

- Add `setNotes(entityRef, text)` for Campaign, Map, and Layer. Properties Panel should surface a read/write Notes field for the selected entity.

## Events & Diffs (for rendering adapters)

- Events emitted after domain mutations; adapters consume and translate to render ops.

```ts
// Illustrative minimal bus payloads
type DomainEvent =
  | { kind: "MapAdded"; map: Map }
  | { kind: "MapRemoved"; mapId: string }
  | { kind: "LayerAdded"; mapId: string; layer: Layer }
  | { kind: "LayerRemoved"; mapId: string; layerId: string }
  | { kind: "LayerMoved"; mapId: string; layerId: string; toIndex: number }
  | { kind: "LayerToggled"; mapId: string; layerId: string; visible: boolean }
  | {
      kind: "LayerProps";
      mapId: string;
      layerId: string;
      opacity?: number;
      blendMode?: BlendMode;
      locked?: boolean;
    }
  | { kind: "LayerPatched"; mapId: string; layerId: string; patch: unknown };
```

- Render backends should implement a compact diff protocol per map that avoids full redraws.

## Persistence

- JSON serialization of Campaign is the source of truth; includes all maps and layers with state.
- `version` used for migrations; write a small migration runner for future schema changes.
- v1 file format (no backward compatibility required):
  - MIME: `application/vnd.map-territory+json;version=1`
  - Root shape: `{ "version": 1, "campaign": { ... } }`

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

## Core Layer Types (Built‑in)

Establish Paper and Hex Grid as first‑class layer types in the domain and registry. Their states are serializable and validated.

### Paper Layer

- Type ID: `paper`
- Policy: `{ canDelete: false, canDuplicate: false, maxInstances: 1 }`
- Default placement: bottom of stack on new Map
- State (example)

```ts
interface PaperState {
  aspect: "square" | "4:3" | "16:10";
  color: string; // hex color token
  texture?: string; // optional texture id (SVG/pattern)
  intensity?: number; // 0..1 blend strength
  grain?: number; // 0..1 amount of paper grain
}
```

### Hex Grid Layer

- Type ID: `hexgrid`
- Policy: `{ canDelete: false, canDuplicate: false, maxInstances: 1 }`
- State (example)

```ts
interface HexGridState {
  size: number; // hex size in px or map-units
  orientation: "pointy" | "flat";
  color: string; // stroke color
  opacity?: number; // 0..1
  showCoords?: boolean;
  offset?: { x: number; y: number };
}
```

Notes

- These match our current built‑ins and provide a stable reference for presets and properties. Plugins should follow the same pattern: stable `type` id + validated `state`.

- Matches current `src/stores/campaign` structure and layer registry.
- Consistent with the Rendering Proposal and Pixi Scene Graph docs: domain‑as‑source‑of‑truth, render adapters consume diffs.
