import { getLayerType, registerLayerType } from "@/layers/registry";
import type { LayerAdapter, LayerInstance, LayerType } from "@/layers/types";
import type { MapPalette } from "@/palettes/types";
import { useCampaignStore } from "@/stores/campaign";

// MIME for v1 exports
export const CAMPAIGN_MIME_V1 =
  "application/vnd.map-territory+json;version=1" as const;

// ————————————————————————————————————————————————————————————————————————
// Persisted Types (v1)
// Keep strictly serializable; prefer primitives and plain objects.
// ————————————————————————————————————————————————————————————————————————

export interface CampaignFileV1 {
  version: 1;
  campaign: CampaignPersistV1;
}

export interface CampaignPersistV1 {
  id: string;
  name: string;
  description?: string;
  // Palette/Setting may be undefined; when defined, loaders should respect them
  settingId?: string;
  palette?: MapPalette;
  maps: MapPersistV1[];
  activeMapId: string | null;
}

export interface MapPersistV1 {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
  paper: { aspect: "square" | "4:3" | "16:10"; color: string };
  // Optional map-level overrides
  settingId?: string;
  palette?: MapPalette;
  layers: LayerPersistV1[]; // order is top-to-bottom
}

export interface LayerMetaV1 {
  pluginId?: string;
  typeId: string;
  typeVersion?: number;
}

export interface LayerPersistV1<State = unknown> {
  id: string;
  name?: string;
  visible: boolean;
  locked?: boolean;
  meta: LayerMetaV1;
  state: State;
}

// ————————————————————————————————————————————————————————————————————————
// Save (serialize)
// ————————————————————————————————————————————————————————————————————————

/**
 * serializeCampaignV1 — Pure function: Campaign → file JSON (v1)
 */
export function serializeCampaignV1(
  campaign: ReturnType<typeof useCampaignStore.getState>["current"],
): CampaignFileV1 {
  if (!campaign) throw new Error("No campaign to serialize");
  const maps: MapPersistV1[] = (campaign.maps ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    visible: m.visible,
    paper: { ...m.paper },
    settingId: m.settingId,
    palette: m.palette,
    layers: (m.layers ?? []).map((l) => toPersistedLayer(l)),
  }));
  return {
    version: 1,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      settingId: campaign.settingId,
      palette: campaign.palette,
      maps,
      activeMapId: campaign.activeMapId ?? null,
    },
  } as const;
}

function toPersistedLayer(layer: LayerInstance): LayerPersistV1 {
  const def = getLayerType(layer.type);
  const adapter = def?.adapter as LayerAdapter<unknown> | undefined;
  const raw = adapter?.serialize
    ? adapter.serialize(layer.state as unknown)
    : (layer.state as unknown);
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    meta: { typeId: layer.type },
    state: raw,
  };
}

/** Convenience: serialize currently active campaign from store */
export function saveActiveCampaignV1(): CampaignFileV1 | null {
  const cur = useCampaignStore.getState().current;
  return cur ? serializeCampaignV1(cur) : null;
}

// ————————————————————————————————————————————————————————————————————————
// Load (deserialize)
// ————————————————————————————————————————————————————————————————————————

/**
 * Minimal shape guard — defensive checks without bringing in a schema lib.
 */
export function isCampaignFileV1(x: unknown): x is CampaignFileV1 {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return r.version === 1 && !!r.campaign && typeof r.campaign === "object";
}

/**
 * deserializeCampaignV1 — Pure function: file JSON (v1) → Campaign domain object.
 * Note: does not call setActive; callers can push into the store.
 */
export function deserializeCampaignV1(
  file: unknown,
): import("@/stores/campaign").Campaign {
  if (!isCampaignFileV1(file)) throw new Error("Unsupported or invalid file");
  const src = file.campaign;
  // Shallow copy while translating layers
  const maps = (src.maps ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    visible: m.visible,
    paper: { ...m.paper },
    settingId: m.settingId,
    palette: m.palette,
    layers: (m.layers ?? []).map(fromPersistedLayer),
  }));
  return {
    id: src.id,
    version: 1,
    name: src.name,
    description: src.description ?? "",
    settingId: src.settingId,
    palette: src.palette,
    maps,
    activeMapId: src.activeMapId ?? null,
  };
}

function fromPersistedLayer(lp: LayerPersistV1): LayerInstance<unknown> {
  const def = getLayerType(lp.meta.typeId);
  if (!def) {
    // Lazily register a placeholder to keep render pipeline stable
    ensurePlaceholderLayerType(lp.meta.typeId);
  }
  const known = getLayerType(lp.meta.typeId);
  const adapter = known?.adapter as LayerAdapter<unknown> | undefined;
  const state = adapter?.deserialize ? adapter.deserialize(lp.state) : lp.state;
  return {
    id: lp.id,
    type: lp.meta.typeId,
    name: lp.name,
    visible: lp.visible,
    locked: lp.locked,
    state,
  };
}

// ————————————————————————————————————————————————————————————————————————
// Placeholder adapter for unknown layer types
// ————————————————————————————————————————————————————————————————————————

const placeholderCache = new Set<string>();

function ensurePlaceholderLayerType(originalTypeId: string) {
  if (placeholderCache.has(originalTypeId)) return;
  const id = originalTypeId; // preserve id so existing renderers won’t choke
  const PlaceholderAdapter: LayerAdapter<Record<string, unknown>> = {
    title: `Unknown: ${originalTypeId}`,
    getInvalidationKey: (state) => `unknown:${Object.keys(state || {}).length}`,
    drawMain: (ctx) => {
      // minimal visual – optional
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(8, 8, 96, 24);
      ctx.restore();
    },
  };
  const PlaceholderType: LayerType<Record<string, unknown>> = {
    id,
    title: `Unknown (${originalTypeId})`,
    defaultState: {},
    adapter: PlaceholderAdapter,
    policy: { canDelete: true, canDuplicate: false },
  };
  registerLayerType(PlaceholderType);
  placeholderCache.add(originalTypeId);
}

// ————————————————————————————————————————————————————————————————————————
// Store helpers
// ————————————————————————————————————————————————————————————————————————

/** Load JSON into store and normalize anchors. */
export function loadIntoStoreV1(file: unknown) {
  const campaign = deserializeCampaignV1(file);
  // Let the store normalize anchors (paper/grid) and set active map
  useCampaignStore.getState().setActive(campaign);
  useCampaignStore.getState().setDirty(false);
}
