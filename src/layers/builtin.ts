import { CartoucheType } from '@/layers/adapters/cartouche';
import { CompassType } from '@/layers/adapters/compass';
import { FreeformType } from '@/layers/adapters/freeform-hex';
import { HexNoiseType } from '@/layers/adapters/hex-noise';
import { HexgridType } from '@/layers/adapters/hexgrid';
import { ImageType } from '@/layers/adapters/image';
import { LocationsType } from '@/layers/adapters/locations';
import { OutlineType } from '@/layers/adapters/outline';
import { PaperType } from '@/layers/adapters/paper';
import { registerLayerType } from '@/layers/registry';
import type { LayerType } from '@/layers/types';

/**
 * Every layer and furniture kind the document has, by its kind name in
 * `crates/map-and-territory-model/src/kinds.rs`.
 */
export const BUILTIN_LAYER_TYPES = [
  PaperType,
  HexgridType,
  HexNoiseType,
  FreeformType,
  OutlineType,
  ImageType,
  LocationsType,
  CartoucheType,
  CompassType,
] as unknown as LayerType[];

export function registerBuiltinLayers() {
  for (const t of BUILTIN_LAYER_TYPES) registerLayerType(t);
}
