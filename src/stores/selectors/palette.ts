import type { Project } from "@/stores/project";
import type { MapPalette, TerrainCategory } from "@/palettes/types";
import { DefaultPalette } from "@/palettes/defaults";
import { TerrainSettings } from "@/palettes/settings";
import { makePaletteFromSetting } from "@/palettes/derive";

function coerceTerrainKey(key: string | undefined): TerrainCategory {
  switch (key) {
    case "water":
    case "plains":
    case "forest":
    case "hills":
    case "mountains":
      return key;
    case "desert":
      return "plains"; // desert presented via arid trait in settings
    default:
      return "plains";
  }
}

export function resolvePalette(
  project: Project | null,
  mapId: string | null,
): MapPalette {
  if (!project) return DefaultPalette;
  const map = project.maps.find((m) => m.id === mapId);
  // Advanced overrides using direct palette objects (legacy/advanced) take precedence
  if (map?.palette) return map.palette as MapPalette;
  // If campaign has an explicit palette override, prefer it over default/setting
  if (project.palette) return project.palette as MapPalette;
  // Resolve by settingId chain: map → campaign → default
  const settingId = map?.settingId || project.settingId || "doom-forge";
  const setting = TerrainSettings.getAllSettings().find(
    (s) => s.id === settingId,
  );
  if (setting) return makePaletteFromSetting(setting);
  // Fallback: default
  return DefaultPalette;
}

export function resolveTerrainFill(
  palette: MapPalette | undefined,
  terrainKey: string | undefined,
): string {
  const p = palette || DefaultPalette;
  const key = coerceTerrainKey(terrainKey);
  return p.terrain[key]?.fill || DefaultPalette.terrain.plains.fill;
}

export function resolveGridLine(
  project: Project | null,
  mapId: string | null,
  hexgridState?: { color?: string },
): string {
  const userColor = hexgridState?.color;
  if (userColor && userColor !== "#000000") return userColor;
  const p = resolvePalette(project, mapId);
  return p.grid.line || "#000000";
}
