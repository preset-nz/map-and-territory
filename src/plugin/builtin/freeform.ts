import type { PluginManifest, PluginModule } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { AppAPI } from "@/appapi";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { AppAPI } from "@/appapi";
import { useLayoutStore } from "@/stores/layout";
import { registerToolCursor } from "@/plugin/loader";

export const freeformManifest: PluginManifest = {
  id: "app.plugins.freeform-layer",
  name: "Freeform Layer",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "layer.freeform.add", title: "Add Freeform Layer" },
      { id: "tool.freeform.paint", title: "Paint Tool" },
      { id: "tool.freeform.erase", title: "Erase Tool" },
    ],
    toolbar: [
      {
        group: "scene",
        items: [
          {
            type: "button",
            command: "layer.freeform.add",
            icon: "lucide:layers",
            label: "Freeform",
            order: 3,
            enableWhen: ["hasActiveMap"],
            disabledReason: "Select a map to add a layer",
          },
        ],
      },
      {
        group: "tools",
        items: [
          {
            type: "button",
            command: "tool.freeform.paint",
            icon: "lucide:paintbrush",
            label: "Paint",
            order: 1,
            enableWhen: ["activeLayerIs:freeform", "gridVisible"],
            disabledReason: "Select a Freeform layer",
          },
          {
            type: "button",
            command: "tool.freeform.erase",
            icon: "lucide:eraser",
            label: "Erase",
            order: 2,
            enableWhen: ["activeLayerIs:freeform", "gridVisible"],
            disabledReason: "Select a Freeform layer",
          },
        ],
      },
    ],
  },
};

export const freeformModule: PluginModule = {
  activate: () => {
    registerLayerType(FreeformType);
    // Declare CSS cursors for tools
    registerToolCursor("paint", "crosshair");
    registerToolCursor("erase", "cell");
    // Register Freeform properties schema
    registerPropertySchema("layer:freeform", {
      groups: [
        {
          id: "freeform",
          title: "Freeform",
          rows: [
            {
              kind: "slider",
              id: "opacity",
              label: "Opacity",
              path: "opacity",
              min: 0,
              max: 1,
              step: 0.01,
            },
            [
              {
                kind: "select",
                id: "brushTerrainId",
                label: "Brush Terrain",
                path: "brushTerrainId",
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
              {
                kind: "color",
                id: "brushColor",
                label: "Brush Color (Override)",
                path: "brushColor",
              },
            ],
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("layer:freeform");
  },
  commands: {
    "layer.freeform.add": () => {
      const campaign = useCampaignStore.getState().current;
      const activeMapId = campaign?.activeMapId ?? null;
      if (!campaign || !activeMapId) return;
      const map = campaign.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      const sel = useSelectionStore.getState().selection;
      const insertAboveSel = () =>
        useCampaignStore
          .getState()
          .insertLayerAbove(sel.kind === "layer" ? sel.id : "", "freeform");
      let id: string | null = null;
      if (sel.kind === "layer") {
        id =
          insertAboveSel() ||
          useCampaignStore.getState().insertLayerBeforeTopAnchor("freeform");
      } else if (sel.kind === "map") {
        id = useCampaignStore.getState().insertLayerBeforeTopAnchor("freeform");
      } else {
        id = useCampaignStore.getState().insertLayerBeforeTopAnchor("freeform");
      }
      if (!id) return;
      try {
        const entries = AppAPI.palette.list();
        const first = entries[0];
        if (first) {
          useCampaignStore.getState().updateLayerState(id, {
            brushTerrainId: first.id,
            brushColor: first.color,
          });
        }
      } catch {}
      useSelectionStore.getState().selectLayer(id);
    },
    "tool.freeform.paint": () => {
      useLayoutStore.getState().setActiveTool("paint");
    },
    "tool.freeform.erase": () => {
      useLayoutStore.getState().setActiveTool("erase");
    },
  },
};
