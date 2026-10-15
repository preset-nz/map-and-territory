import type { MapPalette } from '@/palettes/types';

/** Doom Forge, the first built-in setting, for frames drawn before the document's palette arrives. */
export const DefaultPalette: MapPalette = {
  terrain: {
    water: { fill: '#8B0000', label: 'Blood Mires' },
    plains: { fill: '#d8d8d8', label: 'Bone Fields' },
    forest: { fill: '#696969', label: 'Ash Thickets' },
    hills: { fill: '#0C0C0C', label: 'Iron Graves' },
    mountains: { fill: '#FFFF00', label: 'Doom Crags' },
  },
  grid: { line: '#333333' },
};
