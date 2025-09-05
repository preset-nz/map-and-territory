// Settings model: mood palette + list of terrain entries with baseType + traits + color
export enum BaseTerrainType {
  WATER = "water",
  PLAINS = "plains",
  FOREST = "forest",
  HILLS = "hills",
  MOUNTAINS = "mountains",
}

export enum TerrainTrait {
  VAST = "vast",
  LOCAL = "local",
  SPRAWLING = "sprawling",
  CORRUPTED = "corrupted",
  TOXIC = "toxic",
  ARTIFICIAL = "artificial",
  RUINED = "ruined",
  FROZEN = "frozen",
  BURNING = "burning",
  RADIOACTIVE = "radioactive",
  DENSE = "dense",
  SPARSE = "sparse",
  CLUSTERED = "clustered",
  MAGICAL = "magical",
  HAUNTED = "haunted",
  UNSTABLE = "unstable",
}

export interface ColorPalette {
  name: string;
  description: string;
  // Recommended hex grid line color for this setting
  gridLine: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

export interface TerrainType {
  id: string;
  baseType: BaseTerrainType;
  traits: TerrainTrait[];
  themedName: string;
  color: string;
  description?: string;
}

export interface TerrainSetting {
  id: string;
  name: string;
  description: string;
  palette: ColorPalette; // mood palette
  terrains: TerrainType[]; // list of entries — can be multiple per baseType
}

export class TerrainSettings {
  static readonly DOOM_FORGE: TerrainSetting = {
    id: "doom-forge",
    name: "Doom Forge",
    description: "Apocalyptic metal and dying embers",
    palette: {
      name: "Doom Forge",
      description: "Apocalyptic metal and dying embers",
      gridLine: "#333333",
      colors: {
        primary: "#FFFF00",
        secondary: "#FF1493",
        accent: "#0C0C0C",
        background: "#F8F8FF",
      },
    },
    terrains: [
      {
        id: "blood-mires",
        baseType: BaseTerrainType.WATER,
        traits: [TerrainTrait.CORRUPTED, TerrainTrait.LOCAL],
        themedName: "Blood Mires",
        color: "#8B0000",
        description: "Stagnant pools of corrupted water",
      },
      {
        id: "bone-fields",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.RUINED, TerrainTrait.SPRAWLING],
        themedName: "Bone Fields",
        color: "#d8d8d8",
        description: "Vast plains littered with ancient bones",
      },
      {
        id: "ash-thickets",
        baseType: BaseTerrainType.FOREST,
        traits: [TerrainTrait.BURNING, TerrainTrait.SPARSE],
        themedName: "Ash Thickets",
        color: "#696969",
        description: "Skeletal trees in perpetual smolder",
      },
      {
        id: "iron-graves",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.RUINED],
        themedName: "Iron Graves",
        color: "#0C0C0C",
        description: "Hills of twisted metal and machinery",
      },
      {
        id: "doom-crags",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [TerrainTrait.UNSTABLE, TerrainTrait.BURNING],
        themedName: "Doom Crags",
        color: "#FFFF00",
        description: "Jagged peaks wreathed in flame",
      },
    ],
  };

  static readonly SPACE_OPERA: TerrainSetting = {
    id: "space-opera",
    name: "Space Opera",
    description: "Industrial decay in deep space",
    palette: {
      name: "Space Opera",
      description: "Industrial decay in deep space",
      gridLine: "#1a1a1a",
      colors: {
        primary: "#000000",
        secondary: "#F8F8FF",
        accent: "#DC143C",
        background: "#4FFF4F",
      },
    },
    terrains: [
      {
        id: "nebula-fields",
        baseType: BaseTerrainType.WATER,
        traits: [TerrainTrait.VAST, TerrainTrait.TOXIC],
        themedName: "Nebula Fields",
        color: "#4FFF4F",
        description: "Dense gas clouds that obscure sensors",
      },
      {
        id: "empty-space",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.VAST],
        themedName: "Empty Space",
        color: "#000000",
        description: "Clear void between celestial bodies",
      },
      {
        id: "asteroid-clusters",
        baseType: BaseTerrainType.FOREST,
        traits: [TerrainTrait.DENSE, TerrainTrait.CLUSTERED],
        themedName: "Asteroid Clusters",
        color: "#708090",
        description: "Dense fields requiring careful navigation",
      },
      {
        id: "derelict-ships",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.RUINED],
        themedName: "Derelict Ships",
        color: "#DC143C",
        description: "Abandoned hulks drifting in space",
      },
      {
        id: "space-stations",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.VAST],
        themedName: "Space Stations",
        color: "#F8F8FF",
        description: "Massive installations dominating local space",
      },
    ],
  };

  static readonly EVENT_HORIZON: TerrainSetting = {
    id: "event-horizon",
    name: "Event Horizon",
    description: "Localized space horror and stellar anomalies",
    palette: {
      name: "Event Horizon",
      description: "Localized space horror and stellar anomalies",
      gridLine: "#2a0505",
      colors: {
        primary: "#0C0C0C",
        secondary: "#8B0000",
        accent: "#696969",
        background: "#F8F8FF",
      },
    },
    terrains: [
      {
        id: "gravity-wells",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.UNSTABLE,
          TerrainTrait.VAST,
          TerrainTrait.MAGICAL,
        ],
        themedName: "Gravity Wells",
        color: "#7A0000",
        description: "Distorted spacetime that traps unwary vessels",
      },
      {
        id: "empty-space-eh",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.VAST, TerrainTrait.SPARSE],
        themedName: "Empty Space",
        color: "#0C0C0C",
        description: "Void between celestial bodies",
      },
      {
        id: "asteroid-fields-eh",
        baseType: BaseTerrainType.FOREST,
        traits: [TerrainTrait.DENSE, TerrainTrait.UNSTABLE],
        themedName: "Asteroid Fields",
        color: "#696969",
        description: "Chaotic debris fields with unpredictable movement",
      },
      {
        id: "derelict-hulks",
        baseType: BaseTerrainType.HILLS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.RUINED,
          TerrainTrait.HAUNTED,
        ],
        themedName: "Derelict Hulks",
        color: "#F8F8FF",
        description: "Ghost ships drifting near the event horizon",
      },
      {
        id: "stellar-anomalies",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [
          TerrainTrait.UNSTABLE,
          TerrainTrait.RADIOACTIVE,
          TerrainTrait.MAGICAL,
        ],
        themedName: "Stellar Anomalies",
        color: "#AA0000",
        description: "Impossible stellar phenomena defying physics",
      },
    ],
  };

  static readonly GLOOMY_GARDEN: TerrainSetting = {
    id: "gloomy-garden",
    name: "Gloomy Garden",
    description: "Decay, rot, and resilient corruption",
    palette: {
      name: "Gloomy Garden",
      description: "Decay, rot, and resilient corruption",
      gridLine: "#1a2a1a",
      colors: {
        primary: "#228B22",
        secondary: "#DEB887",
        accent: "#8B4513",
        background: "#40E0D0",
      },
    },
    terrains: [
      {
        id: "plague-pools",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.CORRUPTED,
          TerrainTrait.TOXIC,
          TerrainTrait.LOCAL,
        ],
        themedName: "Plague Pools",
        color: "#40E0D0",
        description: "Festering waters that spread disease",
      },
      {
        id: "bog-rot",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.CORRUPTED, TerrainTrait.SPRAWLING],
        themedName: "Bog Rot",
        color: "#DEB887",
        description: "Marshy plains consumed by decay",
      },
      {
        id: "rust-gardens",
        baseType: BaseTerrainType.FOREST,
        traits: [TerrainTrait.CORRUPTED, TerrainTrait.DENSE],
        themedName: "Rust Gardens",
        color: "#228B22",
        description: "Twisted vegetation growing from metal decay",
      },
      {
        id: "bone-mounds",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.CORRUPTED, TerrainTrait.CLUSTERED],
        themedName: "Bone Mounds",
        color: "#8B4513",
        description: "Hills formed from accumulated remains",
      },
      {
        id: "miasma-peaks",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [TerrainTrait.TOXIC, TerrainTrait.UNSTABLE],
        themedName: "Miasma Peaks",
        color: "#2E8B57",
        description: "Towering heights shrouded in poisonous fog",
      },
    ],
  };

  static readonly EXCESS_THRONE: TerrainSetting = {
    id: "excess-throne",
    name: "Excess Throne",
    description: "Hedonistic luxury and dark desires",
    palette: {
      name: "Excess Throne",
      description: "Hedonistic luxury and dark desires",
      gridLine: "#2a1a2a",
      colors: {
        primary: "#FF69B4",
        secondary: "#4B0082",
        accent: "#FFD700",
        background: "#000000",
      },
    },
    terrains: [
      {
        id: "mirror-lakes",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.MAGICAL,
          TerrainTrait.LOCAL,
        ],
        themedName: "Mirror Lakes",
        color: "#FF1493",
        description: "Perfectly reflective waters showing hidden desires",
      },
      {
        id: "silk-valleys",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.SPRAWLING],
        themedName: "Silk Valleys",
        color: "#FFD700",
        description: "Luxurious plains carpeted in finest fabrics",
      },
      {
        id: "velvet-groves",
        baseType: BaseTerrainType.FOREST,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.DENSE,
          TerrainTrait.MAGICAL,
        ],
        themedName: "Velvet Groves",
        color: "#4B0082",
        description: "Trees with bark like velvet and golden leaves",
      },
      {
        id: "gold-terraces",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.CLUSTERED],
        themedName: "Gold Terraces",
        color: "#FFFFFF",
        description: "Stepped hillsides adorned with precious metals",
      },
      {
        id: "crystal-spires",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.MAGICAL,
          TerrainTrait.VAST,
        ],
        themedName: "Crystal Spires",
        color: "#000000",
        description: "Towering crystal formations that sing with pleasure",
      },
    ],
  };

  static readonly DATA_NEXUS: TerrainSetting = {
    id: "data-nexus",
    name: "Data Nexus",
    description: "Global networks and digital empires",
    palette: {
      name: "Data Nexus",
      description: "Global networks and digital empires",
      gridLine: "#0a0a15",
      colors: {
        primary: "#FF00FF",
        secondary: "#00FFFF",
        accent: "#0066FF",
        background: "#1a1a2e",
      },
    },
    terrains: [
      {
        id: "data-oceans",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.VAST,
          TerrainTrait.DENSE,
        ],
        themedName: "Data Oceans",
        color: "#00FFFF",
        description: "Vast seas of flowing information streams",
      },
      {
        id: "corporate-zones",
        baseType: BaseTerrainType.PLAINS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.SPRAWLING],
        themedName: "Corporate Zones",
        color: "#4B0082",
        description: "Standardized digital territories controlled by megacorps",
      },
      {
        id: "server-forests",
        baseType: BaseTerrainType.FOREST,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.DENSE,
          TerrainTrait.CLUSTERED,
        ],
        themedName: "Server Forests",
        color: "#0066FF",
        description: "Dense groves of interconnected processing nodes",
      },
      {
        id: "data-centers",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.CLUSTERED],
        themedName: "Data Centers",
        color: "#FF00FF",
        description: "Elevated hubs managing regional network traffic",
      },
      {
        id: "core-mainframes",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.VAST,
          TerrainTrait.DENSE,
        ],
        themedName: "Core Mainframes",
        color: "#000080",
        description: "Massive computational peaks controlling global networks",
      },
    ],
  };

  static readonly STREET_LEVEL: TerrainSetting = {
    id: "street-level",
    name: "Street Level",
    description: "Urban sprawl and local networks",
    palette: {
      name: "Street Level",
      description: "Urban sprawl and local networks",
      gridLine: "#151520",
      colors: {
        primary: "#00FFFF",
        secondary: "#FF00FF",
        accent: "#1a1a2e",
        background: "#0066FF",
      },
    },
    terrains: [
      {
        id: "acid-channels",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.TOXIC,
          TerrainTrait.LOCAL,
        ],
        themedName: "Acid Channels",
        color: "#32CD32",
        description: "Industrial runoff and toxic waterways",
      },
      {
        id: "urban-sprawl",
        baseType: BaseTerrainType.PLAINS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.SPRAWLING,
          TerrainTrait.DENSE,
        ],
        themedName: "Urban Sprawl",
        color: "#FF4500",
        description: "Endless cityscape and development",
      },
      {
        id: "server-farms",
        baseType: BaseTerrainType.FOREST,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.DENSE,
          TerrainTrait.CLUSTERED,
        ],
        themedName: "Server Farms",
        color: "#FFD700",
        description: "Dense clusters of computing infrastructure",
      },
      {
        id: "scrap-heaps",
        baseType: BaseTerrainType.HILLS,
        traits: [TerrainTrait.RUINED, TerrainTrait.CLUSTERED],
        themedName: "Scrap Heaps",
        color: "#8B4513",
        description: "Mountains of discarded technology",
      },
      {
        id: "arcologies",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [TerrainTrait.ARTIFICIAL, TerrainTrait.VAST],
        themedName: "Arcologies",
        color: "#00CED1",
        description: "Massive self-contained city structures",
      },
    ],
  };

  static readonly BRITTLE_EMPIRE: TerrainSetting = {
    id: "brittle-empire",
    name: "Brittle Empire",
    description: "Unstable decay and salted earth",
    palette: {
      name: "Brittle Empire",
      description: "Unstable decay and salted earth",
      gridLine: "#2a1a15",
      colors: {
        primary: "#8B4513",
        secondary: "#D2B48C",
        accent: "#A0522D",
        background: "#2F2F2F",
      },
    },
    terrains: [
      {
        id: "salt-marshes",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.TOXIC,
          TerrainTrait.LOCAL,
          TerrainTrait.CORRUPTED,
        ],
        themedName: "Salt Marshes",
        color: "#D2B48C",
        description: "Poisoned wetlands where nothing grows",
      },
      {
        id: "burnt-plains",
        baseType: BaseTerrainType.PLAINS,
        traits: [
          TerrainTrait.RUINED,
          TerrainTrait.BURNING,
          TerrainTrait.SPRAWLING,
        ],
        themedName: "Burnt Plains",
        color: "#8B4513",
        description: "Scorched farmlands and ancient battlefields",
      },
      {
        id: "withered-groves",
        baseType: BaseTerrainType.FOREST,
        traits: [
          TerrainTrait.RUINED,
          TerrainTrait.SPARSE,
          TerrainTrait.CORRUPTED,
        ],
        themedName: "Withered Groves",
        color: "#2F2F2F",
        description: "Dead forests of blackened, leafless trees",
      },
      {
        id: "crumbling-estates",
        baseType: BaseTerrainType.HILLS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.RUINED,
          TerrainTrait.UNSTABLE,
        ],
        themedName: "Crumbling Estates",
        color: "#A0522D",
        description: "Collapsed noble holdings and abandoned manors",
      },
      {
        id: "fallen-citadels",
        baseType: BaseTerrainType.MOUNTAINS,
        traits: [
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.RUINED,
          TerrainTrait.VAST,
        ],
        themedName: "Fallen Citadels",
        color: "#7A3E1D",
        description: "Ruined fortress-cities that once ruled the land",
      },
    ],
  };

  static readonly HOSTILE_WATERS: TerrainSetting = {
    id: "hostile-waters",
    name: "Hostile Waters",
    description: "Ten varieties of deadly aquatic terrain",
    palette: {
      name: "Hostile Waters",
      description: "Ten varieties of deadly aquatic terrain",
      gridLine: "#0a1a2a",
      colors: {
        primary: "#006994",
        secondary: "#4682B4",
        accent: "#8FBC8F",
        background: "#2F4F4F",
      },
    },
    terrains: [
      {
        id: "salt-flats",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.TOXIC,
          TerrainTrait.SPRAWLING,
          TerrainTrait.CORRUPTED,
        ],
        themedName: "Salt Flats",
        color: "#E6E6FA",
        description:
          "Hypersaline waters that preserve corpses and corrode metal",
      },
      {
        id: "ash-slurry",
        baseType: BaseTerrainType.WATER,
        traits: [TerrainTrait.TOXIC, TerrainTrait.DENSE, TerrainTrait.BURNING],
        themedName: "Ash Slurry",
        color: "#696969",
        description:
          "Volcanic ash mixed with scalding water, choking and caustic",
      },
      {
        id: "oil-slicks",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.TOXIC,
          TerrainTrait.BURNING,
          TerrainTrait.UNSTABLE,
        ],
        themedName: "Oil Slicks",
        color: "#1C1C1C",
        description: "Thick petroleum waters that ignite without warning",
      },
      {
        id: "acid-pools",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.TOXIC,
          TerrainTrait.CORRUPTED,
          TerrainTrait.LOCAL,
        ],
        themedName: "Acid Pools",
        color: "#ADFF2F",
        description:
          "Concentrated acid that dissolves organic matter on contact",
      },
      {
        id: "blood-tides",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.CORRUPTED,
          TerrainTrait.MAGICAL,
          TerrainTrait.VAST,
        ],
        themedName: "Blood Tides",
        color: "#8B0000",
        description: "Crimson waters that drain life force from the living",
      },
      {
        id: "ice-slush",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.FROZEN,
          TerrainTrait.UNSTABLE,
          TerrainTrait.DENSE,
        ],
        themedName: "Ice Slush",
        color: "#B0E0E6",
        description: "Half-frozen waters with razor-sharp ice fragments",
      },
      {
        id: "mercury-lakes",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.TOXIC,
          TerrainTrait.ARTIFICIAL,
          TerrainTrait.RADIOACTIVE,
        ],
        themedName: "Mercury Lakes",
        color: "#C0C0C0",
        description: "Liquid metal that poisons the nervous system",
      },
      {
        id: "tar-swamps",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.DENSE,
          TerrainTrait.CLUSTERED,
          TerrainTrait.TOXIC,
        ],
        themedName: "Tar Swamps",
        color: "#2F1B14",
        description: "Thick bitumen that traps victims like prehistoric amber",
      },
      {
        id: "lightning-pools",
        baseType: BaseTerrainType.WATER,
        traits: [
          TerrainTrait.UNSTABLE,
          TerrainTrait.MAGICAL,
          TerrainTrait.RADIOACTIVE,
        ],
        themedName: "Lightning Pools",
        color: "#4169E1",
        description: "Electrically charged waters that arc with deadly current",
      },
      {
        id: "void-depths",
        baseType: BaseTerrainType.WATER,
        traits: [TerrainTrait.VAST, TerrainTrait.MAGICAL, TerrainTrait.HAUNTED],
        themedName: "Void Depths",
        color: "#191970",
        description: "Bottomless black waters that whisper madness to swimmers",
      },
    ],
  };

  static getAllSettings(): TerrainSetting[] {
    return [
      this.DOOM_FORGE,
      this.SPACE_OPERA,
      this.EVENT_HORIZON,
      this.GLOOMY_GARDEN,
      this.EXCESS_THRONE,
      this.DATA_NEXUS,
      this.STREET_LEVEL,
      this.BRITTLE_EMPIRE,
      this.HOSTILE_WATERS,
    ];
  }
}
