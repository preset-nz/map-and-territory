import { create } from "zustand";
import {
  getLayerPolicy,
  getLayerType,
  registerLayerType,
} from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";
import type { LayerInstance } from "@/layers/types";
import { nextNumberedName } from "@/stores/project/naming";

import type { MapPalette } from "@/palettes/types";

export interface Project {
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

interface ProjectStoreState {
  current: Project | null;
  // Actions
  createEmpty: (params?: { name?: string; description?: string }) => Project;
  setActive: (project: Project | null) => void;
  rename: (name: string) => void;
  setDescription: (description: string) => void;
  // Settings (T-012)
  setCampaignSetting: (settingId: string | undefined) => void;
  setMapSetting: (mapId: string, settingId: string | undefined) => void;
  // Map actions
  addMap: (params?: { name?: string; description?: string }) => string; // returns mapId
  selectMap: (id: string) => void;
  renameMap: (id: string, name: string) => void;
  setMapDescription: (id: string, description: string) => void;
  deleteMap: (id: string) => void;
  setMapVisibility: (id: string, visible: boolean) => void;
  setMapPaperAspect: (id: string, aspect: "square" | "4:3" | "16:10") => void;
  setMapPaperColor: (id: string, color: string) => void;
  // Layer CRUD
  // Default add: insert just below top anchor (grid)
  addLayer: (typeId: string, name?: string) => string | null;
  // Explicit insertion helpers for canonical semantics
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
}

function uuid(): string {
  // Use crypto.randomUUID if available, fallback to simple random
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID?: () => string }).randomUUID?.() ?? "";
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useProjectStore = create<ProjectStoreState>()((set, get) => ({
  current: null,
  // --- helpers (internal) ---
  // Normalize anchors: ensure paper at 0 and hexgrid at last
  // and both present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _normalizeAnchorsForMap(map: any) {
    const layers: LayerInstance[] = Array.isArray(map.layers)
      ? [...map.layers]
      : [];
    // ensure paper
    if (!layers.find((l) => l.type === "paper")) {
      layers.unshift({
        id: uuid(),
        type: "paper",
        name: "Paper",
        visible: true,
        state: PaperType.defaultState,
      });
    }
    // ensure grid
    if (!layers.find((l) => l.type === "hexgrid")) {
      layers.push({
        id: uuid(),
        type: "hexgrid",
        name: "Hex Grid",
        visible: true,
        state: HexgridType.defaultState,
      });
    }
    // move anchors to extremes preserving relative order of others
    const paper = layers.find((l) => l.type === "paper")!;
    const grid = layers.find((l) => l.type === "hexgrid")!;
    const rest = layers.filter((l) => l !== paper && l !== grid);
    map.layers = [paper, ...rest, grid];
    return map;
  },
  createEmpty: (params) => {
    const name =
      (params?.name ?? "Untitled Campaign").trim() || "Untitled Campaign";
    const description = params?.description?.trim();
    const project: Project = {
      id: uuid(),
      version: 1,
      name,
      description,
      settingId: undefined,
      maps: [],
      activeMapId: null,
    };
    set({ current: project });
    return project;
  },
  setCampaignSetting: (settingId) => {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, settingId } });
  },
  setMapSetting: (mapId, settingId) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m.id === mapId ? { ...m, settingId } : m)),
      },
    });
  },
  setActive: (project) => {
    if (!project) {
      set({ current: null });
      return;
    }
    // Ensure core layer types are registered
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    // Normalize anchors across maps
    const maps = project.maps.map(
      (m) =>
        (
          useProjectStore.getState() as unknown as {
            _normalizeAnchorsForMap: (m: unknown) => unknown;
          }
        )._normalizeAnchorsForMap({
          ...m,
        } as unknown) as Project["maps"][number],
    );
    set({ current: { ...project, maps } });
  },
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
    const name = params?.name ?? "Untitled Map";
    const description = params?.description ?? "";
    // Ensure core layer types are registered
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    if (!cur) {
      // Create a default campaign if none exists
      const project: Project = {
        id: uuid(),
        version: 1,
        name: "Untitled Campaign",
        description: "",
        maps: [],
        activeMapId: null,
      };
      set({ current: project });
    }
    const next = get().current!;
    const id = uuid();
    const baseLayers: LayerInstance[] = [
      {
        id: uuid(),
        type: "paper",
        name: "Paper",
        visible: true,
        state: PaperType.defaultState,
      },
      {
        id: uuid(),
        type: "hexgrid",
        name: "Hex Grid",
        visible: true,
        state: HexgridType.defaultState,
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
    const activeMapId =
      cur.activeMapId === id ? (maps[0]?.id ?? null) : cur.activeMapId;
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
        maps: cur.maps.map((m) =>
          m.id === id ? { ...m, paper: { ...m.paper, aspect } } : m,
        ),
      },
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
        nextNumberedName(
          def.title,
          (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
        ),
      visible: true,
      state: def.defaultState,
    };
    // Default insertion: just below top anchor (grid)
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
        nextNumberedName(
          def.title,
          (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
        ),
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
    // Cannot insert above top anchor
    if (layers[targetIdx]?.type === "hexgrid") return null;
    const layer: LayerInstance = {
      id: uuid(),
      type: typeId,
      name:
        (name && name.trim()) ||
        nextNumberedName(
          def.title,
          (map.layers ?? [])
            .filter((l) => l.type === typeId)
            .map((l) => l.name ?? ""),
        ),
      visible: true,
      state: def.defaultState,
    };
    const insertAt = Math.min(targetIdx + 1, Math.max(0, layers.length));
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
    const layer = (map.layers ?? []).find((l) => l.id === layerId);
    if (!layer) return;
    const policy = getLayerPolicy(layer.type);
    if (policy.canDelete === false) return;
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? { ...m, layers: (m.layers ?? []).filter((l) => l.id !== layerId) }
            : m,
        ),
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
    const copy: LayerInstance = {
      ...layer,
      id: uuid(),
      name: `${layer.name ?? ""} Copy`.trim(),
    };
    const layers = [...(map.layers ?? [])];
    const idx = layers.findIndex((l) => l.id === layerId);
    // Insert duplicated layer immediately above source
    const insertAt = idx >= 0 ? idx + 1 : layers.length;
    layers.splice(insertAt, 0, copy);
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) => (m === map ? { ...m, layers } : m)),
      },
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
    // Disallow moving anchors and crossing anchors
    const bottomIdx = layers.findIndex((l) => l.type === "paper");
    const topIdx = layers.findIndex((l) => l.type === "hexgrid");
    const isAnchor =
      layers[idx].type === "paper" || layers[idx].type === "hexgrid";
    if (isAnchor) return; // cannot move anchors
    // Clamp target within (bottomIdx+1) .. (topIdx-1)
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
    });
  },
}));
