export type ScaleBarPlacement = "overlay" | "below";

export interface MapScaleConfig {
  enabled: boolean;
  placement: ScaleBarPlacement;
  useSettingUnits: boolean;
  customUnitId?: string | null;
}

export interface ResolvedScaleConfig {
  enabled: boolean;
  placement: ScaleBarPlacement;
  unitId: string;
  label: string;
  shortLabel: string;
  unitsPerHex: number;
  useSettingUnits: boolean;
}
