import { describe, it, expect, beforeEach } from "vitest";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";

describe("Layering Model Foundation — Store Semantics", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null });
  });

  it("normalizes anchors at extremes on map creation", () => {
    useCampaignStore.getState().createEmpty({ name: "Test" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map 1" });
    expect(mapId).toBeTruthy();
    const layers = useCampaignStore.getState().current!.maps[0].layers!;
    expect(layers[0].type).toBe("paper");
    expect(layers[layers.length - 1].type).toBe("hexgrid");
  });

  it("insertLayerBeforeTopAnchor inserts directly before grid", () => {
    registerLayerType(HexNoiseType);
    useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().addMap({ name: "Map 1" });
    const before = useCampaignStore.getState().current!.maps[0].layers!;
    const gridIdx = before.findIndex((l) => l.type === "hexgrid");
    const id = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "Hex Noise");
    expect(id).toBeTruthy();
    const after = useCampaignStore.getState().current!.maps[0].layers!;
    const idx = after.findIndex((l) => l.id === id);
    expect(idx).toBe(gridIdx); // directly before grid
  });

  it("insertLayerAbove inserts at sourceIndex + 1", () => {
    registerLayerType(HexNoiseType);
    useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().addMap({ name: "Map 1" });
    const idA = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "A")!;
    const layersA = useCampaignStore.getState().current!.maps[0].layers!;
    const idxA = layersA.findIndex((l) => l.id === idA);
    const idB = useCampaignStore
      .getState()
      .insertLayerAbove(idA, "hexnoise", "B")!;
    const layersB = useCampaignStore.getState().current!.maps[0].layers!;
    const idxB = layersB.findIndex((l) => l.id === idB);
    expect(idxB).toBe(idxA + 1);
  });

  it("duplicateLayer inserts copy above source", () => {
    registerLayerType(HexNoiseType);
    useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().addMap({ name: "Map 1" });
    const id = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "X")!;
    const before = useCampaignStore.getState().current!.maps[0].layers!;
    const idx = before.findIndex((l) => l.id === id);
    const copyId = useCampaignStore.getState().duplicateLayer(id)!;
    const after = useCampaignStore.getState().current!.maps[0].layers!;
    const copyIdx = after.findIndex((l) => l.id === copyId);
    expect(copyIdx).toBe(idx + 1);
  });

  it("moveLayer guards anchors and clamps within anchors", () => {
    registerLayerType(HexNoiseType);
    useCampaignStore.getState().createEmpty({ name: "Test" });
    useCampaignStore.getState().addMap({ name: "Map 1" });
    const a = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "A")!;
    const b = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "B")!;
    let layers = useCampaignStore.getState().current!.maps[0].layers!;
    const paperId = layers[0].id; // anchor
    const gridId = layers[layers.length - 1].id; // anchor
    // Attempt to move anchors — should no-op
    useCampaignStore.getState().moveLayer(paperId, 3);
    useCampaignStore.getState().moveLayer(gridId, 1);
    layers = useCampaignStore.getState().current!.maps[0].layers!;
    expect(layers[0].id).toBe(paperId);
    expect(layers[layers.length - 1].id).toBe(gridId);
    // Attempt to move B below paper — should clamp above paper
    const idxPaper = layers.findIndex((l) => l.type === "paper");
    useCampaignStore.getState().moveLayer(b, 0);
    layers = useCampaignStore.getState().current!.maps[0].layers!;
    const idxB = layers.findIndex((l) => l.id === b);
    expect(idxB).toBe(idxPaper + 1);
    // Attempt to move A above grid — should clamp below grid
    const idxGrid = layers.findIndex((l) => l.type === "hexgrid");
    useCampaignStore.getState().moveLayer(a, layers.length + 10);
    layers = useCampaignStore.getState().current!.maps[0].layers!;
    const idxA = layers.findIndex((l) => l.id === a);
    expect(idxA).toBe(idxGrid - 1);
  });
});
