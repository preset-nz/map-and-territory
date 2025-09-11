import type { PluginManifest, PluginModule } from "@/plugin/types";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";

export const paperPluginManifest: PluginManifest = {
  id: "core.paper",
  name: "Paper Layer",
  version: "1.0.0",
  apiVersion: "1.0",
  priority: 100,
};

export const paperPluginModule: PluginModule = {
  activate: async () => {
    registerLayerType(PaperType);
    registerPropertySchema("layer:paper", {
      groups: [
        {
          id: "paper",
          title: "Paper",
          rows: [
            {
              kind: "select",
              id: "aspect",
              label: "Aspect Ratio",
              path: "aspect",
              options: [
                { value: "square", label: "Square (1:1)" },
                { value: "4:3", label: "4:3" },
                { value: "16:10", label: "16:10" },
              ],
            },
            { kind: "color", id: "color", label: "Color", path: "color" },
          ],
        },
      ],
    });
  },
  deactivate: async () => {
    try {
      unregisterPropertySchema("layer:paper");
    } catch {}
  },
};
