import { describe, it, expect, beforeEach } from "vitest";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import type { LayerType } from "@/layers/types";

describe("Plugin capability tokens — freeform/tools", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } });
    registerLayerType(FreeformType as unknown as LayerType);
  });

  it("activeLayerIs:freeform enables only when a freeform layer is selected", () => {
    const project = useCampaignStore.getState().createEmpty({ name: "Test" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map A" })!;
    useCampaignStore.getState().selectMap(mapId);
    // insert freeform
    const id = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("freeform")!;
    // not selected yet
    let res = resolvePreconditions(["activeLayerIs:freeform"]);
    expect(res.enabled).toBe(false);
    useSelectionStore.getState().selectLayer(id);
    res = resolvePreconditions(["activeLayerIs:freeform"]);
    expect(res.enabled).toBe(true);
    // select map => disabled
    useSelectionStore.getState().selectMap(mapId);
    res = resolvePreconditions(["activeLayerIs:freeform"]);
    expect(res.enabled).toBe(false);
  });

  it("gridVisible reflects hexgrid visibility", () => {
    useCampaignStore.getState().createEmpty({ name: "A" });
    const mapId = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(mapId);
    let res = resolvePreconditions(["gridVisible"]);
    expect(res.enabled).toBe(true);
    // hide grid
    const cur = useCampaignStore.getState().current!;
    const grid = cur.maps[0].layers!.find((l) => l.type === "hexgrid")!;
    useCampaignStore.getState().setLayerVisibility(grid.id, false);
    res = resolvePreconditions(["gridVisible"]);
    expect(res.enabled).toBe(false);
  });
});
