import { describe, it, expect } from "vitest";
import {
  normalizeScaleConfig,
  resolveScaleConfig,
  resolveSettingId,
} from "@/scale/resolution";
import { TerrainSettings } from "@/palettes/settings";

describe("scale resolution helpers", () => {
  it("normalizes default config for Doom Forge", () => {
    const config = normalizeScaleConfig(
      undefined,
      TerrainSettings.DOOM_FORGE.id,
    );
    expect(config.enabled).toBe(true);
    expect(config.placement).toBe("overlay");
    expect(config.useSettingUnits).toBe(true);
    expect(config.customUnitId).toBe("kilometers");
  });

  it("respects custom placement and unit override", () => {
    const normalized = normalizeScaleConfig(
      {
        enabled: false,
        placement: "below",
        useSettingUnits: false,
        customUnitId: "miles",
      },
      TerrainSettings.DOOM_FORGE.id,
    );
    expect(normalized.enabled).toBe(false);
    expect(normalized.placement).toBe("below");
    expect(normalized.useSettingUnits).toBe(false);
    expect(normalized.customUnitId).toBe("miles");
  });

  it("falls back to setting default when custom id missing", () => {
    const normalized = normalizeScaleConfig(
      { useSettingUnits: false },
      TerrainSettings.SPACE_OPERA.id,
    );
    expect(normalized.customUnitId).toBe("light-minutes");
  });

  it("resolves unit metadata when following setting", () => {
    const resolved = resolveScaleConfig(
      undefined,
      TerrainSettings.SPACE_OPERA.id,
    );
    expect(resolved.unitId).toBe("light-minutes");
    expect(resolved.shortLabel).toBe("lm");
    expect(resolved.unitsPerHex).toBe(12);
  });

  it("resolves custom unit metadata when overriding", () => {
    const resolved = resolveScaleConfig(
      {
        enabled: true,
        placement: "overlay",
        useSettingUnits: false,
        customUnitId: "miles",
      },
      TerrainSettings.DOOM_FORGE.id,
    );
    expect(resolved.unitId).toBe("miles");
    expect(resolved.shortLabel).toBe("mi");
    expect(resolved.unitsPerHex).toBeCloseTo(3.11, 2);
  });

  it("falls back to Doom Forge when no setting provided", () => {
    expect(resolveSettingId(undefined, undefined)).toBe(
      TerrainSettings.DOOM_FORGE.id,
    );
  });
});
