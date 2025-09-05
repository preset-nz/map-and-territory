// Public AppAPI surface
import { resolvePalette, resolveTerrainFill } from "@/stores/selectors/palette";
import type { TerrainCategory } from "@/palettes/types";
import { useProjectStore } from "@/stores/project";
import { TerrainSettings, BaseTerrainType } from "@/palettes/settings";
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
  palette: {
    // Returns the resolved palette for the active map (map → campaign → default preset)
    get() {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      return resolvePalette(cur, active);
    },
    // Returns the terrain fill for a given key (supports 'desert' → plains presentation)
    terrainFill(key: TerrainCategory | "desert") {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const palette = resolvePalette(cur, active);
      return resolveTerrainFill(palette, key);
    },
    // Returns the recommended hex grid line color from the resolved palette
    gridLine() {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const palette = resolvePalette(cur, active);
      return palette.grid.line;
    },
    // Lists terrain entries from the active setting (MVP: default Doom Forge until settings UI lands)
    list(category?: BaseTerrainType) {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === active);
      const settingId = map?.settingId || cur?.settingId || "doom-forge";
      const setting =
        TerrainSettings.getAllSettings().find((s) => s.id === settingId) ??
        TerrainSettings.DOOM_FORGE;
      return category
        ? setting.terrains.filter((t) => t.baseType === category)
        : setting.terrains.slice();
    },
    // Returns color by terrain entry id from the active setting; falls back to category fill
    fillById(id: string) {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === active);
      const settingId = map?.settingId || cur?.settingId || "doom-forge";
      const setting =
        TerrainSettings.getAllSettings().find((s) => s.id === settingId) ??
        TerrainSettings.DOOM_FORGE;
      const t = setting.terrains.find((x) => x.id === id);
      if (t) return t.color;
      // Fallback: use category fill via resolved palette
      const palette = resolvePalette(cur, active);
      return resolveTerrainFill(palette, "plains");
    },
    // Returns active setting id (map → campaign → default)
    settingId() {
      const cur = useProjectStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === active);
      return map?.settingId || cur?.settingId || "doom-forge";
    },
  },
} as const;

export type { Axial, Layout, Point };
