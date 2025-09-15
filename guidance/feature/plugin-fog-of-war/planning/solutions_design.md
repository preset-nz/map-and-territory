Status: Draft
Last Updated: 2025-09-03

# Fog-of-War Plugin – Solutions Design

## Intent

Deliver a plugin that renders a fog overlay for hex maps and provides reveal/hide tools operating on hex kernels, leveraging Present Mode for a play-facing canvas.

## Contributions (Manifest Sketch)

- Layers: `fogOfWar`
  - title: Fog of War
  - defaultState: `{ revealed: Set<string>, color: '#000000', opacity: 0.75, persist: true }`
- Tools:
  - `fog.reveal` → target: `fogOfWar`; options: `shape: 'circle'|'cone'|'lobe'`, `radius: number`, `dir: 0..5`, `spread60s: number`
  - `fog.hide` (optional MVP)
- Commands:
  - `fog.reset`, `fog.revealAt({q,r}, shape)`, `fog.hideAt({q,r}, shape)`
  - Uses host command `app.mode.present.toggle` for mode changes

## Public API Usage

- `AppAPI.ui.getMode()/setMode()` (ADR-0006) – for Present Mode awareness and toggling.
- `AppAPI.hex` (ADR-0007) – `fromPoint`, `cone`, `ring`, `neighbors` for kernels.
- `AppAPI.layers` – access active map, manage layer state via plugin adapter.

## Data Model

```
type AxialKey = string; // 'q,r'
interface FogState {
  revealed: Set<AxialKey>;
  color: string;
  opacity: number; // 0..1
  blendMode?: string; // optional
  persist: boolean;
}
```

Serialization: store `revealed` as an array of strings in project JSON; convert to `Set` at runtime.

## Rendering

- Draw dark overlay for all hexes in view except those in `revealed`.
- Strategy A (MVP): compute unrevealed cells and draw per-cell polygons with batch fills.
- Z-order: relies on Scene Tree order; default place on top at creation.

## Tool Behavior

- On pointer down in Present Mode: derive `{q,r}` using `AppAPI.hex.fromPoint`.
- Apply kernel:
  - circle: cells with `distance(center, cell) <= radius`.
  - cone: `cone(center, dir, radius, spread60s)` from API.
  - lobe: union of overlapping cones/patterns (preset definitions).
- Update `revealed` set; journal action for undo/redo.

## Performance Considerations

- Batch set updates and re-render only dirty cells.
- Debounce repeated pointer events to reduce redraw frequency.

## Testing Strategy

- Unit: kernel generation, set operations, (de)serialization edge cases.
- Integration: tool reveals/hides expected cells; z-order respected; visibility toggle works.
- E2E: Present Mode toggle; click-to-reveal flow persists across save/load and supports undo/redo.

## Risks & Mitigations

- Large maps may incur draw costs → batching and viewport culling.
- Missing hexgrid → return `null` from hit-test; tool disables or shows hint.

## Open Questions

- Do we need quick presets for radius/spread on toolbar vs. properties?
- Should export include fog state by default when sharing maps?
