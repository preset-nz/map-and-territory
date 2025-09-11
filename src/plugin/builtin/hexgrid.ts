import { registerLayerType } from "@/layers/registry";
import { HexgridType } from "@/layers/adapters/hexgrid";
import type { PluginManifest, PluginModule } from "@/plugin/types";

export const hexgridPluginManifest: PluginManifest = {
  id: "core.hexgrid",
  name: "Hex Grid Layer",
  version: "1.0.0",
  apiVersion: "1.0.0",
  priority: 100, // High priority for anchor layer
};

export const hexgridPluginModule: PluginModule = {
  async activate(ctx) {
    ctx.log.info("Activating hex grid layer plugin");
    registerLayerType(HexgridType);
  },

  async deactivate(ctx) {
    ctx.log.info("Deactivating hex grid layer plugin");
    // Note: We don't unregister layer types in this implementation
    // as they may still be referenced in existing projects
  },
};
