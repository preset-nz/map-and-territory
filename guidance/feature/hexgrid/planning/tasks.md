# Hexgrid Feature — Subagent Tasks

Status: Ready for delegation
Owner: Orchestrator

## Dependencies

- ADR-0007 updated: no rotation, orientation-only.
- Solutions design finalized (this folder).

## Tickets

1. Hex Lib: Core Types & API Skeleton

- Define `Orientation`, `Layout`, `Axial`, `Cube` types.
- Export function stubs per solutions_design.md.
- Add JSDoc including attribution to Red Blob Games.
- Deliverable: `src/lib/hex/index.ts` (API barrel) and modules under `src/lib/hex/`.

2. Hex Lib: Axial/Cube/Offset Conversions + Rounding

- Implement `axial↔cube`, `round`, `distance`.
- Implement `axial↔offset` variants (odd-r/even-r/odd-q/even-q) honoring orientation.
- Tests: exhaustive table-based fixtures.

3. Hex Lib: Pixel Conversions

- Implement `toPoint`/`fromPoint` for both orientations with explicit `layout`.
- Implement corner helpers (optional): `corners(hex, layout): {x,y}[]` (not required for MVP; keep behind feature flag or separate module).
- Tests: pixel↔hex roundtrips and boundary conditions.

4. Hex Lib: Neighborhoods & Ranges

- Implement `neighbors`, `diagonals`, `ring`, `range`, `line`.
- Tests: known-good fixtures from Red Blob Games and custom edge cases.

5. UI Store: Mouse Position Extension

- Extend `useLayoutStore` mouse position to include optional hex: `{ x:number; y:number; hex?: { q:number; r:number } | null }`.
- Maintain backwards compatibility in selectors (non-breaking: default `hex` undefined).
- Tests: store update behavior.

6. Viewport Integration (Pointer→Hex)

- Canvas viewport: compute paper-local pixel coordinates for pointer move.
- Read active hexgrid layer; build `layout` from its state.
- Call `fromPoint` and dispatch to `setMousePosition(x, y)` plus `hex`.
- No rotation usage; ensure orientation drives hit-test.
- Tests: integration (simulate pointer events, assert store updates).

7. Hexgrid Layer: Orientation, Not Rotation

- Update `src/layers/adapters/hexgrid.ts` state: remove `rotation`, add `orientation` with default `'pointy'` and optional `origin`.
- Render according to orientation; do not rotate canvas.
- Update property schema: dropdown for orientation (Pointy/Flat), sliders remain for size/line width.
- Tests: snapshot of rendering parameters (unit), property schema integrity.

8. Documentation & Credits

- Update `README.md` Credits section.
- Add inline attribution JSDoc in hex lib entry points.
- Ensure links to Red Blob Games are present in guidance.

## Quality Gates

- Vitest suite passes; coverage on hex lib ≥ 90% lines/branches.
- Lint passes; types are explicit and exported.
- No rotation references remain in public API or UI.
- Status bar shows `{q,r}` when hexgrid visible; otherwise `—`.
