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
        group: 'layers',
        items: [
          { type: 'button', command: 'layer.hexnoise.add', icon: 'lucide:layers', label: 'Hex Noise', order: 10 },
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
      // move to be after paper and before hexgrid
      const cur = useProjectStore.getState().current!;
      const m = cur.maps.find((mm) => mm.id === activeMapId)!;
      const layers = m.layers ?? [];
      const hexIdx = layers.findIndex((l) => l.type === 'hexgrid');
      const targetIndex = hexIdx >= 0 ? hexIdx : 1; // 0=paper
      useProjectStore.getState().moveLayer(id, targetIndex);
      // select the new layer in scene tree
      useSelectionStore.getState().selectLayer(id);
    },
  },
};

