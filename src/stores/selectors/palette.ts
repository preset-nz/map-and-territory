import type { Campaign } from "@/stores/campaign";
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
  campaign: Campaign | null,
  mapId: string | null,
): MapPalette {
  if (!campaign) return DefaultPalette;
  const map = campaign.maps.find((m) => m.id === mapId);
  // Advanced overrides using direct palette objects (legacy/advanced) take precedence
  if (map?.palette) return map.palette as MapPalette;
  // If campaign has an explicit palette override, prefer it over default/setting
  if (campaign.palette) return campaign.palette as MapPalette;
  // Resolve by settingId chain: map → campaign → default
  const settingId = map?.settingId || campaign.settingId || "doom-forge";
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
  campaign: Campaign | null,
  mapId: string | null,
  hexgridState?: { color?: string; usePaletteColor: boolean },
): string {
  const usePalette = hexgridState?.usePaletteColor !== false;
  if (!usePalette && typeof hexgridState?.color === "string") {
    return hexgridState.color.length > 0 ? hexgridState.color : "#000000";
  }
  const p = resolvePalette(campaign, mapId);
  return p.grid.line || "#000000";
}
