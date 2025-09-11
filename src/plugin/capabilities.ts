import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import type { CapabilityToken } from "./types";

export type CapabilityResult = { enabled: boolean; reason?: string };

export function resolvePreconditions(
  tokens: readonly CapabilityToken[] | undefined,
): CapabilityResult {
  if (!tokens || tokens.length === 0) return { enabled: true };
  for (const t of tokens) {
    const res = evaluateToken(t);
    if (!res.enabled) return res;
  }
  return { enabled: true };
}

function evaluateToken(token: CapabilityToken): CapabilityResult {
  switch (true) {
    case token === "hasActiveMap": {
      const has = !!useCampaignStore.getState().current?.activeMapId;
      return has
        ? { enabled: true }
        : { enabled: false, reason: "Requires an active map" };
    }
    case token === "gridVisible": {
      const cur = useCampaignStore.getState().current;
      const map = cur?.maps.find((m) => m.id === cur?.activeMapId);
      const grid = map?.layers?.find((l) => l.type === "hexgrid");
      return grid?.visible !== false
        ? { enabled: true }
        : { enabled: false, reason: "Grid must be visible" };
    }
    case token === "hasCampaign": {
      const has = !!useCampaignStore.getState().current;
      return has
        ? { enabled: true }
        : { enabled: false, reason: "Requires a campaign" };
    }
    case token === "hasActiveLayer": {
      const sel = useSelectionStore.getState().selection;
      return sel.kind === "layer"
        ? { enabled: true }
        : { enabled: false, reason: "Requires a selected layer" };
    }
    case token.startsWith("selectionIs:"): {
      const want = token.split(":", 2)[1] as
        | "campaign"
        | "map"
        | "layer"
        | undefined;
      const sel = useSelectionStore.getState().selection;
      return sel.kind === want
        ? { enabled: true }
        : { enabled: false, reason: `Requires ${want} selection` };
    }
    case token.startsWith("activeLayerIs:"): {
      const typeId = token.split(":", 2)[1] as string | undefined;
      const project = useCampaignStore.getState().current;
      const sel = useSelectionStore.getState().selection;
      if (!typeId) return { enabled: true };
      if (sel.kind !== "layer" || !project) {
        return { enabled: false, reason: `Select a ${typeId} layer` };
      }
      const map = project.maps.find((m) => m.id === project.activeMapId);
      const layer = map?.layers?.find((l) => l.id === sel.id);
      return layer?.type === typeId
        ? { enabled: true }
        : { enabled: false, reason: `Select a ${typeId} layer` };
    }
    // Future: canAddLayer:<typeId> using store policies
    default:
      return { enabled: true };
  }
}
