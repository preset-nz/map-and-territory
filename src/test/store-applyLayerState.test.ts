import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";

describe("applyLayerState seam", () => {
  beforeEach(() => {
    // Fresh campaign with one map
    const s = useCampaignStore.getState();
    s.setActive(null);
    s.createEmpty({ name: "Test Campaign" });
    s.addMap({ name: "Map 01" });
    // Ensure freeform layer type registered
    registerLayerType(FreeformType);
  });

  afterEach(() => {
    useCampaignStore.getState().setActive(null);
  });

  it("updates layer state via a single committed apply", () => {
    const s = useCampaignStore.getState();
    const layerId = s.addLayer("freeform");
    expect(layerId).toBeTruthy();

    useCampaignStore.getState().applyLayerState(layerId!, (draft) => {
      draft["cells"] = {
        ...(draft["cells"] as Record<string, unknown> | undefined),
        ["0,0"]: { color: "#abcdef" },
      };
      draft["opacity"] = 0.5 as unknown as Record<string, unknown>;
    });

    const cur = useCampaignStore.getState().current!;
    expect(useCampaignStore.getState().dirty).toBe(true);
    const map = cur.maps.find((m) => m.id === cur.activeMapId)!;
    const layer = (map.layers ?? []).find((l) => l.id === layerId)! as {
      state: Record<string, unknown>;
    };
    expect(layer.state.opacity).toBe(0.5);
    expect((layer.state.cells as Record<string, unknown>)["0,0"]).toBeTruthy();
  });
});
