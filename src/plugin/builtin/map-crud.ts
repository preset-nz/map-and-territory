import type { PluginManifest, PluginModule } from '@/plugin/types';
import { executeCommand } from '@/lib/commands';

export const mapCrudManifest: PluginManifest = {
  id: 'app.plugins.map-crud',
  name: 'Map CRUD',
  version: '0.1.0',
  apiVersion: '1.0',
  contributes: {
    commands: [
      { id: 'app.map.new', title: 'New Map', shortcut: 'Mod+N' },
      { id: 'app.map.delete', title: 'Delete Map' },
    ],
    toolbar: [
      {
        group: 'scene',
        items: [
          { type: 'button', command: 'app.map.new', icon: 'lucide:map', label: 'New Map', order: 1 },
        ],
      },
    ],
  },
};

export const mapCrudModule: PluginModule = {
  commands: {
    'app.map.new': async () => {
      await executeCommand('host.action.newMap');
    },
    'app.map.delete': async (payload?: unknown) => {
      await executeCommand('host.action.deleteMap', payload);
    },
  },
};
