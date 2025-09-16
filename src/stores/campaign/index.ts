import { create } from "zustand";
import { produce, enablePatches } from "immer";

// Enable patches support for performance monitoring
try {
  enablePatches();
} catch {
  // Patches already enabled or not available
}
import { getLayerPolicy, getLayerType } from "@/layers/registry";
import type { LayerInstance } from "@/layers/types";
import {
  clampToAnchorRange,
  getAnchorBounds,
  HEXGRID_ANCHOR_TYPE,
  isAnchorLayer,
  PAPER_ANCHOR_TYPE,
} from "./anchors";
import { generateName } from "@/stores/naming";
import { debugEnabled } from "@/lib/debug";

import type { MapPalette } from "@/palettes/types";
import type { FreeformCell } from "@/layers/adapters/freeform-hex";

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

type PaperAspect = "square" | "4:3" | "16:10";

// Batch operation types
export interface BatchLimits {
  maxOperations: number;
  timeoutMs: number;
  maxMemoryMB: number;
}

// Re-export batch operation types from shared location
export type {
  CellsDelta,
  BatchResult,
  BatchMetrics,
} from "@/types/batch-operations";

// Import types for local use
import type {
  CellsDelta,
  BatchResult,
  BatchMetrics,
} from "@/types/batch-operations";

const DEFAULT_BATCH_LIMITS: BatchLimits = {
  maxOperations: 10000,
  timeoutMs: 1000,
  maxMemoryMB: 50,
};

/**
 * Validates batch operation parameters with comprehensive error scenarios
 */
