# Hex Lib — Vitest Plan

Scope: `src/lib/hex/*`

## Fixtures

- Orientation: `pointy`, `flat`
- Layouts: `size: 24`, `origin: {0,0}` and non-zero origins
- Known axial points and their pixel centers from Red Blob Games references

## Test Suites

1. Conversions — Axial/Cube/Offset

- axial→cube→axial roundtrip
- cube rounding: fractional cubes to nearest axial
- distance metric equals Manhattan in cube space / 2
- offset variants (odd-r/even-r/odd-q/even-q) vs axial for both orientations

2. Pixel Conversions — `toPoint`/`fromPoint`

- Roundtrip: axial → pixel → axial equals original
- Boundary: points near edges round to expected neighbor
- Origin shifts: non-zero origin handled correctly

3. Neighborhoods & Ranges

- neighbors: 6 results; diagonals: 6 results
- ring/range sizes match combinatoric expectations
- line: endpoints inclusive; monotonic step count equals distance

4. API Stability

- Type exports compile in consumer example
- Tree-shake safety: importing a subset does not pull unused modules (smoke)

5. Integration (Store)

- Pointer move simulation updates `mousePosition.hex` when hexgrid enabled
- Disabled hexgrid results in `hex: null`

Coverage Target: ≥ 90% lines/branches for `src/lib/hex/*`

References:

- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html
