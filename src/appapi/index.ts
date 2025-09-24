// Public AppAPI surface
import {
  resolvePalette,
  resolveTerrainFill,
  resolveGridLine,
} from "@/stores/selectors/palette";
import type { TerrainCategory } from "@/palettes/types";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { TerrainSettings, BaseTerrainType } from "@/palettes/settings";
import { listScaleUnits } from "@/scale/profiles";
import {
  normalizeScaleConfig as normalizeScale,
  resolveScaleConfig as computeScaleConfig,
  resolveSettingId as resolveScaleSettingId,
} from "@/scale/resolution";
import type { ResolvedScaleConfig, MapScaleConfig } from "@/types/scale";
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

function resolveScaleContext(mapId?: string | null) {
  const campaign = useCampaignStore.getState().current;
  if (!campaign) {
    return {
      campaign: null,
      map: null,
      settingId: resolveScaleSettingId(),
    };
  }
  const selection = useSelectionStore.getState().selection;
  const fallbackId =
    mapId ??
    (selection.kind === "map" ? selection.id : (campaign.activeMapId ?? null));
  const map = campaign.maps.find((m) => m.id === fallbackId) ?? null;
  const settingId = resolveScaleSettingId(map?.settingId, campaign.settingId);
  return { campaign, map, settingId };
}

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
      const cur = useCampaignStore.getState().current;
      const active = cur?.activeMapId ?? null;
      return resolvePalette(cur, active);
    },
    // Returns the terrain fill for a given key (supports 'desert' → plains presentation)
    terrainFill(key: TerrainCategory | "desert") {
      const cur = useCampaignStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const palette = resolvePalette(cur, active);
      return resolveTerrainFill(palette, key);
    },
    // Returns the recommended hex grid line color from the resolved palette
    gridLine() {
      const cur = useCampaignStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === active);
      const hexgrid = map?.layers?.find((l) => l.type === "hexgrid");
      const hexState = hexgrid?.state as
        | { color?: string; usePaletteColor?: boolean }
        | undefined;
      return resolveGridLine(
        cur,
        active,
        hexState
          ? {
              color: hexState.color,
              usePaletteColor: hexState.usePaletteColor !== false,
            }
          : undefined,
      );
    },
    // Lists terrain entries from the active setting (MVP: default Doom Forge until settings UI lands)
    list(category?: BaseTerrainType) {
      const cur = useCampaignStore.getState().current;
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
      const cur = useCampaignStore.getState().current;
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
      const cur = useCampaignStore.getState().current;
      const active = cur?.activeMapId ?? null;
      const map = cur?.maps.find((m) => m.id === active);
      return map?.settingId || cur?.settingId || "doom-forge";
    },
  },
  scale: {
    current(): ResolvedScaleConfig {
      const { map, settingId } = resolveScaleContext();
      return computeScaleConfig(map?.scale, settingId);
    },
    forMap(mapId?: string | null): ResolvedScaleConfig {
      const { map, settingId } = resolveScaleContext(mapId);
      return computeScaleConfig(map?.scale, settingId);
    },
    unitOptions(settingId?: string | null) {
      const context = resolveScaleContext();
      const resolvedSettingId = settingId ?? context.settingId;
      return listScaleUnits(resolvedSettingId).map((unit) => ({
        id: unit.id,
        label: `${unit.label} (${unit.shortLabel})`,
        shortLabel: unit.shortLabel,
        description: unit.description,
      }));
    },
    normalizedConfig(mapId?: string | null): MapScaleConfig {
      const { map, settingId } = resolveScaleContext(mapId);
      return normalizeScale(map?.scale, settingId);
    },
  },
} as const;

export type { Axial, Layout, Point };
