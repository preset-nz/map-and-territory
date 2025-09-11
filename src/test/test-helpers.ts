import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";

/**
 * Register core layer types for testing
 * This ensures tests have access to paper and hexgrid layer types
 */
export function registerCoreLayerTypes() {
  registerLayerType(PaperType);
  registerLayerType(HexgridType);
}
