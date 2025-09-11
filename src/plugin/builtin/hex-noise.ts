import type { PluginManifest, PluginModule } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { AppAPI } from "@/appapi";

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
  },
  commands: {
    "layer.hexnoise.add": () => {
      const campaign = useCampaignStore.getState().current;
      const activeMapId = campaign?.activeMapId ?? null;
      if (!campaign || !activeMapId) return; // disabled state should prevent this
      const map = campaign.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      // insert according to selection semantics
      const sel = useSelectionStore.getState().selection;
      if (sel.kind === "layer") {
        // Try to insert above selection; if target is top anchor, fall back to just below grid
        let id = useCampaignStore
          .getState()
          .insertLayerAbove(sel.id, "hexnoise");
        if (!id) {
          id = useCampaignStore
            .getState()
            .insertLayerBeforeTopAnchor("hexnoise");
        }
        if (!id) return;
        // Initialize defaults: paint mode and first terrain entry color
        // Keep default state (shape mode). Optionally seed terrainId without changing mode.
        try {
          const entries = AppAPI.palette.list();
          const first = entries[0];
          if (first) {
            useCampaignStore.getState().updateLayerState(id, {
              terrainId: first.id,
              paintColor: first.color,
            });
          }
        } catch {}
        useSelectionStore.getState().selectLayer(id);
        return;
      } else if (sel.kind === "map") {
        const id = useCampaignStore
          .getState()
          .insertLayerBeforeTopAnchor("hexnoise");
        if (!id) return;
        try {
          const entries = AppAPI.palette.list();
          const first = entries[0];
          if (first) {
            useCampaignStore.getState().updateLayerState(id, {
              terrainId: first.id,
              paintColor: first.color,
            });
          }
        } catch {}
        useSelectionStore.getState().selectLayer(id);
        return;
      }
      // Fallback when nothing is selected: treat as map-level insert
      const id = useCampaignStore
        .getState()
        .insertLayerBeforeTopAnchor("hexnoise");
      if (!id) return;
      try {
        const entries = AppAPI.palette.list();
        const first = entries[0];
        if (first) {
          useCampaignStore.getState().updateLayerState(id, {
            terrainId: first.id,
            paintColor: first.color,
          });
        }
      } catch {}
      useSelectionStore.getState().selectLayer(id);
    },
  },
};
