import type { PluginManifest, PluginModule } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";

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
            icon: "lucide:layers",
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
      const project = useProjectStore.getState().current;
      const activeMapId = project?.activeMapId ?? null;
      if (!project || !activeMapId) return; // disabled state should prevent this
      const map = project.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      // insert according to selection semantics
      const sel = useSelectionStore.getState().selection;
      if (sel.kind === "layer") {
        // Try to insert above selection; if target is top anchor, fall back to just below grid
        let id = useProjectStore
          .getState()
          .insertLayerAbove(sel.id, "hexnoise");
        if (!id) {
          id = useProjectStore
            .getState()
            .insertLayerBeforeTopAnchor("hexnoise");
        }
        if (!id) return;
        useSelectionStore.getState().selectLayer(id);
        return;
      } else if (sel.kind === "map") {
        const id = useProjectStore
          .getState()
          .insertLayerBeforeTopAnchor("hexnoise");
        if (!id) return;
        useSelectionStore.getState().selectLayer(id);
        return;
      }
      // Fallback when nothing is selected: treat as map-level insert
      const id = useProjectStore
        .getState()
        .insertLayerBeforeTopAnchor("hexnoise");
      if (!id) return;
      useSelectionStore.getState().selectLayer(id);
    },
  },
};
