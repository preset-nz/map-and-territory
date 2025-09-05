import { TerrainSettings } from "@/palettes/settings";
import { makePaletteFromSetting } from "@/palettes/derive";
import type { MapPalette } from "@/palettes/types";

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.getOwnPropertyNames(obj as any).forEach((prop) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any = (obj as any)[prop];
    if (
      value &&
      (typeof value === "object" || typeof value === "function") &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  });
  return obj;
}

const Templates = deepFreeze({
  DoomForge: makePaletteFromSetting(TerrainSettings.DOOM_FORGE),
  SpaceOpera: makePaletteFromSetting(TerrainSettings.SPACE_OPERA),
  EventHorizon: makePaletteFromSetting(TerrainSettings.EVENT_HORIZON),
  GloomyGarden: makePaletteFromSetting(TerrainSettings.GLOOMY_GARDEN),
  ExcessThrone: makePaletteFromSetting(TerrainSettings.EXCESS_THRONE),
  DataNexus: makePaletteFromSetting(TerrainSettings.DATA_NEXUS),
  StreetLevel: makePaletteFromSetting(TerrainSettings.STREET_LEVEL),
  BrittleEmpire: makePaletteFromSetting(TerrainSettings.BRITTLE_EMPIRE),
  HostileWaters: makePaletteFromSetting(TerrainSettings.HOSTILE_WATERS),
} as const satisfies Record<string, MapPalette>);

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function makePresetAccessors(name: keyof typeof Templates): MapPalette {
  return {
    get terrain() {
      return deepClone(Templates[name].terrain);
    },
    get grid() {
      return { line: Templates[name].grid.line };
    },
  } as unknown as MapPalette;
}

export const Presets = {
  DoomForge: makePresetAccessors("DoomForge"),
  SpaceOpera: makePresetAccessors("SpaceOpera"),
  EventHorizon: makePresetAccessors("EventHorizon"),
  GloomyGarden: makePresetAccessors("GloomyGarden"),
  ExcessThrone: makePresetAccessors("ExcessThrone"),
  DataNexus: makePresetAccessors("DataNexus"),
  StreetLevel: makePresetAccessors("StreetLevel"),
  BrittleEmpire: makePresetAccessors("BrittleEmpire"),
  HostileWaters: makePresetAccessors("HostileWaters"),
} as const;
