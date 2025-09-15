import type { PluginManifest, PluginModule } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { AppAPI } from "@/appapi";
import {
  getCurrentCampaign,
  getSelection,
  insertLayerAbove,
  insertLayerBeforeTopAnchor,
  applyLayerState,
  selectLayer,
} from "@/platform/plugin-runtime/state";

export const hexNoiseManifest: PluginManifest = {
  id: "app.plugins.hex-noise",
  name: "Hex Noise Layer",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [{ id: "layer.hexnoise.add", title: "Add Hex Noise Layer" }],
    toolbar: [
      {
        group: "scene",
        items: [
          {
            type: "button",
            command: "layer.hexnoise.add",
            icon: "lucide:grid-3x3",
            label: "Hex Noise",
            order: 2,
            enableWhen: ["hasActiveMap"],
            disabledReason: "Select a map to add a layer",
          },
        ],
      },
    ],
  },
};

export const hexNoiseModule: PluginModule = {
  activate: () => {
    registerLayerType(HexNoiseType);
    // Register Hex Noise properties schema
    registerPropertySchema("layer:hexnoise", {
      groups: [
        {
          id: "noise",
          title: "Hex Noise",
          rows: [
            [
              {
                kind: "select",
                id: "mode",
                label: "Mode",
                path: "mode",
                options: [
                  { value: "shape", label: "Shape (Grayscale)" },
                  { value: "paint", label: "Paint (Terrain)" },
                ],
              },
              {
                kind: "select",
                id: "terrainId",
                label: "Terrain",
                path: "terrainId",
                options: [{ value: "", label: "— Select Terrain —" }],
                optionsProvider: (app: unknown) => {
                  try {
                    type AppApi = typeof AppAPI;
                    const api = app as AppApi;
                    const entries = api.palette.list();
                    return [
                      { value: "", label: "— Select Terrain —" },
                      ...entries.map((e) => ({
                        value: e.id,
                        label: e.themedName,
                      })),
                    ];
                  } catch {
                    return [{ value: "", label: "— Select Terrain —" }];
                  }
                },
              },
            ],
            [
              { kind: "text", id: "seed", label: "Seed", path: "seed" },
              {
                kind: "number",
                id: "frequency",
                label: "Frequency",
                path: "frequency",
                min: 0.01,
                max: 5,
                step: 0.01,
              },
            ],
            [
              {
                kind: "number",
                id: "offsetX",
                label: "Offset X",
                path: "offsetX",
                min: -1000,
                max: 1000,
                step: 0.1,
              },
              {
                kind: "number",
                id: "offsetY",
                label: "Offset Y",
                path: "offsetY",
                min: -1000,
                max: 1000,
                step: 0.1,
              },
            ],
            [
              {
                kind: "number",
                id: "gamma",
                label: "Gamma",
                path: "gamma",
                min: 0.1,
                max: 5,
                step: 0.1,
              },
              {
                kind: "slider",
                id: "intensity",
                label: "Intensity",
                path: "intensity",
                min: 0,
                max: 1,
                step: 0.01,
              },
            ],
            [
              {
                kind: "number",
                id: "min",
                label: "Clamp Min",
                path: "min",
                min: 0,
                max: 1,
                step: 0.01,
              },
              {
                kind: "number",
                id: "max",
                label: "Clamp Max",
                path: "max",
                min: 0,
                max: 1,
                step: 0.01,
              },
            ],
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("layer:hexnoise");
  },
  commands: {
    "layer.hexnoise.add": () => {
      const campaign = getCurrentCampaign();
      const activeMapId = campaign?.activeMapId ?? null;
      if (!campaign || !activeMapId) return; // disabled state should prevent this
      const map = campaign.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      // insert according to selection semantics
      const sel = getSelection();
      if (sel.kind === "layer") {
        // Try to insert above selection; if target is top anchor, fall back to just below grid
        let id = insertLayerAbove(sel.id, "hexnoise");
        if (!id) {
          id = insertLayerBeforeTopAnchor("hexnoise");
        }
        if (!id) return;
        // Initialize defaults: paint mode and first terrain entry color
        // Keep default state (shape mode). Optionally seed terrainId without changing mode.
        try {
          const entries = AppAPI.palette.list();
          const first = entries[0];
          if (first) {
            applyLayerState(id, (draft) => {
              draft["terrainId"] = first.id;
              draft["paintColor"] = first.color;
            });
          }
        } catch {}
        selectLayer(id);
        return;
      } else if (sel.kind === "map") {
        const id = insertLayerBeforeTopAnchor("hexnoise");
        if (!id) return;
        try {
          const entries = AppAPI.palette.list();
          const first = entries[0];
          if (first) {
            applyLayerState(id, (draft) => {
              draft["terrainId"] = first.id;
              draft["paintColor"] = first.color;
            });
          }
        } catch {}
        selectLayer(id);
        return;
      }
      // Fallback when nothing is selected: treat as map-level insert
      const id = insertLayerBeforeTopAnchor("hexnoise");
      if (!id) return;
      try {
        const entries = AppAPI.palette.list();
        const first = entries[0];
        if (first) {
          applyLayerState(id, (draft) => {
            draft["terrainId"] = first.id;
            draft["paintColor"] = first.color;
          });
        }
      } catch {}
      selectLayer(id);
    },
  },
};
