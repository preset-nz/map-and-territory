import { create } from "zustand";
import { getLayerPolicy, getLayerType } from "@/layers/registry";
import type { LayerInstance } from "@/layers/types";
import { generateName } from "@/stores/naming";

import type { MapPalette } from "@/palettes/types";

export interface Campaign {
  id: string;
  version: number;
  name: string;
  description?: string;
  // Setting selection at campaign level (T-012)
  settingId?: string;
  palette?: MapPalette; // campaign-level palette (optional)
  maps: Array<{
    id: string;
    name: string;
    description?: string;
    visible: boolean;
    paper: { aspect: "square" | "4:3" | "16:10"; color: string };
    // Per-map setting override (T-012)
    settingId?: string;
    palette?: MapPalette; // optional per-map override
    layers?: LayerInstance[];
  }>;
  activeMapId: string | null;
}

interface CampaignStoreState {
  current: Campaign | null;
  dirty: boolean;
  // Actions
  createEmpty: (params?: { name?: string; description?: string }) => Campaign;
  setActive: (campaign: Campaign | null) => void;
  setDirty: (dirty: boolean) => void;
  rename: (name: string) => void;
  setDescription: (description: string) => void;
  // Settings (T-012)
  setCampaignSetting: (settingId: string | undefined) => void;
  setMapSetting: (mapId: string, settingId: string | undefined) => void;
  // Map actions
  addMap: (params?: { name?: string; description?: string }) => string | null; // returns mapId or null if no campaign
  selectMap: (id: string) => void;
  renameMap: (id: string, name: string) => void;
  setMapDescription: (id: string, description: string) => void;
  deleteMap: (id: string) => void;
  setMapVisibility: (id: string, visible: boolean) => void;
  setMapPaperAspect: (id: string, aspect: "square" | "4:3" | "16:10") => void;
  setMapPaperColor: (id: string, color: string) => void;
  // Layer CRUD
  addLayer: (typeId: string, name?: string) => string | null;
  insertLayerBeforeTopAnchor: (typeId: string, name?: string) => string | null;
  insertLayerAbove: (
    targetId: string,
    typeId: string,
    name?: string,
  ) => string | null;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  moveLayer: (layerId: string, toIndex: number) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  renameLayer: (layerId: string, name: string) => void;
  updateLayerState: (layerId: string, patch: Record<string, unknown>) => void;
  // Internal helper exposed for tests
  _normalizeAnchorsForMap: (
    map: Campaign["maps"][number],
  ) => Campaign["maps"][number];
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID?: () => string }).randomUUID?.() ?? "";
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useCampaignStore = create<CampaignStoreState>()((set, get) => ({
  current: null,
  dirty: false,
  // --- helpers (internal) ---
  _normalizeAnchorsForMap(map: Campaign["maps"][number]) {
    const layers: LayerInstance[] = Array.isArray(map.layers)
      ? [...map.layers]
      : [];
    if (!layers.find((l) => l.type === "paper")) {
      layers.unshift({
        id: uuid(),
        type: "paper",
        name: "Paper",
        visible: true,
        state: getLayerType("paper")?.defaultState || {
          color: "#ffffff",
          aspect: "16:10",
        },
      });
    }
    if (!layers.find((l) => l.type === "hexgrid")) {
      layers.push({
        id: uuid(),
        type: "hexgrid",
        name: "Hex Grid",
        visible: true,
        state: getLayerType("hexgrid")?.defaultState || {
          size: 24,
          orientation: "pointy",
          color: "#000000",
          alpha: 1,
          lineWidth: 1,
          origin: { x: 0, y: 0 },
        },
      });
    }
    const paper = layers.find((l) => l.type === "paper")!;
    const grid = layers.find((l) => l.type === "hexgrid")!;
    const rest = layers.filter((l) => l !== paper && l !== grid);
    map.layers = [paper, ...rest, grid];
    return map;
  },
  createEmpty: (params) => {
    const name =
      (params?.name && params.name.trim()) ||
      generateName({
        type: "campaign",
        base: "Campaign",
        existing: [],
        padTo: 2,
      });
    const campaign: Campaign = {
      id: uuid(),
      version: 1,
      name,
      description: params?.description ?? "",
      maps: [],
      activeMapId: null,
    };
    set({ current: campaign, dirty: false });
    return campaign;
  },
  setActive: (campaign) => {
    if (!campaign) {
      set({ current: null, dirty: false });
      return;
    }
    const maps = campaign.maps.map((m) =>
      useCampaignStore.getState()._normalizeAnchorsForMap({ ...m }),
    );
    set({ current: { ...campaign, maps }, dirty: false });
  },
  setDirty: (dirty) => set({ dirty }),
  rename: (name) => {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, name }, dirty: true });
  },
  setDescription: (description) => {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, description }, dirty: true });
  },
  setCampaignSetting: (settingId) => {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, settingId }, dirty: true });
  },
  setMapSetting: (mapId, settingId) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m.id === mapId ? { ...m, settingId } : m)),
      },
      dirty: true,
    });
  },
  addMap: (params) => {
    const cur = get().current;
    if (!cur) {
      // Hard prevent: do not auto-create a campaign implicitly
      return null;
    }
    const name =
      (params?.name && params.name.trim()) ||
      generateName({
        type: "map",
        base: "Map",
        existing: (get().current?.maps ?? []).map((m) => m.name),
        padTo: 2,
      });
    const description = params?.description ?? "";
    const next = cur;
    const id = uuid();
    const baseLayers: LayerInstance[] = [
      {
        id: uuid(),
        type: "paper",
        name: "Paper",
        visible: true,
        state: getLayerType("paper")?.defaultState || {
          color: "#ffffff",
          aspect: "16:10",
        },
      },
      {
        id: uuid(),
        type: "hexgrid",
        name: "Hex Grid",
        visible: true,
        state: getLayerType("hexgrid")?.defaultState || {
          size: 24,
          orientation: "pointy",
          color: "#000000",
          alpha: 1,
          lineWidth: 1,
          origin: { x: 0, y: 0 },
        },
      },
    ];
    const maps = [
      ...next.maps,
      {
        id,
        name,
        description,
        visible: true,
        paper: { aspect: "16:10", color: "#ffffff" } as const,
        layers: baseLayers,
      },
    ];
    set({ current: { ...next, maps, activeMapId: id }, dirty: true });
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
      dirty: true,
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
      dirty: true,
    });
  },
  deleteMap: (id) => {
    const cur = get().current;
    if (!cur) return;
    const maps = cur.maps.filter((m) => m.id !== id);
    const activeMapId =
      cur.activeMapId === id ? (maps[0]?.id ?? null) : cur.activeMapId;
    set({ current: { ...cur, maps, activeMapId }, dirty: true });
  },
  setMapVisibility: (id, visible) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m.id === id ? { ...m, visible } : m)),
      },
      dirty: true,
    });
  },
  setMapPaperAspect: (id, aspect) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m.id === id ? { ...m, paper: { ...m.paper, aspect } } : m,
        ),
      },
      dirty: true,
    });
  },
  setMapPaperColor: (id, color) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m.id === id ? { ...m, paper: { ...m.paper, color } } : m,
        ),
      },
      dirty: true,
    });
  },
  addLayer: (typeId, name) => {
    const cur = get().current;
    if (!cur) return null;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return null;
    const def = getLayerType(typeId);
    if (!def) return null;
    const max = def.policy?.maxInstances;
    const count = (map.layers ?? []).filter((l) => l.type === typeId).length;
    if (typeof max === "number" && count >= max) return null;
    const layer: LayerInstance = {
      id: uuid(),
      type: typeId,
      name:
        (name && name.trim()) ||
        generateName({
          type: "layer",
          base: def.title,
          existing: (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
          padTo: 2,
        }),
      visible: true,
      state: def.defaultState,
    };
    const layers = [...(map.layers ?? [])];
    const gridIdx = Math.max(
      1,
      layers.findIndex((l) => l.type === "hexgrid"),
    );
    const insertAt = gridIdx >= 0 ? gridIdx : layers.length;
    layers.splice(insertAt, 0, layer);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
      dirty: true,
    });
    return layer.id;
  },
  insertLayerBeforeTopAnchor: (typeId, name) => {
    const cur = get().current;
    if (!cur) return null;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return null;
    const def = getLayerType(typeId);
    if (!def) return null;
    const max = def.policy?.maxInstances;
    const count = (map.layers ?? []).filter((l) => l.type === typeId).length;
    if (typeof max === "number" && count >= max) return null;
    const layer: LayerInstance = {
      id: uuid(),
      type: typeId,
      name:
        (name && name.trim()) ||
        generateName({
          type: "layer",
          base: def.title,
          existing: (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
          padTo: 2,
        }),
      visible: true,
      state: def.defaultState,
    };
    const layers = [...(map.layers ?? [])];
    const gridIdx = layers.findIndex((l) => l.type === "hexgrid");
    const insertAt = gridIdx >= 0 ? gridIdx : Math.max(1, layers.length);
    layers.splice(insertAt, 0, layer);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
      dirty: true,
    });
    return layer.id;
  },
  insertLayerAbove: (targetId, typeId, name) => {
    const cur = get().current;
    if (!cur) return null;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return null;
    const def = getLayerType(typeId);
    if (!def) return null;
    const max = def.policy?.maxInstances;
    const count = (map.layers ?? []).filter((l) => l.type === typeId).length;
    if (typeof max === "number" && count >= max) return null;
    const layers = [...(map.layers ?? [])];
    const targetIdx = layers.findIndex((l) => l.id === targetId);
    if (targetIdx < 0) return null;
    if (layers[targetIdx]?.type === "hexgrid") return null;
    const layer: LayerInstance = {
      id: uuid(),
      type: typeId,
      name:
        (name && name.trim()) ||
        generateName({
          type: "layer",
          base: def.title,
          existing: (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
          padTo: 2,
        }),
      visible: true,
      state: def.defaultState,
    };
    const insertAt = Math.min(targetIdx + 1, layers.length);
    layers.splice(insertAt, 0, layer);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
    });
    return layer.id;
  },
  removeLayer: (layerId) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    const target = (map.layers ?? []).find((l) => l.id === layerId);
    if (!target) return;
    const policy = getLayerPolicy(target.type);
    if (policy.canDelete === false) return;
    const layers = [...(map.layers ?? [])].filter((l) => l.id !== layerId);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
    });
  },
  duplicateLayer: (layerId) => {
    const cur = get().current;
    if (!cur) return null;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return null;
    const layer = (map.layers ?? []).find((l) => l.id === layerId);
    if (!layer) return null;
    const policy = getLayerPolicy(layer.type);
    if (policy.canDuplicate === false) return null;
    const copyName = generateName({
      type: "layer",
      base: layer.name ?? "Layer",
      existing: (map.layers ?? []).map((l) => l.name ?? ""),
      duplicateOf: layer.name ?? undefined,
      padTo: 2,
    });
    const copy: LayerInstance = { ...layer, id: uuid(), name: copyName };
    const layers = [...(map.layers ?? [])];
    const idx = layers.findIndex((l) => l.id === layerId);
    const insertAt = idx >= 0 ? idx + 1 : layers.length;
    layers.splice(insertAt, 0, copy);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
      dirty: true,
    });
    return copy.id;
  },
  moveLayer: (layerId, toIndex) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    const layers = [...(map.layers ?? [])];
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const bottomIdx = layers.findIndex((l) => l.type === "paper");
    const topIdx = layers.findIndex((l) => l.type === "hexgrid");
    const isAnchor =
      layers[idx].type === "paper" || layers[idx].type === "hexgrid";
    if (isAnchor) return;
    const minIdx = bottomIdx >= 0 ? bottomIdx + 1 : 0;
    const maxIdx = topIdx >= 0 ? topIdx - 1 : layers.length - 1;
    const [item] = layers.splice(idx, 1);
    const clamped = Math.max(minIdx, Math.min(toIndex, maxIdx));
    layers.splice(Math.max(0, Math.min(clamped, layers.length)), 0, item);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
      dirty: true,
    });
  },
  setLayerVisibility: (layerId, visible) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? {
                ...m,
                layers: (m.layers ?? []).map((l) =>
                  l.id === layerId
                    ? { ...l, visible: l.type === "paper" ? true : visible }
                    : l,
                ),
              }
            : m,
        ),
      },
      dirty: true,
    });
  },
  renameLayer: (layerId, name) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? {
                ...m,
                layers: (m.layers ?? []).map((l) =>
                  l.id === layerId ? { ...l, name } : l,
                ),
              }
            : m,
        ),
      },
      dirty: true,
    });
  },
  updateLayerState: (layerId, patch) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    const isRecord = (x: unknown): x is Record<string, unknown> =>
      !!x && typeof x === "object" && !Array.isArray(x);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? {
                ...m,
                layers: (m.layers ?? []).map((l) =>
                  l.id === layerId
                    ? {
                        ...l,
                        state: isRecord(l.state)
                          ? { ...l.state, ...patch }
                          : patch,
                      }
                    : l,
                ),
              }
            : m,
        ),
      },
      dirty: true,
    });
  },
}));

export type { CampaignStoreState };
