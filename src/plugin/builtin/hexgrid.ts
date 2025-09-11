import type { PluginManifest, PluginModule } from "@/plugin/types";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { registerLayerType } from "@/layers/registry";
import { HexgridType } from "@/layers/adapters/hexgrid";

export const hexgridPluginManifest: PluginManifest = {
  id: "core.hexgrid",
  name: "Hex Grid Layer",
  version: "1.0.0",
  apiVersion: "1.0",
  priority: 100,
};

export const hexgridPluginModule: PluginModule = {
  activate: async () => {
    registerLayerType(HexgridType);
    registerPropertySchema("layer:hexgrid", {
      groups: [
        {
          id: "hexgrid",
          title: "Hex Grid",
          rows: [
            {
              kind: "select",
              id: "orientation",
              label: "Orientation",
              path: "orientation",
              options: [
                { value: "pointy", label: "Pointy Top" },
                { value: "flat", label: "Flat Top" },
              ],
            },
            {
              kind: "slider",
              id: "size",
              label: "Hex Size",
              path: "size",
              min: 8,
              max: 120,
              step: 1,
            },
            {
              kind: "slider",
              id: "lineWidth",
              label: "Line Width",
              path: "lineWidth",
              min: 1,
              max: 8,
              step: 1,
            },
            { kind: "color", id: "color", label: "Line Color", path: "color" },
          ],
        },
      ],
    });
  },
  deactivate: async () => {
    try {
      unregisterPropertySchema("layer:hexgrid");
    } catch {}
  },
};
