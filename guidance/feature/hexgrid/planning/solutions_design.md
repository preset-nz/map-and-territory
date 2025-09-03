# Hexgrid Geometry: Solutions Design

Status: Draft
Owner: Orchestrator
Scope: Core hex geometry library, pointer→hex routing, and UI status integration.

## Problem Statement

We need a reliable, testable hex geometry library that supports both flat-top and pointy-top orientations (no arbitrary rotation), exposes conversions between pixels and hex coordinates, and enables the status bar to display `{q,r}` for the hex under the pointer.

## Design Principles

- SOLID and CUPID aligned; small, composable functions.
- Orientation as an explicit parameter; no hidden global state.
- No rotation; only `orientation: 'pointy' | 'flat'` with a `size` (radius) and `origin`.
- Deterministic and pure; suitable for unit testing.
- Reference implementation aligned with Red Blob Games.

## API Surface

Types:
- `type Orientation = 'pointy' | 'flat'`
- `interface Layout { orientation: Orientation; size: number; origin: { x: number; y: number } }`
- `interface Axial { q: number; r: number }`
- `interface Cube { x: number; y: number; z: number }`

Functions (minimal viable):
- `fromPoint(point: {x:number;y:number}, layout: Layout): Axial | null`
- `toPoint(hex: Axial, layout: Layout): { x: number; y: number }`
- `axialToCube(a: Axial): Cube`
- `cubeToAxial(c: Cube): Axial`
- `round(frac: Cube): Axial`
- `distance(a: Axial, b: Axial): number`
- `neighbors(h: Axial): Axial[]`
- `diagonals(h: Axial): Axial[]`
- `ring(center: Axial, radius: number): Axial[]`
- `range(center: Axial, radius: number): Axial[]`
- `line(a: Axial, b: Axial): Axial[]`
- `axialToOffset(a: Axial, orientation: Orientation, variant: 'odd-r'|'even-r'|'odd-q'|'even-q'): { col:number; row:number }`
- `offsetToAxial(o: {col:number;row:number}, orientation: Orientation, variant: 'odd-r'|'even-r'|'odd-q'|'even-q'): Axial`

Notes:
- `fromPoint` performs orientation-specific projection and cube rounding.
- `toPoint` maps axial to pixel center; callers can compute corners if needed later.
- Bounds/clipping reside in callers (e.g., visible paper region), not the lib.

## Pointer→Hex Routing (Integration)

- Canvas viewport captures pointer position in paper-local pixel coordinates.
- Use active hexgrid layer’s `layout` (size, origin, orientation) to call `fromPoint`.
- Update `useLayoutStore().mousePosition` with `{ x, y, hex: { q, r } | null }` (extend store shape; see tasks).
- Status bar renders both pixel position and `{q,r}` when available.

## Layer Model Alignment

- Update `hexgrid` layer state to replace `rotation` with `orientation: 'pointy'|'flat'` and add `origin` if not already present (default `{x:0,y:0}`).
- Rendering code ignores rotation and draws according to selected orientation.

## Risks & Mitigations

- Precision near hex boundaries: covered by cube rounding tests with epsilon handling.
- Orientation mismatch between rendering and hit-testing: single source of truth via `layout` from layer state.
- Performance: library is O(1) per conversion; rendering tesselation unaffected.

## Attribution

This design and forthcoming implementation follow the well-established methodology described by Amit Patel at Red Blob Games:
- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html

