import type { PluginManifest, PluginModule } from '@/plugin/types';
import { registerLayerType } from '@/layers/registry';
import { HexNoiseType } from '@/layers/adapters/hex-noise';
import { useProjectStore } from '@/stores/project';
import { useSelectionStore } from '@/stores/selection';

export const hexNoiseManifest: PluginManifest = {
  id: 'app.plugins.hex-noise',
  name: 'Hex Noise Layer',
  version: '0.1.0',
  apiVersion: '1.0',
  contributes: {
    commands: [
      { id: 'layer.hexnoise.add', title: 'Add Hex Noise Layer' },
    ],
    toolbar: [
      {
        group: 'scene',
        items: [
          { type: 'button', command: 'layer.hexnoise.add', icon: 'lucide:layers', label: 'Hex Noise', order: 2 },
        ],
      },
    ],
  },
};

export const hexNoiseModule: PluginModule = {
  activate: () => {
    registerLayerType(HexNoiseType as any);
  },
  commands: {
    'layer.hexnoise.add': () => {
      const project = useProjectStore.getState().current;
      const activeMapId = project?.activeMapId ?? null;
      if (!project || !activeMapId) return; // disabled state should prevent this
      const map = project.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      // create layer
      const id = useProjectStore.getState().addLayer('hexnoise', 'Hex Noise');
      if (!id) return;
      const sel = useSelectionStore.getState().selection;
      const cur = useProjectStore.getState().current!;
      const m = cur.maps.find((mm) => mm.id === activeMapId)!;
      const layers = m.layers ?? [];
      let targetIndex = layers.length; // default append
      if (sel.kind === 'layer') {
        const idx = layers.findIndex((l) => l.id === sel.id);
        if (idx >= 0) targetIndex = idx + 1; // insert just above the selected layer
      } else if (sel.kind === 'map') {
        // insert just below grid (i.e., immediately before the hexgrid layer)
        const hexIdx = layers.findIndex((l) => l.type === 'hexgrid');
        targetIndex = hexIdx >= 0 ? hexIdx : 1; // fallback just after paper
      }
      useProjectStore.getState().moveLayer(id, targetIndex);
      // select the new layer in scene tree
      useSelectionStore.getState().selectLayer(id);
    },
  },
};