function validateBatchOperation(
  delta: CellsDelta,
  limits: BatchLimits = DEFAULT_BATCH_LIMITS,
): { valid: boolean; error?: string; errorType?: string } {
  const operationCount =
    Object.keys(delta.set || {}).length + (delta.delete?.length || 0);

  // Check operation count limits
  if (operationCount > limits.maxOperations) {
    return {
      valid: false,
      error: `Batch operation exceeds maximum of ${limits.maxOperations} operations (${operationCount} requested)`,
      errorType: "OPERATION_LIMIT_EXCEEDED",
    };
  }

  // Check for empty operations
  if (operationCount === 0) {
    return {
      valid: false,
      error:
        "Batch operation cannot be empty. Provide at least one 'set' or 'delete' operation",
      errorType: "EMPTY_OPERATION",
    };
  }

  // Validate cell key format (q,r) with enhanced malformed detection
  const setKeys = Object.keys(delta.set || {});
  const deleteKeys = delta.delete || [];

  // Check for invalid key types
  for (const key of setKeys) {
    if (typeof key !== "string" || key.length === 0) {
      return {
        valid: false,
        error: `Invalid cell key: ${JSON.stringify(key)}. Cell keys must be non-empty strings`,
        errorType: "INVALID_CELL_KEY_TYPE",
      };
    }
  }

  for (const key of deleteKeys) {
    if (typeof key !== "string" || key.length === 0) {
      return {
        valid: false,
        error: `Invalid cell key: ${JSON.stringify(key)}. Cell keys must be non-empty strings`,
        errorType: "INVALID_CELL_KEY_TYPE",
      };
    }
  }

  const cellKeys = [...setKeys, ...deleteKeys];

  // Check for basic q,r format
  for (const key of cellKeys) {
    if (!/^-?\d+,-?\d+$/.test(key)) {
      return {
        valid: false,
        error: `Invalid cell key format: "${key}". Expected format: "q,r" where q and r are integers`,
        errorType: "INVALID_CELL_KEY_FORMAT",
      };
    }

    // Check for extreme coordinate values that could cause memory issues
    const [qStr, rStr] = key.split(",");
    const q = parseInt(qStr, 10);
    const r = parseInt(rStr, 10);
    const MAX_COORDINATE = 100000; // Prevent extremely large coordinates

    if (Math.abs(q) > MAX_COORDINATE || Math.abs(r) > MAX_COORDINATE) {
      return {
        valid: false,
        error: `Cell coordinate too large: "${key}". Coordinates must be within ±${MAX_COORDINATE}`,
        errorType: "COORDINATE_OUT_OF_BOUNDS",
      };
    }
  }

  // Check for duplicate keys between set and delete operations
  const setKeysSet = new Set(setKeys);
  const duplicateKeys = deleteKeys.filter((key) => setKeysSet.has(key));

  if (duplicateKeys.length > 0) {
    return {
      valid: false,
      error: `Conflicting operations: keys appear in both 'set' and 'delete': [${duplicateKeys.join(", ")}]`,
      errorType: "CONFLICTING_OPERATIONS",
    };
  }

  // Memory pressure detection - estimate memory usage
  const estimatedMemoryMB = estimateBatchMemoryUsage(delta);
  if (estimatedMemoryMB > limits.maxMemoryMB) {
    return {
      valid: false,
      error: `Estimated memory usage ${estimatedMemoryMB.toFixed(2)}MB exceeds limit of ${limits.maxMemoryMB}MB`,
      errorType: "MEMORY_LIMIT_EXCEEDED",
    };
  }

  // Validate cell data structure
  if (delta.set) {
    for (const [key, cell] of Object.entries(delta.set)) {
      if (!cell || typeof cell !== "object" || Array.isArray(cell)) {
        return {
          valid: false,
          error: `Invalid cell data for key "${key}": ${JSON.stringify(cell)}. Expected object`,
          errorType: "INVALID_CELL_DATA",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Type guard for layer state validation
 */
export function isValidLayerState<T = Record<string, unknown>>(
  state: unknown,
): state is T {
  return state !== null && typeof state === "object" && !Array.isArray(state);
}

/**
 * Type guard for freeform cell validation
 */
export function isValidFreeformCell(cell: unknown): cell is FreeformCell {
  return (
    cell !== null &&
    typeof cell === "object" &&
    !Array.isArray(cell) &&
    "terrainId" in cell &&
    typeof (cell as { terrainId: unknown }).terrainId === "string"
  );
}

/**
 * Type guard for cells delta validation
 */
export function isValidCellsDelta<TCell = FreeformCell>(
  delta: unknown,
  cellValidator?: (cell: unknown) => cell is TCell,
): delta is CellsDelta<TCell> {
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) {
    return false;
  }

  const d = delta as Partial<CellsDelta<TCell>>;

  // Check set operations
  if (d.set !== undefined) {
    if (typeof d.set !== "object" || Array.isArray(d.set)) {
      return false;
    }

    // Validate each cell if validator provided
    if (cellValidator) {
      for (const [key, cell] of Object.entries(d.set)) {
        if (typeof key !== "string" || !cellValidator(cell)) {
          return false;
        }
      }
    }
  }

  // Check delete operations
  if (d.delete !== undefined) {
    if (!Array.isArray(d.delete)) {
      return false;
    }
    for (const key of d.delete) {
      if (typeof key !== "string") {
        return false;
      }
    }
  }

  // Must have at least one operation
  const hasSetOps = d.set !== undefined && Object.keys(d.set).length > 0;
  const hasDeleteOps = d.delete !== undefined && d.delete.length > 0;

  return hasSetOps || hasDeleteOps;
}

/**
 * Estimate memory usage for a batch operation in MB
 */
function estimateBatchMemoryUsage<TCell = FreeformCell>(
  delta: CellsDelta<TCell>,
): number {
  let estimatedBytes = 0;

  // Estimate memory for set operations
  if (delta.set) {
    for (const [key, cell] of Object.entries(delta.set)) {
      // Rough estimation: key + JSON.stringify(cell) + object overhead
      try {
        const cellJson = JSON.stringify(cell);
        estimatedBytes += key.length * 2; // UTF-16 string
        estimatedBytes += cellJson.length * 2; // UTF-16 string
        estimatedBytes += 100; // Object overhead, pointers, etc.
      } catch {
        // If JSON.stringify fails, estimate based on type
        estimatedBytes += key.length * 2; // UTF-16 string
        estimatedBytes += 200; // Conservative estimate for non-serializable data
      }
    }
  }

  // Estimate memory for delete operations
  if (delta.delete) {
    for (const key of delta.delete) {
      estimatedBytes += key.length * 2; // UTF-16 string
      estimatedBytes += 50; // Tracking overhead
    }
  }

  // Add Immer overhead (roughly 2x for structural sharing)
  estimatedBytes *= 2;

  return estimatedBytes / (1024 * 1024); // Convert to MB
}

const DEFAULT_PAPER_STATE: { aspect: PaperAspect; color: string } = {
  aspect: "16:10",
  color: "#ffffff",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function sanitizePaperState(state: unknown) {
  const base = isPlainObject(state)
    ? { ...(state as Record<string, unknown>) }
    : ({} as Record<string, unknown>);
  const aspectInput = base.aspect as PaperAspect | undefined;
  const aspect: PaperAspect =
    aspectInput === "square" || aspectInput === "4:3" || aspectInput === "16:10"
      ? aspectInput
      : DEFAULT_PAPER_STATE.aspect;
  const colorInput = base.color as string | undefined;
  const color =
    typeof colorInput === "string" && colorInput.trim().length > 0
      ? colorInput
      : DEFAULT_PAPER_STATE.color;
  base.aspect = aspect;
  base.color = color;
  return { state: base, canonical: { aspect, color } } as const;
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
  // Transactional write seam for tools/plugins (seam-first)
  applyLayerState: (
    layerId: string,
    updater: (draft: Record<string, unknown>) => void,
  ) => void;
  // Batch operations for efficient bulk updates
  applyLayerStateBatch: <T = Record<string, unknown>>(
    layerId: string,
    updater: (draft: T) => void | T,
    validator?: (state: unknown) => state is T,
  ) => BatchResult<T>;
  applyCellsDelta: <TCell = FreeformCell>(
    layerId: string,
    delta: CellsDelta<TCell>,
    cellValidator?: (cell: unknown) => cell is TCell,
  ) => BatchResult<void>;
  // Internal helper exposed for tests
  _normalizeAnchorsForMap: (
    map: Campaign["maps"][number],
  ) => Campaign["maps"][number];
  _batchUpdateLayerState: <T>(
    layerId: string,
    updater: (draft: T) => void | T,
  ) => BatchResult<T>;
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
    const existingPaperIdx = layers.findIndex(
      (l) => l.type === PAPER_ANCHOR_TYPE,
    );
    const mapPaperDefaults = map.paper ?? DEFAULT_PAPER_STATE;
    const mapPaperRecord = {
      aspect: mapPaperDefaults.aspect,
      color: mapPaperDefaults.color,
    } as Record<string, unknown>;
    if (existingPaperIdx === -1) {
      const seedState = {
        ...DEFAULT_PAPER_STATE,
        ...mapPaperRecord,
      };
      const { state, canonical } = sanitizePaperState(seedState);
      layers.unshift({
        id: uuid(),
        type: PAPER_ANCHOR_TYPE,
        name: "Paper",
        visible: true,
        state,
      });
      map.paper = canonical;
    } else {
      const paperLayer = layers[existingPaperIdx];
      const seedState = {
        ...DEFAULT_PAPER_STATE,
        ...mapPaperRecord,
        ...(isPlainObject(paperLayer.state) ? paperLayer.state : {}),
      };
      const { state, canonical } = sanitizePaperState(seedState);
      layers[existingPaperIdx] = { ...paperLayer, state } as typeof paperLayer;
      map.paper = canonical;
    }
    if (!layers.find((l) => l.type === HEXGRID_ANCHOR_TYPE)) {
      layers.push({
        id: uuid(),
        type: HEXGRID_ANCHOR_TYPE,
        name: "Hex Grid",
        visible: true,
        state: getLayerType(HEXGRID_ANCHOR_TYPE)?.defaultState || {
          size: 24,
          orientation: "pointy",
          color: "#000000",
          alpha: 1,
          lineWidth: 1,
          origin: { x: 0, y: 0 },
        },
      });
    }
    const paper = layers.find((l) => l.type === PAPER_ANCHOR_TYPE)!;
    const grid = layers.find((l) => l.type === HEXGRID_ANCHOR_TYPE)!;
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
    const paperDefaultsRecord = isPlainObject(
      getLayerType(PAPER_ANCHOR_TYPE)?.defaultState,
    )
      ? (getLayerType(PAPER_ANCHOR_TYPE)?.defaultState as Record<
          string,
          unknown
        >)
      : {};
    const basePaperState = {
      ...DEFAULT_PAPER_STATE,
      ...paperDefaultsRecord,
    };
    const { state: paperState, canonical: canonicalPaper } =
      sanitizePaperState(basePaperState);
    const baseLayers: LayerInstance[] = [
      {
        id: uuid(),
        type: PAPER_ANCHOR_TYPE,
        name: "Paper",
        visible: true,
        state: paperState,
      },
      {
        id: uuid(),
        type: HEXGRID_ANCHOR_TYPE,
        name: "Hex Grid",
        visible: true,
        state: getLayerType(HEXGRID_ANCHOR_TYPE)?.defaultState || {
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
        paper: canonicalPaper,
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
        maps: cur.maps.map((m) => {
          if (m.id !== id) return m;
          const layers = [...(m.layers ?? [])];
          const idx = layers.findIndex((l) => l.type === PAPER_ANCHOR_TYPE);
          if (idx < 0) return m;
          const paperLayer = layers[idx];
          const rawState = {
            ...(isPlainObject(paperLayer.state) ? paperLayer.state : {}),
            aspect,
          } as Record<string, unknown>;
          const { state, canonical } = sanitizePaperState(rawState);
          layers[idx] = { ...paperLayer, state } as typeof paperLayer;
          return { ...m, layers, paper: canonical };
        }),
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
        maps: cur.maps.map((m) => {
          if (m.id !== id) return m;
          const layers = [...(m.layers ?? [])];
          const idx = layers.findIndex((l) => l.type === PAPER_ANCHOR_TYPE);
          if (idx < 0) return m;
          const paperLayer = layers[idx];
          const rawState = {
            ...(isPlainObject(paperLayer.state) ? paperLayer.state : {}),
            color,
          } as Record<string, unknown>;
          const { state, canonical } = sanitizePaperState(rawState);
          layers[idx] = { ...paperLayer, state } as typeof paperLayer;
          return { ...m, layers, paper: canonical };
        }),
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
    const bounds = getAnchorBounds(layers);
    const insertAt = Math.min(bounds.top, layers.length);
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
    const bounds = getAnchorBounds(layers);
    const insertAt = Math.min(bounds.top, Math.max(bounds.min, layers.length));
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
    if (isAnchorLayer(layers[targetIdx])) return null;
    const bounds = getAnchorBounds(layers);
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
    const desiredIndex = Math.min(targetIdx + 1, layers.length);
    const insertAt = Math.min(bounds.top, Math.max(bounds.min, desiredIndex));
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
    const bounds = getAnchorBounds(layers);
    const desiredIndex = idx >= 0 ? idx + 1 : layers.length;
    const insertAt = Math.min(bounds.top, Math.max(bounds.min, desiredIndex));
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
    if (isAnchorLayer(layers[idx])) return;
    const bounds = getAnchorBounds(layers);
    const [item] = layers.splice(idx, 1);
    const clamped = clampToAnchorRange(toIndex, bounds, layers.length + 1);
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
                    ? {
                        ...l,
                        visible: l.type === PAPER_ANCHOR_TYPE ? true : visible,
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
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? (() => {
                let paperCanonical: {
                  aspect: PaperAspect;
                  color: string;
                } | null = null;
                const layers = (m.layers ?? []).map((l) => {
                  if (l.id !== layerId) return l;
                  const mergedState = isPlainObject(l.state)
                    ? { ...(l.state as Record<string, unknown>), ...patch }
                    : { ...patch };
                  if (l.type === PAPER_ANCHOR_TYPE) {
                    const { state, canonical } =
                      sanitizePaperState(mergedState);
                    paperCanonical = canonical;
                    return { ...l, state } as typeof l;
                  }
                  return { ...l, state: mergedState } as typeof l;
                });
                return {
                  ...m,
                  layers,
                  paper: paperCanonical ? paperCanonical : m.paper,
                };
              })()
            : m,
        ),
      },
      dirty: true,
    });
  },
  applyLayerState: (layerId, updater) => {
    const cur = get().current;
    if (!cur) return;
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) return;
    const layers = [...(map.layers ?? [])];
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const target = layers[idx];
    const baseState: Record<string, unknown> = isPlainObject(target.state)
      ? structuredClone
        ? structuredClone(target.state as Record<string, unknown>)
        : { ...(target.state as Record<string, unknown>) }
      : {};
    try {
      updater(baseState);
    } catch (e) {
      // swallow updater errors to avoid corrupting state
      console.warn("applyLayerState updater threw", e);
      return;
    }
    let paperCanonical: { aspect: PaperAspect; color: string } | null = null;
    if (target.type === PAPER_ANCHOR_TYPE) {
      const { state, canonical } = sanitizePaperState(baseState);
      paperCanonical = canonical;
      layers[idx] = { ...target, state } as typeof target;
    } else {
      layers[idx] = { ...target, state: baseState } as typeof target;
    }
    set({
      current: {
        ...cur,
        maps: cur.maps.map((m) =>
          m === map
            ? {
                ...m,
                layers,
                paper: paperCanonical ? paperCanonical : m.paper,
              }
            : m,
        ),
      },
      dirty: true,
    });
  },
  _batchUpdateLayerState: <T>(
    layerId: string,
    updater: (draft: T) => void | T,
  ): BatchResult<T> => {
    const cur = get().current;
    if (!cur) {
      return { success: false, error: "No active campaign" };
    }
    const map = cur.maps.find((m) => m.id === cur.activeMapId);
    if (!map) {
      return { success: false, error: "No active map" };
    }
    const layers = [...(map.layers ?? [])];
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx < 0) {
      return { success: false, error: `Layer not found: ${layerId}` };
    }

    const target = layers[idx];
    const startTime = performance.now();
    const startMemory = getMemoryUsage();

    // Memory pressure detection at start
    if (startMemory && startMemory > 500) {
      // 500MB threshold for available heap
      return {
        success: false,
        error: `Memory pressure detected: ${startMemory.toFixed(2)}MB heap usage. Operation aborted to prevent out-of-memory`,
        metrics: {
          executionTimeMs: 0,
          memoryUsageMB: startMemory,
          operationCount: 0,
        },
      };
    }

    try {
      // Create state snapshot for rollback
      const originalState = target.state as T;
      let patchCount = 0;
      let aborted = false;

      // Create timeout controller for early abort
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        aborted = true;
        timeoutController.abort();
      }, DEFAULT_BATCH_LIMITS.timeoutMs);

      // Use Immer to produce new state with optional patch tracking
      const newState = produce(
        originalState,
        (draft) => {
          // Check for timeout periodically during updater execution
          if (aborted) {
            throw new Error(
              `Operation aborted due to timeout (>${DEFAULT_BATCH_LIMITS.timeoutMs}ms)`,
            );
          }

          // Check memory pressure during operation
          const currentMemory = getMemoryUsage();
          if (
            currentMemory &&
            currentMemory > DEFAULT_BATCH_LIMITS.maxMemoryMB * 10
          ) {
            // 10x safety factor
            throw new Error(
              `Memory pressure during operation: ${currentMemory.toFixed(2)}MB heap usage`,
            );
          }

          const result = updater(draft as T);
          // If updater returns a value, use it (allows both mutation and return patterns)
          return result !== undefined ? result : draft;
        },
        (patches) => {
          // Clear timeout as soon as patches are available
          clearTimeout(timeoutId);

          // Patches tracking is optional
          if (patches) {
            patchCount = patches.length;
          }
        },
      );

      // Clear timeout in case patches callback didn't execute
      clearTimeout(timeoutId);

      // Calculate metrics
      const elapsed = performance.now() - startTime;
      const endMemory = getMemoryUsage();
      const memoryDelta = endMemory
        ? endMemory - (startMemory ?? 0)
        : undefined;

      // Final timeout check (in case updater completed but took too long)
      if (elapsed > DEFAULT_BATCH_LIMITS.timeoutMs) {
        return {
          success: false,
          error: `Batch operation timed out after ${elapsed.toFixed(2)}ms (limit: ${DEFAULT_BATCH_LIMITS.timeoutMs}ms)`,
          metrics: {
            executionTimeMs: elapsed,
            memoryUsageMB: memoryDelta,
            operationCount: 1,
            immerPatches: patchCount,
          },
        };
      }

      // Final memory check
      if (memoryDelta && memoryDelta > DEFAULT_BATCH_LIMITS.maxMemoryMB) {
        return {
          success: false,
          error: `Batch operation exceeded memory limit: ${memoryDelta.toFixed(2)}MB > ${DEFAULT_BATCH_LIMITS.maxMemoryMB}MB`,
          metrics: {
            executionTimeMs: elapsed,
            memoryUsageMB: memoryDelta,
            operationCount: 1,
            immerPatches: patchCount,
          },
        };
      }

      // Final memory pressure check
      if (endMemory && endMemory > 800) {
        // 800MB critical threshold
        return {
          success: false,
          error: `Critical memory pressure after operation: ${endMemory.toFixed(2)}MB heap usage. Operation succeeded but system may be unstable`,
          metrics: {
            executionTimeMs: elapsed,
            memoryUsageMB: memoryDelta,
            operationCount: 1,
            immerPatches: patchCount,
          },
        };
      }

      // Handle paper layer special case
      let paperCanonical: { aspect: PaperAspect; color: string } | null = null;
      let finalState: unknown = newState;

      if (target.type === PAPER_ANCHOR_TYPE) {
        const { state, canonical } = sanitizePaperState(newState);
        paperCanonical = canonical;
        finalState = state;
      }

      // Update layer with new state
      layers[idx] = { ...target, state: finalState } as typeof target;

      // Single store update per batch operation
      set({
        current: {
          ...cur,
          maps: cur.maps.map((m) =>
            m === map
              ? {
                  ...m,
                  layers,
                  paper: paperCanonical ? paperCanonical : m.paper,
                }
              : m,
          ),
        },
        dirty: true,
      });

      const metrics: BatchMetrics = {
        executionTimeMs: elapsed,
        memoryUsageMB: memoryDelta,
        operationCount: 1,
        immerPatches: patchCount,
      };

      return { success: true, result: newState, metrics };
    } catch (error) {
      const elapsed = performance.now() - startTime;
      const endMemory = getMemoryUsage();
      const memoryDelta = endMemory
        ? endMemory - (startMemory ?? 0)
        : undefined;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Determine error type for better handling
      let errorType = "UNKNOWN_ERROR";
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("aborted")
      ) {
        errorType = "TIMEOUT";
      } else if (
        errorMessage.includes("memory") ||
        errorMessage.includes("Memory")
      ) {
        errorType = "MEMORY_PRESSURE";
      }

      console.warn(
        `_batchUpdateLayerState failed [${errorType}]:`,
        errorMessage,
      );
      return {
        success: false,
        error: errorMessage,
        metrics: {
          executionTimeMs: elapsed,
          memoryUsageMB: memoryDelta,
          operationCount: 0,
        },
      };
    }
  },
  applyLayerStateBatch: <T = Record<string, unknown>>(
    layerId: string,
    updater: (draft: T) => void | T,
    validator?: (state: unknown) => state is T,
  ): BatchResult<T> => {
    // Pre-validate layer state if validator provided
    if (validator) {
      const cur = get().current;
      if (!cur) {
        return { success: false, error: "No active campaign" };
      }
      const map = cur.maps.find((m) => m.id === cur.activeMapId);
      if (!map) {
        return { success: false, error: "No active map" };
      }
      const layer = (map.layers ?? []).find((l) => l.id === layerId);
      if (!layer) {
        return { success: false, error: `Layer not found: ${layerId}` };
      }

      if (!validator(layer.state)) {
        return {
          success: false,
          error: `Layer state does not match expected type for layer ${layerId}`,
        };
      }
    }

    return get()._batchUpdateLayerState(layerId, updater);
  },
  applyCellsDelta: <TCell = FreeformCell>(
    layerId: string,
    delta: CellsDelta<TCell>,
    cellValidator?: (cell: unknown) => cell is TCell,
  ): BatchResult<void> => {
    // Pre-validate delta structure with type safety
    if (!isValidCellsDelta(delta, cellValidator)) {
      return {
        success: false,
        error:
          "Invalid CellsDelta structure. Must contain valid 'set' and/or 'delete' operations",
      };
    }

    // Validate batch operation
    const validation = validateBatchOperation(delta);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Calculate operation count for metrics
    const operationCount =
      Object.keys(delta.set || {}).length + (delta.delete?.length || 0);

    // Use _batchUpdateLayerState to apply cell delta with proper typing
    const result = get()._batchUpdateLayerState<{
      cells: Record<string, TCell>;
    }>(layerId, (draft) => {
      // Ensure cells object exists
      if (!draft.cells) {
        draft.cells = {};
      }

      // Apply deletions first to avoid conflicts
      if (delta.delete) {
        for (const key of delta.delete) {
          delete draft.cells[key];
        }
      }

      // Apply additions/updates
      if (delta.set) {
        // Validate each cell if validator provided
        if (cellValidator) {
          for (const [key, cell] of Object.entries(delta.set)) {
            if (!cellValidator(cell)) {
              throw new Error(
                `Invalid cell data for key "${key}": failed validation`,
              );
            }
            draft.cells[key] = cell;
          }
        } else {
          Object.assign(draft.cells, delta.set);
        }
      }
    });

    if (result.success) {
      // Update metrics with correct operation count
      const metrics = result.metrics
        ? {
            ...result.metrics,
            operationCount,
          }
        : undefined;
      return { success: true, metrics };
    } else {
      return { success: false, error: result.error, metrics: result.metrics };
    }
  },
}));

