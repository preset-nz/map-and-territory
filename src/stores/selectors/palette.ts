import type { Project } from "@/stores/project";
import type { MapPalette, TerrainCategory } from "@/palettes/types";
import { DefaultPalette } from "@/palettes/defaults";

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
  // Map override → campaign → default preset
  return (
    (map?.palette as MapPalette | undefined) ||
    (project.palette as MapPalette | undefined) ||
    DefaultPalette
  );
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
