import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";

describe("Layering Model Foundation — Store Semantics", () => {
  beforeEach(() => {
    useProjectStore.setState({ current: null });
  });

  it("normalizes anchors at extremes on map creation", () => {
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map 1" });
    expect(mapId).toBeTruthy();
    const layers = useProjectStore.getState().current!.maps[0].layers!;
    expect(layers[0].type).toBe("paper");
    expect(layers[layers.length - 1].type).toBe("hexgrid");
  });

  it("insertLayerBeforeTopAnchor inserts directly before grid", () => {
    registerLayerType(HexNoiseType);
    useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().addMap({ name: "Map 1" });
    const before = useProjectStore.getState().current!.maps[0].layers!;
    const gridIdx = before.findIndex((l) => l.type === "hexgrid");
    const id = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "Hex Noise");
    expect(id).toBeTruthy();
    const after = useProjectStore.getState().current!.maps[0].layers!;
    const idx = after.findIndex((l) => l.id === id);
    expect(idx).toBe(gridIdx); // directly before grid
  });

  it("insertLayerAbove inserts at sourceIndex + 1", () => {
    registerLayerType(HexNoiseType);
    useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().addMap({ name: "Map 1" });
    const idA = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "A")!;
    const layersA = useProjectStore.getState().current!.maps[0].layers!;
    const idxA = layersA.findIndex((l) => l.id === idA);
    const idB = useProjectStore
      .getState()
      .insertLayerAbove(idA, "hexnoise", "B")!;
    const layersB = useProjectStore.getState().current!.maps[0].layers!;
    const idxB = layersB.findIndex((l) => l.id === idB);
    expect(idxB).toBe(idxA + 1);
  });

  it("duplicateLayer inserts copy above source", () => {
    registerLayerType(HexNoiseType);
    useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().addMap({ name: "Map 1" });
    const id = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "X")!;
    const before = useProjectStore.getState().current!.maps[0].layers!;
    const idx = before.findIndex((l) => l.id === id);
    const copyId = useProjectStore.getState().duplicateLayer(id)!;
    const after = useProjectStore.getState().current!.maps[0].layers!;
    const copyIdx = after.findIndex((l) => l.id === copyId);
    expect(copyIdx).toBe(idx + 1);
  });

  it("moveLayer guards anchors and clamps within anchors", () => {
    registerLayerType(HexNoiseType);
    useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().addMap({ name: "Map 1" });
    const a = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "A")!;
    const b = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise", "B")!;
    let layers = useProjectStore.getState().current!.maps[0].layers!;
    const paperId = layers[0].id; // anchor
    const gridId = layers[layers.length - 1].id; // anchor
    // Attempt to move anchors — should no-op
    useProjectStore.getState().moveLayer(paperId, 3);
    useProjectStore.getState().moveLayer(gridId, 1);
    layers = useProjectStore.getState().current!.maps[0].layers!;
    expect(layers[0].id).toBe(paperId);
    expect(layers[layers.length - 1].id).toBe(gridId);
    // Attempt to move B below paper — should clamp above paper
    const idxPaper = layers.findIndex((l) => l.type === "paper");
    useProjectStore.getState().moveLayer(b, 0);
    layers = useProjectStore.getState().current!.maps[0].layers!;
    const idxB = layers.findIndex((l) => l.id === b);
    expect(idxB).toBe(idxPaper + 1);
    // Attempt to move A above grid — should clamp below grid
    const idxGrid = layers.findIndex((l) => l.type === "hexgrid");
    useProjectStore.getState().moveLayer(a, layers.length + 10);
    layers = useProjectStore.getState().current!.maps[0].layers!;
    const idxA = layers.findIndex((l) => l.id === a);
    expect(idxA).toBe(idxGrid - 1);
  });
});
