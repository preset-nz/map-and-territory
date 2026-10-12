import { DefaultPalette } from '@/palettes/defaults';
import type { MapPalette, TerrainCategory } from '@/palettes/types';

function coerceTerrainKey(key: string | undefined): TerrainCategory {
  switch (key) {
    case 'water':
    case 'plains':
    case 'forest':
    case 'hills':
    case 'mountains':
      return key;
    case 'desert':
      return 'plains'; // desert presented via arid trait in settings
    default:
      return 'plains';
  }
}

export function resolveTerrainFill(
  palette: MapPalette | undefined,
  terrainKey: string | undefined,
): string {
  const p = palette || DefaultPalette;
  const key = coerceTerrainKey(terrainKey);
  return p.terrain[key]?.fill || DefaultPalette.terrain.plains.fill;
}
