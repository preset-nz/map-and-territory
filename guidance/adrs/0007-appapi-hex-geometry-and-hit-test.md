Status: Draft
Last Updated: 2025-09-03
title: AppAPI Hex Geometry and Pointer→Hex Routing
deciders: Core Orchestrator, Rendering Lead, Plugin Architect

## Context

Hex-centric tools and layers (terrain paint, fog-of-war) require reliable coordinate conversions and kernels (rings/cones) independent of internal store shapes. Standardizing axial hex utilities and pointer→hex routing in the public API enables consistent plugin behavior and testability.

## Decision

1. Public Hex Geometry in `AppAPI.hex`

- Orientation: support pointy-top and flat-top only; no arbitrary rotation.
- Layout: calculations take an explicit `layout` value (size, origin, orientation) to avoid hidden global state.
- API surface (minimal, composable):
  - `fromPoint(point: {x:number;y:number}, layout: Layout): Axial | null`
  - `toPoint(hex: Axial, layout: Layout): { x: number; y: number }`
  - `round(frac: Cube): Axial` (cube rounding helper)
  - `distance(a: Axial, b: Axial): number`
  - `neighbors(h: Axial): Axial[]`
  - `diagonals(h: Axial): Axial[]`
  - `ring(center: Axial, radius: number): Axial[]`
  - `range(center: Axial, radius: number): Axial[]`
  - `line(a: Axial, b: Axial): Axial[]`
  - Conversions: `axial↔cube`, `axial↔offset` (odd-r/odd-q per orientation)

  Types:
  - `type Orientation = 'pointy' | 'flat'`
  - `interface Layout { orientation: Orientation; size: number; origin: { x: number; y: number } }`
  - `interface Axial { q: number; r: number }`
  - `interface Cube { x: number; y: number; z: number }`

2. Pointer→Hex Routing

- Pointer events provide `{q,r}` alongside pixel coordinates when a `hexgrid` layer is visible. If absent/disabled, return `null` and degrade gracefully.
- Calculations respect active hexgrid layer parameters via `layout` (size, origin, orientation). Rotation is not supported by design.

3. Independence & Versioning

- `AppAPI.hex` remains selector-oriented and versioned per ADR-0002, avoiding leakage of internal store shapes.

## Rationale

- Centralizes geometry logic to ensure consistency across plugins and tools.
- Simplifies testing (deterministic kernels) and improves performance via shared utilities.
- Supports future features (pathfinding, FOV) without API churn.

## Consequences

- Host implements geometry once; plugins consume via `AppAPI`.
- Hit-test path must integrate with canvas event system to attach `{q,r}`.
- Unit tests added for geometry correctness and edge cases.

## Validation

- Unit: `neighbors`, `ring`, `cone`, and `fromPoint/toPoint` against known fixtures.
- Integration: Pointer events deliver `{q,r}` when hexgrid is active; `null` otherwise.

## Follow-ups

- Credit: Implementation follows the excellent reference by Amit Patel (Red Blob Games). See references below.
- Evaluate continuous-angle cones (float radians) if needed; keep initial API discrete (6 facings) for simplicity.
- Consider exposing range/line-of-sight helpers once kernels are validated in production.

## References

- Red Blob Games — Hexagonal Grids: Concepts and Implementation
  - https://www.redblobgames.com/grids/hexagons/
  - https://www.redblobgames.com/grids/hexagons/implementation.html
  - Copyright © Amit Patel; referenced with attribution.
