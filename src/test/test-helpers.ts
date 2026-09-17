import { HexgridType } from "@/layers/adapters/hexgrid";
import { PaperType } from "@/layers/adapters/paper";
import { registerLayerType } from "@/layers/registry";

/**
 * Register core layer types for testing
 * This ensures tests have access to paper and hexgrid layer types
 */
export function registerCoreLayerTypes() {
  registerLayerType(PaperType);
  registerLayerType(HexgridType);
}