/**
 * Get current memory usage in MB if available
 */
function getMemoryUsage(): number | undefined {
  if (typeof performance !== "undefined" && "memory" in performance) {
    const memory = (performance as { memory?: { usedJSHeapSize?: number } })
      .memory;
    if (memory && typeof memory.usedJSHeapSize === "number") {
      return memory.usedJSHeapSize / (1024 * 1024); // Convert bytes to MB
    }
  }
  return undefined;
}

/**
 * Wrapper function for performance measurement of batch operations
 */
export function withBatchMetrics<T>(
  operation: () => BatchResult<T>,
  operationName?: string,
): BatchResult<T> {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();

  try {
    const result = operation();
    const elapsed = performance.now() - startTime;
    const endMemory = getMemoryUsage();
    const memoryDelta =
      endMemory && startMemory ? endMemory - startMemory : undefined;

    // Enhance metrics with wrapper measurements
    const enhancedMetrics: BatchMetrics = {
      ...result.metrics,
      executionTimeMs: elapsed,
      memoryUsageMB: memoryDelta ?? result.metrics?.memoryUsageMB,
      operationCount: result.metrics?.operationCount ?? 0,
    };

    if (operationName && debugEnabled()) {
      console.log(`[BatchMetrics] ${operationName}:`, enhancedMetrics);
    }

    return {
      ...result,
      metrics: enhancedMetrics,
    };
  } catch (error) {
    const elapsed = performance.now() - startTime;
    const endMemory = getMemoryUsage();
    const memoryDelta =
      endMemory && startMemory ? endMemory - startMemory : undefined;

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      metrics: {
        executionTimeMs: elapsed,
        memoryUsageMB: memoryDelta,
        operationCount: 0,
      },
    };
  }
}

export type { CampaignStoreState, BatchLimits };
export { validateBatchOperation };
