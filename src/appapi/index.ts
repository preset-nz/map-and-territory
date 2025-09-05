// Public AppAPI surface
// Intent: provide a stable, minimal interface for app-level consumers
// without leaking internal store or lib shapes.

import type { Axial, Layout, Point } from "@/lib/hex";
import {
  fromPoint,
  toPoint,
  round,
  distance,
  neighbors,
  diagonals,
  ring,
  range,
  line,
  axialToCube,
  cubeToAxial,
} from "@/lib/hex";

export const AppAPI = {
  hex: {
    fromPoint,
    toPoint,
    round,
    distance,
    neighbors,
    diagonals,
    ring,
    range,
    line,
    axialToCube,
    cubeToAxial,
  },
} as const;

export type { Axial, Layout, Point };
