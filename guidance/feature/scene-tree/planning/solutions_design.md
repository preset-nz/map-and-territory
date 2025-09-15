Status: Draft
Last Updated: 2025-09-03

# Scene Tree & Multi-Map Campaigns – Solutions Design

## Goal

Support campaigns (volumes) with multiple maps. Each map initializes with required layers (paper, hexgrid, one terrain). Scene Tree provides selection, visibility toggles, and drag-and-drop reordering. Terrain layers (and generally all layers) are reorderable with deterministic rendering by z-order.

## Domain Model

```ts
export interface Project {
  id: string;
  version: number;
  name: string;
  maps: MapDoc[];
  activeMapId: string | null;
}
export interface MapDoc {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layers: LayerDoc[];
}
export interface LayerDoc {
  id: string;
  type: string;
  name?: string;
  visible: boolean;
  locked?: boolean;
  state: unknown;
}
```

- IDs: UUID v7 (time-ordered). Names default to "Map 1", "Map 2", etc.
- Required layers on map create: `paper`, `hexgrid`, `terrain`.

## AppAPI Extensions

```ts
export interface AppAPI {
  scene: {
    list(): { id: string; name: string }[];
    create(name?: string): string; // returns mapId; auto-add required layers
    remove(id: string): void;
    rename(id: string, name: string): void;
    select(id: string): void;
    getActiveId(): string | null;
  };

  layers: {
    add(type: string, initial?: unknown): string; // to active map
    remove(id: string): void;
    rename(id: string, name: string): void;
    move(id: string, toIndex: number): void; // reorder within active map
    setVisibility(id: string, visible: boolean): void;
    lock(id: string, locked: boolean): void;
    all(): Array<{ id: string; type: string; name?: string; visible: boolean }>;
  };
}
```

## Scene Tree UI

- Structure: Maps list (top) → Active map’s layers list (below).
- Interactions:
  - Select map → switches active map and updates canvas.
  - DnD reorder layers (z-order): Terrain can be moved; other layers follow same rules unless restricted by type policy.
  - Toggle visibility and lock per layer; inline rename.
- Slots & Contributions:
  - Plugin-provided layer types appear with icon and context menu items (slot: `layer:context`).
  - Plugins may contribute map-level actions (slot: `map:context`).

## Rendering Contract

- Z-order: Scene Tree order defines render order (bottom → top). Paper typically at bottom, but not enforced by engine to keep it generic; defaults enforce initial placement.
- Deterministic: Layer adapters draw based on state; hide if `visible=false`.

## Commands

- `app.map.new`, `app.map.delete`, `app.map.rename`, `app.map.duplicate`
- `app.layer.add:<type>`, `app.layer.remove`, `app.layer.rename`, `app.layer.move`, `app.layer.toggleVisibility`, `app.layer.lock`

## Integration Notes: Present Mode and Fog-of-War

- UI Modes (ADR-0006): Introducing `edit` and `present` modes does not change Scene Tree responsibilities. In `present` mode the Scene Tree UI is hidden by layout policy, but its data and selection state remain unaffected.
- Hex Geometry (ADR-0007): Scene operations and layer tools may rely on `AppAPI.hex` for consistent hex coordinate conversions; no direct dependency on internal store shapes.
- Fog-of-War Plugin (ADR-0008): `fogOfWar` appears as a normal layer (defaulting to top). Users can toggle visibility/lock and reorder it via the Scene Tree. No special pinning is required; defaults suffice.

## Persistence

- Project JSON persists maps array, activeMapId, layers with type and state.
- Plugin layer (de)serialization hooks remain per plugin system design.

## Defaults & Policies

- On new map, create layers in order: paper → hexgrid → terrain.
- Policy hooks (future): allow core to pin some layers (e.g., paper at bottom) while still permitting reordering for others; for MVP, no hard pinning—just sensible defaults.

## Acceptance Criteria (MVP)

- Can create multiple maps; switching updates canvas and scene view.
- New map contains paper, hexgrid, and a terrain layer by default.
- Can reorder terrain layers (and any layers) via DnD; canvas reflects order.
- Visibility toggles hide/show layers; state persists across save/load.

## Testing Strategy

- Unit: ordering operations (`move`) produce expected layer arrays and render order.
- E2E: create two maps, add/remove/reorder layers, verify canvas output changes.
- Persistence: round-trip save/load preserves map and layer order/state.

## Delegation (Subagents)

- Scene Tree UI: list + DnD, context menus, icons, inline rename.
- Scene/Layer Services: map lifecycle, active selection, layer CRUD, ordering.
- Persistence: project schema updates and migrations.
- Commands: register commands and toolbar bindings (e.g., scene toolgroup buttons).
