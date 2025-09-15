import { getCurrentCampaign, getSelection } from "./state";
import type { CapabilityToken } from "@/plugin/types";

export type CapabilityResult = { enabled: boolean; reason?: string };

export function resolvePreconditions(
  tokens: readonly CapabilityToken[] | undefined,
): CapabilityResult {
  if (!tokens || tokens.length === 0) return { enabled: true };
  for (const token of tokens) {
    const result = evaluateToken(token);
    if (!result.enabled) return result;
  }
  return { enabled: true };
}

function evaluateToken(token: CapabilityToken): CapabilityResult {
  const campaign = getCurrentCampaign();
  const selection = getSelection();

  switch (true) {
    case token === "hasActiveMap": {
      const has = !!campaign?.activeMapId;
      return has
        ? { enabled: true }
        : { enabled: false, reason: "Requires an active map" };
    }
    case token === "gridVisible": {
      const activeMap = campaign?.maps.find(
        (map) => map.id === campaign.activeMapId,
      );
      const grid = activeMap?.layers?.find((layer) => layer.type === "hexgrid");
      return grid?.visible !== false
        ? { enabled: true }
        : { enabled: false, reason: "Grid must be visible" };
    }
    case token === "hasCampaign": {
      const has = !!campaign;
      return has
        ? { enabled: true }
        : { enabled: false, reason: "Requires a campaign" };
    }
    case token === "hasActiveLayer": {
      return selection.kind === "layer"
        ? { enabled: true }
        : { enabled: false, reason: "Requires a selected layer" };
    }
    case token.startsWith("selectionIs:"): {
      const target = token.split(":", 2)[1] as
        | "campaign"
        | "map"
        | "layer"
        | undefined;
      return selection.kind === target
        ? { enabled: true }
        : { enabled: false, reason: `Requires ${target} selection` };
    }
    case token.startsWith("activeLayerIs:"): {
      const typeId = token.split(":", 2)[1] as string | undefined;
      if (!typeId) return { enabled: true };
      if (selection.kind !== "layer" || !campaign) {
        return { enabled: false, reason: `Select a ${typeId} layer` };
      }
      const activeMap = campaign.maps.find(
        (map) => map.id === campaign.activeMapId,
      );
      const layer = activeMap?.layers?.find((l) => l.id === selection.id);
      return layer?.type === typeId
        ? { enabled: true }
        : { enabled: false, reason: `Select a ${typeId} layer` };
    }
    default:
      return { enabled: true };
  }
}
