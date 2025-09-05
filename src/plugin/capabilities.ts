import { useProjectStore } from "@/stores/project";
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
      const has = !!useProjectStore.getState().current?.activeMapId;
      return has
        ? { enabled: true }
        : { enabled: false, reason: "Requires an active map" };
    }
    case token === "hasProject" || token === "hasCampaign": {
      const has = !!useProjectStore.getState().current;
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
    // Future: canAddLayer:<typeId> using store policies
    default:
      return { enabled: true };
  }
}
