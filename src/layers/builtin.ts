import { FreeformType } from '@/layers/adapters/freeform-hex';
import { HexNoiseType } from '@/layers/adapters/hex-noise';
import { HexgridType } from '@/layers/adapters/hexgrid';
import { OutlineType } from '@/layers/adapters/outline';
import { PaperType } from '@/layers/adapters/paper';
import { registerLayerType } from '@/layers/registry';
import type { LayerType } from '@/layers/types';

/** Every layer kind the document has, by its kind name in `src-tauri/src/object_model/kinds.rs`. */
export const BUILTIN_LAYER_TYPES = [
  PaperType,
  HexgridType,
  HexNoiseType,
  FreeformType,
  OutlineType,
] as unknown as LayerType[];

export function registerBuiltinLayers() {
  for (const t of BUILTIN_LAYER_TYPES) registerLayerType(t);
}
