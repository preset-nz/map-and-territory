import { create } from 'zustand';
import { getLayerPolicy, getLayerType, registerLayerType } from '@/layers/registry';
import { PaperType } from '@/layers/adapters/paper';
import { HexgridType } from '@/layers/adapters/hexgrid';
import type { LayerInstance } from '@/layers/types';

export interface Project {
  id: string;
  version: number;
  name: string;
  description?: string;
  maps: Array<{
    id: string;
    name: string;
    description?: string;
    visible: boolean;
    paper: { aspect: 'square' | '4:3' | '16:10'; color: string };
    layers?: LayerInstance[];
  }>;
  activeMapId: string | null;
}

interface ProjectStoreState {
  current: Project | null;
  // Actions
  createEmpty: (params?: { name?: string; description?: string }) => Project;
  setActive: (project: Project | null) => void;
  rename: (name: string) => void;
  setDescription: (description: string) => void;
  // Map actions
  addMap: (params?: { name?: string; description?: string }) => string; // returns mapId
  selectMap: (id: string) => void;
  renameMap: (id: string, name: string) => void;
  setMapDescription: (id: string, description: string) => void;
  deleteMap: (id: string) => void;
  setMapVisibility: (id: string, visible: boolean) => void;
  setMapPaperAspect: (id: string, aspect: 'square' | '4:3' | '16:10') => void;
  setMapPaperColor: (id: string, color: string) => void;
  // Layer CRUD
  addLayer: (typeId: string, name?: string) => string | null;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  moveLayer: (layerId: string, toIndex: number) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  renameLayer: (layerId: string, name: string) => void;
  updateLayerState: (layerId: string, patch: any) => void;
}

