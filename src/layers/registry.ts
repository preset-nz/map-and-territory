import type { LayerType, LayerTypeId, LayerPolicy } from "./types";

const layerTypes = new Map<LayerTypeId, LayerType<unknown>>();

export function registerLayerType<T>(def: LayerType<T>) {
  layerTypes.set(def.id, def as LayerType<unknown>);
}

export function unregisterLayerType(id: LayerTypeId) {
  layerTypes.delete(id);
}

export function getLayerType<T = unknown>(
  id: LayerTypeId,
): LayerType<T> | undefined {
  return layerTypes.get(id) as LayerType<T> | undefined;
}

export function listLayerTypes(): LayerType[] {
  return Array.from(layerTypes.values());
}

export function getLayerPolicy(id: LayerTypeId): LayerPolicy {
  const t = layerTypes.get(id);
  return t?.policy ?? { canDelete: true, canDuplicate: true };
}
