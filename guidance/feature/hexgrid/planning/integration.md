# UI Integration Points — Hexgrid

Status: Draft

## Canvas Viewport

- On pointer move, compute paper-local pixel coords (existing code path).
- Build `layout` from visible hexgrid layer state: `{ orientation, size, origin }`.
- Call `hex.fromPoint(point, layout)` and push result into layout store.
- Do not rotate canvas; orientation alone determines geometry.

Store contract change:

- Extend `mousePosition` to include optional hex: `{ x:number; y:number; hex?: { q:number; r:number } | null }`.
- Maintain existing selectors; add `useStatusState().mousePosition.hex` optional usage in StatusBar.

## Status Bar

- Render `Position: X: {x}, Y: {y} | Hex: {q},{r}` when `hex` present.
- When no hexgrid or outside paper, render `Hex: —`.

## Hexgrid Layer Properties

- Replace `rotation` with `orientation: 'pointy'|'flat'` and optional `origin` controls.
- UI: dropdown for orientation, number inputs for `origin.x`, `origin.y` (advanced panel).

## Worker Render Path

- Incorporate orientation in tiling math; remove rotation transforms.
- Ensure `layersKey` changes when orientation changes.
