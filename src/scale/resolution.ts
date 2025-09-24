import { TerrainSettings } from "@/palettes/settings";
import { findScaleUnit, getDefaultScaleUnit } from "@/scale/profiles";
import type { MapScaleConfig, ResolvedScaleConfig } from "@/types/scale";

export function resolveSettingId(
  mapSettingId?: string | null,
  campaignSettingId?: string | null,
): string {
  return mapSettingId || campaignSettingId || TerrainSettings.DOOM_FORGE.id;
}

export function normalizeScaleConfig(
  raw: MapScaleConfig | undefined,
  settingId: string,
): MapScaleConfig {
  const defaultUnit = getDefaultScaleUnit(settingId);
  const candidate = raw?.customUnitId;
  const customUnit =
    typeof candidate === "string" && candidate.length > 0
      ? candidate
      : defaultUnit.id;

  return {
    enabled: raw?.enabled !== false,
    placement: raw?.placement === "below" ? "below" : "overlay",
    useSettingUnits: raw?.useSettingUnits !== false,
    customUnitId: customUnit,
  };
}

export function resolveScaleConfig(
  scale: MapScaleConfig | undefined,
  settingId: string,
): ResolvedScaleConfig {
  const normalized = normalizeScaleConfig(scale, settingId);
  const unit = normalized.useSettingUnits
    ? getDefaultScaleUnit(settingId)
    : findScaleUnit(settingId, normalized.customUnitId);

  return {
    enabled: normalized.enabled,
    placement: normalized.placement,
    unitId: unit.id,
    label: unit.label,
    shortLabel: unit.shortLabel,
    unitsPerHex: unit.unitsPerHex,
    useSettingUnits: normalized.useSettingUnits,
  };
}
