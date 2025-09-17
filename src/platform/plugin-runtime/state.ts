import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { useLayoutStore } from "@/stores/layout";
import type { Campaign } from "@/stores/campaign";
import type { Selection } from "@/stores/selection";

/**
 * Narrow host-side seam exposing only the operations plugins need.
 * Keeps direct store access within platform code so plugin modules
 * cannot couple to Zustand internals.
 */

export function getCurrentCampaign(): Campaign | null {
  return useCampaignStore.getState().current;
}

export function getActiveMap() {
  const campaign = useCampaignStore.getState().current;
  if (!campaign?.activeMapId) return null;
  return campaign.maps.find((map) => map.id === campaign.activeMapId) ?? null;
}

export function insertLayerBeforeTopAnchor(
  layerType: string,
  name?: string,
): string | null {
  return useCampaignStore
    .getState()
    .insertLayerBeforeTopAnchor(layerType, name);
}

export function insertLayerAbove(
  targetLayerId: string,
  layerType: string,
  name?: string,
): string | null {
  return useCampaignStore
    .getState()
    .insertLayerAbove(targetLayerId, layerType, name);
}

export function updateLayerState(
  layerId: string,
  patch: Record<string, unknown>,
): void {
  useCampaignStore.getState().updateLayerState(layerId, patch);
}

export function applyLayerState(
  layerId: string,
  updater: (draft: Record<string, unknown>) => void,
): void {
  useCampaignStore.getState().applyLayerState(layerId, updater);
}

export function selectLayer(layerId: string): void {
  useSelectionStore.getState().selectLayer(layerId);
}

export function selectMap(mapId: string): void {
  useSelectionStore.getState().selectMap(mapId);
}

export function selectCampaign(): void {
  useSelectionStore.getState().selectCampaign();
}

export function getSelection(): Selection {
  return useSelectionStore.getState().selection;
}

export function setActiveTool(tool: string): void {
  useLayoutStore.getState().setActiveTool(tool);
}

export function setCampaignSetting(settingId: string | undefined): void {
  useCampaignStore.getState().setCampaignSetting(settingId);
}

export function setMapSetting(
  mapId: string,
  settingId: string | undefined,
): void {
  useCampaignStore.getState().setMapSetting(mapId, settingId);
}

export function addMap(params?: { name?: string; description?: string }) {
  return useCampaignStore.getState().addMap(params);
}

export function deleteMap(mapId: string): void {
  useCampaignStore.getState().deleteMap(mapId);
}

export function selectMapInStores(mapId: string): void {
  useCampaignStore.getState().selectMap(mapId);
  useSelectionStore.getState().selectMap(mapId);
}

export function createEmptyCampaign(params?: {
  name?: string;
  description?: string;
}) {
  return useCampaignStore.getState().createEmpty(params);
}

export function markCampaignDirty(dirty: boolean): void {
  useCampaignStore.getState().setDirty(dirty);
}

export function isCampaignDirty(): boolean {
  return !!useCampaignStore.getState().dirty;
}

/**
 * Batch API wrappers for plugin tool context
 */
export function applyCellsDelta<TCell = unknown>(
  layerId: string,
  delta: import("@/types/batch-operations").CellsDelta<TCell>,
): import("@/types/batch-operations").BatchResult<void> {
  return useCampaignStore.getState().applyCellsDelta(layerId, delta);
}

export function applyLayerStateBatch<T = Record<string, unknown>>(
  layerId: string,
  updater: (draft: T) => void,
): import("@/types/batch-operations").BatchResult<T> {
  return useCampaignStore.getState().applyLayerStateBatch(layerId, updater);
}
