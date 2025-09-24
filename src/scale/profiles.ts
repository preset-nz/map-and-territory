import { TerrainSettings } from "@/palettes/settings";

export type ScaleCategory =
  | "terrestrial"
  | "urban"
  | "space"
  | "nautical"
  | "temporal";

export interface ScaleUnit {
  id: string;
  label: string;
  shortLabel: string;
  unitsPerHex: number;
  description?: string;
}

export interface ScaleProfile {
  id: string;
  name: string;
  category: ScaleCategory;
  defaultUnitId: string;
  units: ScaleUnit[];
}

const DEFAULT_PROFILE: ScaleProfile = {
  id: "default-terrestrial",
  name: "Standard Field",
  category: "terrestrial",
  defaultUnitId: "kilometers",
  units: [
    {
      id: "kilometers",
      label: "Kilometers",
      shortLabel: "km",
      unitsPerHex: 5,
      description: "Each hex represents roughly five kilometers.",
    },
    {
      id: "miles",
      label: "Miles",
      shortLabel: "mi",
      unitsPerHex: 3.11,
      description: "Miles conversion for standard overland travel.",
    },
  ],
};

const PROFILE_MAP: Record<string, ScaleProfile> = {
  [TerrainSettings.DOOM_FORGE.id]: {
    id: `${TerrainSettings.DOOM_FORGE.id}-scale`,
    name: `${TerrainSettings.DOOM_FORGE.name} Scale`,
    category: "terrestrial",
    defaultUnitId: "kilometers",
    units: [
      {
        id: "kilometers",
        label: "Kilometers",
        shortLabel: "km",
        unitsPerHex: 5,
        description: "Desolate marches measured five kilometers per hex.",
      },
      {
        id: "miles",
        label: "Miles",
        shortLabel: "mi",
        unitsPerHex: 3.11,
        description: "Imperial conversion for wasteland travel.",
      },
      {
        id: "leagues",
        label: "Leagues",
        shortLabel: "lea",
        unitsPerHex: 1.03,
        description: "Roughly one league (three miles) across each hex.",
      },
    ],
  },
  [TerrainSettings.SPACE_OPERA.id]: {
    id: `${TerrainSettings.SPACE_OPERA.id}-scale`,
    name: `${TerrainSettings.SPACE_OPERA.name} Scale`,
    category: "space",
    defaultUnitId: "light-minutes",
    units: [
      {
        id: "light-minutes",
        label: "Light Minutes",
        shortLabel: "lm",
        unitsPerHex: 12,
        description:
          "Capital ship engagements at twelve light minutes per hex.",
      },
      {
        id: "light-hours",
        label: "Light Hours",
        shortLabel: "lh",
        unitsPerHex: 0.2,
        description: "Broad navigation at a fifth of a light hour per hex.",
      },
      {
        id: "astronomical-units",
        label: "Astronomical Units",
        shortLabel: "AU",
        unitsPerHex: 1.44,
        description: "Planetary spacing roughly 1.4 AU per hex.",
      },
    ],
  },
  [TerrainSettings.EVENT_HORIZON.id]: {
    id: `${TerrainSettings.EVENT_HORIZON.id}-scale`,
    name: `${TerrainSettings.EVENT_HORIZON.name} Scale`,
    category: "space",
    defaultUnitId: "light-hours",
    units: [
      {
        id: "light-hours",
        label: "Light Hours",
        shortLabel: "lh",
        unitsPerHex: 4,
        description: "Deep space anomalies measured four light hours per hex.",
      },
      {
        id: "light-minutes",
        label: "Light Minutes",
        shortLabel: "lm",
        unitsPerHex: 240,
        description:
          "Fine-grained plotting at two hundred forty light minutes per hex.",
      },
      {
        id: "astronomical-units",
        label: "Astronomical Units",
        shortLabel: "AU",
        unitsPerHex: 28.8,
        description: "Macro scale for system mapping (≈28.8 AU per hex).",
      },
    ],
  },
  [TerrainSettings.GLOOMY_GARDEN.id]: {
    id: `${TerrainSettings.GLOOMY_GARDEN.id}-scale`,
    name: `${TerrainSettings.GLOOMY_GARDEN.name} Scale`,
    category: "terrestrial",
    defaultUnitId: "kilometers",
    units: [
      {
        id: "kilometers",
        label: "Kilometers",
        shortLabel: "km",
        unitsPerHex: 2,
        description: "Compact provinces roughly two kilometers per hex.",
      },
      {
        id: "miles",
        label: "Miles",
        shortLabel: "mi",
        unitsPerHex: 1.24,
        description: "Imperial conversion for garden realms.",
      },
      {
        id: "furlongs",
        label: "Furlongs",
        shortLabel: "fur",
        unitsPerHex: 9.94,
        description: "Agrarian travel at just under ten furlongs per hex.",
      },
    ],
  },
  [TerrainSettings.EXCESS_THRONE.id]: {
    id: `${TerrainSettings.EXCESS_THRONE.id}-scale`,
    name: `${TerrainSettings.EXCESS_THRONE.name} Scale`,
    category: "temporal",
    defaultUnitId: "days",
    units: [
      {
        id: "days",
        label: "Travel Days",
        shortLabel: "days",
        unitsPerHex: 0.5,
        description: "Royal courier pace at half a day per hex.",
      },
      {
        id: "kilometers",
        label: "Kilometers",
        shortLabel: "km",
        unitsPerHex: 15,
        description: "Marching distance assuming 30 km per day of travel.",
      },
      {
        id: "miles",
        label: "Miles",
        shortLabel: "mi",
        unitsPerHex: 9.32,
        description: "Imperial conversion for imperial highways.",
      },
    ],
  },
  [TerrainSettings.DATA_NEXUS.id]: {
    id: `${TerrainSettings.DATA_NEXUS.id}-scale`,
    name: `${TerrainSettings.DATA_NEXUS.name} Scale`,
    category: "temporal",
    defaultUnitId: "hours",
    units: [
      {
        id: "hours",
        label: "Hours",
        shortLabel: "h",
        unitsPerHex: 6,
        description: "Network propagation delays around six hours per hex.",
      },
      {
        id: "shifts",
        label: "Operator Shifts",
        shortLabel: "shift",
        unitsPerHex: 0.75,
        description: "Eight hour shifts represented as three quarters per hex.",
      },
      {
        id: "days",
        label: "Days",
        shortLabel: "days",
        unitsPerHex: 0.25,
        description: "Quarter-day windows for strategic updates.",
      },
    ],
  },
  [TerrainSettings.STREET_LEVEL.id]: {
    id: `${TerrainSettings.STREET_LEVEL.id}-scale`,
    name: `${TerrainSettings.STREET_LEVEL.name} Scale`,
    category: "urban",
    defaultUnitId: "meters",
    units: [
      {
        id: "meters",
        label: "Meters",
        shortLabel: "m",
        unitsPerHex: 200,
        description: "Dense city blocks at two hundred meters per hex.",
      },
      {
        id: "feet",
        label: "Feet",
        shortLabel: "ft",
        unitsPerHex: 656,
        description: "Imperial conversion (≈656 feet per hex).",
      },
      {
        id: "city-blocks",
        label: "City Blocks",
        shortLabel: "blocks",
        unitsPerHex: 2,
        description: "Reference of roughly two city blocks per hex.",
      },
    ],
  },
  [TerrainSettings.BRITTLE_EMPIRE.id]: {
    id: `${TerrainSettings.BRITTLE_EMPIRE.id}-scale`,
    name: `${TerrainSettings.BRITTLE_EMPIRE.name} Scale`,
    category: "terrestrial",
    defaultUnitId: "kilometers",
    units: [
      {
        id: "kilometers",
        label: "Kilometers",
        shortLabel: "km",
        unitsPerHex: 8,
        description:
          "Expansive frontier districts at eight kilometers per hex.",
      },
      {
        id: "miles",
        label: "Miles",
        shortLabel: "mi",
        unitsPerHex: 4.97,
        description: "Imperial conversion for caravan routes.",
      },
      {
        id: "days",
        label: "Days",
        shortLabel: "days",
        unitsPerHex: 0.27,
        description: "Roughly a quarter-day ride between settlements.",
      },
    ],
  },
  [TerrainSettings.HOSTILE_WATERS.id]: {
    id: `${TerrainSettings.HOSTILE_WATERS.id}-scale`,
    name: `${TerrainSettings.HOSTILE_WATERS.name} Scale`,
    category: "nautical",
    defaultUnitId: "nautical-miles",
    units: [
      {
        id: "nautical-miles",
        label: "Nautical Miles",
        shortLabel: "NM",
        unitsPerHex: 2,
        description: "Patrol sectors spanning two nautical miles per hex.",
      },
      {
        id: "kilometers",
        label: "Kilometers",
        shortLabel: "km",
        unitsPerHex: 3.7,
        description: "Metric conversion for naval charts.",
      },
      {
        id: "cables",
        label: "Cables",
        shortLabel: "cbl",
        unitsPerHex: 20,
        description: "Traditional cable lengths (one tenth NM) per hex.",
      },
    ],
  },
};

export function getScaleProfile(
  settingId: string | null | undefined,
): ScaleProfile {
  if (!settingId) return DEFAULT_PROFILE;
  return PROFILE_MAP[settingId] ?? DEFAULT_PROFILE;
}

export function listScaleUnits(
  settingId: string | null | undefined,
): ScaleUnit[] {
  return getScaleProfile(settingId).units;
}

export function findScaleUnit(
  settingId: string | null | undefined,
  unitId: string | null | undefined,
): ScaleUnit {
  const profile = getScaleProfile(settingId);
  if (unitId) {
    const match = profile.units.find((u) => u.id === unitId);
    if (match) return match;
  }
  const fallback = profile.units.find((u) => u.id === profile.defaultUnitId);
  return fallback ?? profile.units[0] ?? DEFAULT_PROFILE.units[0];
}

export function getDefaultScaleUnit(
  settingId: string | null | undefined,
): ScaleUnit {
  const profile = getScaleProfile(settingId);
  const match = profile.units.find((u) => u.id === profile.defaultUnitId);
  return match ?? profile.units[0] ?? DEFAULT_PROFILE.units[0];
}

export function getDefaultScaleProfile(): ScaleProfile {
  return DEFAULT_PROFILE;
}
