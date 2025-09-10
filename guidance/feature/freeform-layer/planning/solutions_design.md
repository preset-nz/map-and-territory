---
ticket: T-017
feature: Freeform Layer (Hex Paint)
author: @lead-developer
date: 2025-09-09
level: 2
status: Draft
---

## Overview & Assumptions

- Goal: a manual, palette-aware hex fill layer with `paint`/`erase` tools.
- Reuse existing seams: AppAPI hex routing, layer registry, properties schema, canonical layer ordering (paper bottom, grid top).
- MVP keeps brush to single-hex radius and uses map/campaign palette. Future tools will extend brush behavior without changing storage.

## Interfaces & Contracts

- Layer Type (`src/layers/adapters/freeform-hex.ts`):
  - `id: "freeform"`, `title: "Freeform"`.
  - `defaultState`:
    - `cells: Record<string, { terrainId?: string; color?: string }>` — sparse axial map keyed by `"q,r"` (supports multiple terrain types/colors per layer).
    - `opacity: number` (0..1, default 1).
    - `brush: { terrainId?: string; color?: string }` — current brush selection (Properties set brush; painting writes per‑cell choice).
  - `adapter.drawMain(ctx, state, env)` — draw filled hexes using `env.grid.size`/`orientation`.
  - `adapter.getInvalidationKey(state)` — stable summary (e.g., `freeform:<count>:<hash(keys)>:<opacity>`).
  - Optional `serialize/deserialize` for forward‑compat chunking later.

- Properties Schema (`registerPropertySchema("layer:freeform", …)`):
  - Group: Freeform
  - Fields: `opacity` (slider), `terrainId` (select), `color` (color override; when set, supersedes terrain color). UI copy clarifies Terrain sets brush.

- Toolbar contribution (built‑in plugin or host commands):
  - Add layer: `layer.freeform.add` (enableWhen: `hasActiveMap`).
  - Tools: `tool.freeform.paint`, `tool.freeform.erase` set `useLayoutStore().setActiveTool("paint"|"erase")` (enableWhen: `hasActiveLayer:freeform`).

- Canvas Viewport integration (`src/components/map/canvas-viewport.tsx`):
  - Pointer handlers gate on: active map, selected layer kind `freeform`, and active tool in {`paint`,`erase`}.
  - On pointer down/move (pressed): compute axial via `AppAPI.hex.fromPoint(point, layout)` where `layout` is derived from visible `hexgrid`.
  - Update selected layer state via `useProjectStore().updateLayerState(layerId, patch)`:
    - Paint: `cells[key] = { terrainId: brush.terrainId, color: brush.color }`.
    - Erase: delete `cells[key]`.

### Shared Hex Utilities (Composition over inheritance)

- Add `src/layers/hex-utils.ts` consumed by Freeform (and later by Grid/Noise):
  - `axialKey(q,r)` / `parseAxialKey(k)` — stable keys for sparse maps.
  - `centerFor(axial, layout)` — wraps `lib/hex.toPoint`.
  - `hexPath(ctx, center, layout)` — builds a hex polygon path given size/orientation; used by adapters to fill/stroke.
  - Rationale: reduce duplication without introducing inheritance; migrate existing adapters in a follow‑up ticket.

## Data/State Changes

- New layer state shape (sparse map):
  ```ts
  interface FreeformCell {
    terrainId?: string;
    color?: string;
  }
  interface FreeformState {
    cells: Record<string, FreeformCell>;
    opacity: number; // default 1
    brush?: { terrainId?: string; color?: string };
  }
  ```
- Rendering uses palette lookup when `terrainId` present and `color` missing.
- Invalidation key strategy (MVP): `count` + `lastModifiedKey` + `opacity` to avoid large keys; acceptable for MVP visuals. Future: lightweight rolling hash.

## Rendering Details

- Resolve palette: `resolvePalette(project, activeMapId)`.
- Fill color for a cell: override `cell.color` if present; else `resolveTerrainFill(palette, cell.terrainId)`.
- Hex positioning: mirror grid draw logic using `env.grid.size` and `env.grid.orientation` for tiling. Draw filled hex polygon per cell’s axial coordinate.
- Z‑order: adapter draws in its slot; grid remains last per ADR‑0013.

## Testing Strategy

- Unit
  - Adapter invalidation key changes on `cells` edits and `opacity` changes.
  - Color resolution prefers `cell.color` over palette terrain.
  - Registry: type registers/unregisters correctly.
- Integration (React)
  - CanvasViewport paints a cell when `paint` tool is active and a freeform layer is selected (simulate pointer events; assert store state).
  - Erase removes a painted cell and triggers redraw.
  - Properties panel updates brush `terrainId`/`color` and `opacity` with re-render; verify mixing multiple terrain types within one layer.
- E2E (Playwright)
  - Create campaign → map → add freeform layer; select paint via toolbar; drag paints multiple hexes; toggle erase and remove one; screenshots compare or DOM/text probes confirm state length via UI indicator.

## Impact/Risks

- Perf: Sparse map is O(1) per op; rendering loops only painted cells, not full tiling. Avoid per‑frame iterating over every possible hex.
- DX/UX: Clear gating — paint/erase disabled unless a freeform layer is selected and hexgrid is visible; tooltips explain why.
- ADR links: ADR‑0002 (Plugin Architecture), ADR‑0006 (Toolbar Structure Policy), ADR‑0007 (Layer Rendering & Masking), ADR‑0013 (Canonical Layer Order & Anchors).

## Open Questions

- Should brush color selection live in a global tool palette vs. per‑layer properties? MVP uses layer properties to avoid introducing a new global palette UI.
- Do we need versioning for `cells` to support chunk streaming? Not for MVP; include `serialize/deserialize` hooks for future.

References: process/AGENTS.md, process/implementation_standards.md, process/testing_standards.md, feature/hexgrid/\*, appapi-hex-pointer-routing docs.
