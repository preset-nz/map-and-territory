import type { LayerInstance } from "@/layers/types";

export interface AnchorBounds {
  bottom: number; // index of bottom anchor (paper) or -1 when absent
  top: number; // index of top anchor (hexgrid) or layers.length when absent
  min: number; // lowest index a non-anchor layer may occupy
  max: number; // highest index a non-anchor layer may occupy
}

export const PAPER_ANCHOR_TYPE = "paper";
export const HEXGRID_ANCHOR_TYPE = "hexgrid";

export function isAnchorLayer(
  layer: LayerInstance | null | undefined,
): boolean {
  if (!layer) return false;
  return layer.type === PAPER_ANCHOR_TYPE || layer.type === HEXGRID_ANCHOR_TYPE;
}

export function getAnchorBounds(layers: LayerInstance[]): AnchorBounds {
  const paperIdx = layers.findIndex((l) => l.type === PAPER_ANCHOR_TYPE);
  const hexIdx = layers.findIndex((l) => l.type === HEXGRID_ANCHOR_TYPE);
  const bottom = paperIdx;
  const top = hexIdx >= 0 ? hexIdx : layers.length;
  const min = bottom >= 0 ? bottom + 1 : 0;
  const max = hexIdx >= 0 ? Math.max(min, hexIdx - 1) : layers.length - 1;
  return { bottom, top, min, max };
}

export function clampToAnchorRange(
  index: number,
  bounds: AnchorBounds,
  total: number,
): number {
  const clampedMin = Math.max(0, bounds.min);
  const clampedMax = Math.max(clampedMin, Math.min(bounds.max, total - 1));
  return Math.max(clampedMin, Math.min(index, clampedMax));
}