function uuid(): string {
  // Use crypto.randomUUID if available, fallback to simple random
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useProjectStore = create<ProjectStoreState>()(
  (set, get) => ({
        current: null,
        createEmpty: (params) => {
          const name = (params?.name ?? 'Untitled Campaign').trim() || 'Untitled Campaign';
          const description = params?.description?.trim();
          const project: Project = {
            id: uuid(),
            version: 1,
            name,
            description,
            maps: [],
            activeMapId: null,
          };
          set({ current: project });
          return project;
        },
        setActive: (project) => set({ current: project }),
        rename: (name) => {
          const cur = get().current;
          if (!cur) return;
          // Preserve spaces and live editing; don't trim on each keystroke
          set({ current: { ...cur, name } });
        },
        setDescription: (description) => {
          const cur = get().current;
          if (!cur) return;
          set({ current: { ...cur, description } });
        },
        addMap: (params) => {
          const cur = get().current;
          const name = params?.name ?? 'Untitled Map';
          const description = params?.description ?? '';
          // Ensure core layer types are registered
          registerLayerType(PaperType as any);
          registerLayerType(HexgridType as any);
          if (!cur) {
            // Create a default campaign if none exists
            const project: Project = {
              id: uuid(),
              version: 1,
              name: 'Untitled Campaign',
              description: '',
              maps: [],
              activeMapId: null,
            };
            set({ current: project });
          }
          const next = get().current!;
          const id = uuid();
          const baseLayers: LayerInstance[] = [
            { id: uuid(), type: 'paper', name: 'Paper', visible: true, state: (PaperType as any).defaultState },
            { id: uuid(), type: 'hexgrid', name: 'Hex Grid', visible: true, state: (HexgridType as any).defaultState },
          ];
          const maps = [...next.maps, { id, name, description, visible: true, paper: { aspect: '16:10', color: '#ffffff' }, layers: baseLayers }];
          set({ current: { ...next, maps, activeMapId: id } });
          return id;
        },
        selectMap: (id) => {
          const cur = get().current;
          if (!cur) return;
          if (!cur.maps.find((m) => m.id === id)) return;
          set({ current: { ...cur, activeMapId: id } });
        },
        renameMap: (id, name) => {
          const cur = get().current;
          if (!cur) return;
          set({
            current: {
              ...cur,
              maps: cur.maps.map((m) => (m.id === id ? { ...m, name } : m)),
            },
          });
        },
        setMapDescription: (id, description) => {
          const cur = get().current;
          if (!cur) return;
          set({
            current: {
              ...cur,
              maps: cur.maps.map((m) => (m.id === id ? { ...m, description } : m)),
            },
          });
        },
        deleteMap: (id) => {
          const cur = get().current;
          if (!cur) return;
          const maps = cur.maps.filter((m) => m.id !== id);
          const activeMapId = cur.activeMapId === id ? (maps[0]?.id ?? null) : cur.activeMapId;
          set({ current: { ...cur, maps, activeMapId } });
        },
        setMapVisibility: (id, visible) => {
          const cur = get().current;
          if (!cur) return;
          set({
            current: {
              ...cur,
              maps: cur.maps.map((m) => (m.id === id ? { ...m, visible } : m)),
            },
          });
        },
        setMapPaperAspect: (id, aspect) => {
          const cur = get().current;
          if (!cur) return;
          set({
            current: {
              ...cur,
              maps: cur.maps.map((m) => (m.id === id ? { ...m, paper: { ...m.paper, aspect } } : m)),
            },
          });
        },
        setMapPaperColor: (id, color) => {
          const cur = get().current;
          if (!cur) return;
          set({
            current: {
              ...cur,
              maps: cur.maps.map((m) => (m.id === id ? { ...m, paper: { ...m.paper, color } } : m)),
            },
          });
        },
        addLayer: (typeId, name) => {
          const cur = get().current; if (!cur) return null;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return null;
          const def = getLayerType(typeId); if (!def) return null;
          const max = def.policy?.maxInstances;
          const count = (map.layers ?? []).filter((l) => l.type === typeId).length;
          if (typeof max === 'number' && count >= max) return null;
          const layer: LayerInstance = { id: uuid(), type: typeId, name: name ?? def.title, visible: true, state: def.defaultState };
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers: [...(m.layers ?? []), layer] } : m)) } });
          return layer.id;
        },
        removeLayer: (layerId) => {
          const cur = get().current; if (!cur) return;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return;
          const layer = (map.layers ?? []).find((l) => l.id === layerId); if (!layer) return;
          const policy = getLayerPolicy(layer.type);
          if (policy.canDelete === false) return;
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers: (m.layers ?? []).filter((l) => l.id !== layerId) } : m)) } });
        },
        duplicateLayer: (layerId) => {
          const cur = get().current; if (!cur) return null;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return null;
          const layer = (map.layers ?? []).find((l) => l.id === layerId); if (!layer) return null;
          const policy = getLayerPolicy(layer.type);
          if (policy.canDuplicate === false) return null;
          const copy: LayerInstance = { ...layer, id: uuid(), name: `${layer.name ?? ''} Copy`.trim() };
          const layers = [...(map.layers ?? [])];
          const idx = layers.findIndex((l) => l.id === layerId);
          const insertAt = idx >= 0 ? idx : layers.length;
          layers.splice(insertAt, 0, copy);
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)) } });
          return copy.id;
        },
        moveLayer: (layerId, toIndex) => {
          const cur = get().current; if (!cur) return;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return;
          const layers = [...(map.layers ?? [])];
          const idx = layers.findIndex((l) => l.id === layerId); if (idx < 0) return;
          const [item] = layers.splice(idx, 1);
          layers.splice(Math.max(0, Math.min(toIndex, layers.length)), 0, item);
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)) } });
        },
        setLayerVisibility: (layerId, visible) => {
          const cur = get().current; if (!cur) return;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return;
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers: (m.layers ?? []).map((l) => (l.id === layerId ? { ...l, visible: l.type === 'paper' ? true : visible } : l)) } : m)) } });
        },
        renameLayer: (layerId, name) => {
          const cur = get().current; if (!cur) return;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return;
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers: (m.layers ?? []).map((l) => (l.id === layerId ? { ...l, name } : l)) } : m)) } });
        },
        updateLayerState: (layerId, patch) => {
          const cur = get().current; if (!cur) return;
          const map = cur.maps.find((m) => m.id === cur.activeMapId); if (!map) return;
          set({ current: { ...cur, maps: cur.maps.map((m) => (m === map ? { ...m, layers: (m.layers ?? []).map((l) => (l.id === layerId ? { ...l, state: { ...(l.state as any), ...(patch as any) } } : l)) } : m)) } });
        },
      })
);
