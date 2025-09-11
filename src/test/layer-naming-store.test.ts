import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";

describe("Layer naming (store numbering)", () => {
  beforeEach(() => {
    // reset store state
    useCampaignStore.setState({ current: null });
  });

  it("numbers new layers per type with zero padding", () => {
    registerLayerType(HexNoiseType);
    const p = useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().setActive(p);
    const mapId = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(mapId);

    const id1 = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise");
    const id2 = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise");
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();

    const cur = useCampaignStore.getState().current!;
    const map = cur.maps.find((m) => m.id === mapId)!;
    const n1 = (map.layers ?? []).find((l) => l.id === id1)!.name;
    const n2 = (map.layers ?? []).find((l) => l.id === id2)!.name;
    expect(n1).toBe("Hex Noise 01");
    expect(n2).toBe("Hex Noise 02");
  });

  it("duplicate keeps Copy suffix and does not renumber others", () => {
    registerLayerType(HexNoiseType);
    const p = useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().setActive(p);
    const mapId = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(mapId);
    useCampaignStore.getState().insertLayerBeforeTopAnchor("hexnoise")!;
    const id2 = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // 02
    const dupId = useCampaignStore.getState().duplicateLayer(id2)!;
    const cur = useCampaignStore.getState().current!;
    const map = cur.maps.find((m) => m.id === mapId)!;
    const dupName = (map.layers ?? []).find((l) => l.id === dupId)!.name;
    expect(dupName).toBe("Hex Noise 02 Copy");
  });

  it("renaming to a custom name frees the numeric label for reuse", () => {
    registerLayerType(HexNoiseType);
    const p = useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().setActive(p);
    const mapId = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(mapId);
    const first = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // 01
    useCampaignStore.getState().renameLayer(first, "Noise Alps");
    const id2 = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // should be 01 again
    const name2 = useCampaignStore
      .getState()
      .current!.maps.find((m) => m.id === mapId)!
      .layers!.find((l) => l.id === id2)!.name;
    expect(name2).toBe("Hex Noise 01");
  });
});
