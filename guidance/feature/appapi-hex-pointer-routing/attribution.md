# Attribution & References

- Geometry and pixel↔hex formulas adapted from Amit Patel (Red Blob Games):
  - https://www.redblobgames.com/grids/hexagons/
  - https://www.redblobgames.com/grids/hexagons/implementation.html
- ADR Links:
  - ADR‑0007: `guidance/adrs/0007-appapi-hex-geometry-and-hit-test.md`
  - ADR‑0002: `guidance/adrs/0002-plugin-architecture.md`
- Public API:
  - `src/appapi/index.ts` exposes `AppAPI.hex` for conversions and kernels.
- Testing Policy:
  - Boundary behavior follows epsilon policy `EPS = 1e-6` as documented in solutions design.
