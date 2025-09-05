export type TerrainCategory =
  | "water"
  | "plains"
  | "forest"
  | "hills"
  | "mountains";

export interface MapPalette {
  terrain: Record<TerrainCategory, { fill: string; label?: string }>;
  grid: { line: string };
}
