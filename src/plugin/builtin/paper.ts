import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import type { PluginManifest, PluginModule } from "@/plugin/types";

export const paperPluginManifest: PluginManifest = {
  id: "core.paper",
  name: "Paper Layer",
  version: "1.0.0",
  apiVersion: "1.0.0",
  priority: 100, // High priority for anchor layer
};

export const paperPluginModule: PluginModule = {
  async activate(ctx) {
    ctx.log.info("Activating paper layer plugin");
    registerLayerType(PaperType);
  },

  async deactivate(ctx) {
    ctx.log.info("Deactivating paper layer plugin");
    // Note: We don't unregister layer types in this implementation
    // as they may still be referenced in existing projects
  },
};
