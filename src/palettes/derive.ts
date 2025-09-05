import type { MapPalette } from "@/palettes/types";
import { BaseTerrainType, type TerrainSetting } from "@/palettes/settings";

// Mapping retained for potential future use when selecting variants

export function makePaletteFromSetting(setting: TerrainSetting): MapPalette {
  const byBase: Partial<
    Record<BaseTerrainType, { fill: string; label?: string }>
  > = {};
  for (const t of setting.terrains) {
    if (!byBase[t.baseType])
      byBase[t.baseType] = { fill: t.color, label: t.themedName };
  }
  return {
    terrain: {
      water: byBase[BaseTerrainType.WATER] ?? {
        fill: "#3b5bfd",
        label: "Water",
      },
      plains: byBase[BaseTerrainType.PLAINS] ?? {
        fill: "#7abd5a",
        label: "Plains",
      },
      forest: byBase[BaseTerrainType.FOREST] ?? {
        fill: "#3a7a3a",
        label: "Forest",
      },
      hills: byBase[BaseTerrainType.HILLS] ?? {
        fill: "#8b6f4a",
        label: "Hills",
      },
      mountains: byBase[BaseTerrainType.MOUNTAINS] ?? {
        fill: "#7a6a5a",
        label: "Mountains",
      },
    },
    grid: { line: setting.palette.gridLine },
  };
}
