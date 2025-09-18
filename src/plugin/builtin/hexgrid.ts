import type { PluginManifest, PluginModule, EnvProvider } from "@/plugin/types";
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
            {
              kind: "checkbox",
              id: "usePaletteColor",
              label: "Use setting default color",
              path: "usePaletteColor",
            },
            {
              kind: "color",
              id: "color",
              label: "Grid Color",
              path: "color",
              disabledWhen: { path: "usePaletteColor", equals: true },
              presets: ["#ffffff", "#d9d9d9", "#808080", "#404040", "#000000"],
            },
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
  envProviders: [
    {
      priority: 0,
      provide(frame) {
        const layer = frame.layers.find((l) => l.type === "hexgrid");
        if (!layer) return {};
        const st = (layer.state ?? {}) as Record<string, unknown>;
        const size = Math.max(4, Number(st.size ?? 16));
        const orientation = st.orientation === "flat" ? "flat" : "pointy";
        return { grid: { size, orientation } } as const;
      },
    } satisfies EnvProvider,
  ],
};
