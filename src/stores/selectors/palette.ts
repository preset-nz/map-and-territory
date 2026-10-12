import { DefaultPalette } from '@/palettes/defaults';
import { makePaletteFromSetting } from '@/palettes/derive';
import { TerrainSettings } from '@/palettes/settings';
import type { MapPalette } from '@/palettes/types';
import type { Campaign } from '@/stores/campaign';

// Pure palette lookup; lives in palettes/ so layer adapters can use it without the store.
export { resolveTerrainFill } from '@/palettes/terrain-fill';

export function resolvePalette(campaign: Campaign | null, mapId: string | null): MapPalette {
  if (!campaign) return DefaultPalette;
  const map = campaign.maps.find((m) => m.id === mapId);
  // Advanced overrides using direct palette objects (legacy/advanced) take precedence
  if (map?.palette) return map.palette as MapPalette;
  // If campaign has an explicit palette override, prefer it over default/setting
  if (campaign.palette) return campaign.palette as MapPalette;
  // Resolve by settingId chain: map → campaign → default
  const settingId = map?.settingId || campaign.settingId || 'doom-forge';
  const setting = TerrainSettings.getAllSettings().find((s) => s.id === settingId);
  if (setting) return makePaletteFromSetting(setting);
  // Fallback: default
  return DefaultPalette;
}

export function resolveGridLine(
  campaign: Campaign | null,
  mapId: string | null,
  hexgridState?: { color?: string; usePaletteColor: boolean },
): string {
  const usePalette = hexgridState?.usePaletteColor !== false;
  if (!usePalette && typeof hexgridState?.color === 'string') {
    return hexgridState.color.length > 0 ? hexgridState.color : '#000000';
  }
  const p = resolvePalette(campaign, mapId);
  return p.grid.line || '#000000';
}
