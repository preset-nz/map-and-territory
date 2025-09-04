import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";

describe("Layer naming (store numbering)", () => {
  beforeEach(() => {
    // reset store state
    useProjectStore.setState({ current: null });
  });

  it("numbers new layers per type with zero padding", () => {
    registerLayerType(HexNoiseType);
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().setActive(p);
    const mapId = useProjectStore.getState().addMap({ name: "M" })!;
    useProjectStore.getState().selectMap(mapId);

    const id1 = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise");
    const id2 = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise");
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();

    const cur = useProjectStore.getState().current!;
    const map = cur.maps.find((m) => m.id === mapId)!;
    const n1 = (map.layers ?? []).find((l) => l.id === id1)!.name;
    const n2 = (map.layers ?? []).find((l) => l.id === id2)!.name;
    expect(n1).toBe("Hex Noise 01");
    expect(n2).toBe("Hex Noise 02");
  });

  it("duplicate keeps Copy suffix and does not renumber others", () => {
    registerLayerType(HexNoiseType);
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().setActive(p);
    const mapId = useProjectStore.getState().addMap({ name: "M" })!;
    useProjectStore.getState().selectMap(mapId);
    useProjectStore.getState().insertLayerBeforeTopAnchor("hexnoise")!;
    const id2 = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // 02
    const dupId = useProjectStore.getState().duplicateLayer(id2)!;
    const cur = useProjectStore.getState().current!;
    const map = cur.maps.find((m) => m.id === mapId)!;
    const dupName = (map.layers ?? []).find((l) => l.id === dupId)!.name;
    expect(dupName).toBe("Hex Noise 02 Copy");
  });

  it("renaming to a custom name frees the numeric label for reuse", () => {
    registerLayerType(HexNoiseType);
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    useProjectStore.getState().setActive(p);
    const mapId = useProjectStore.getState().addMap({ name: "M" })!;
    useProjectStore.getState().selectMap(mapId);
    const first = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // 01
    useProjectStore.getState().renameLayer(first, "Noise Alps");
    const id2 = useProjectStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!; // should be 01 again
    const name2 = useProjectStore
      .getState()
      .current!.maps.find((m) => m.id === mapId)!
      .layers!.find((l) => l.id === id2)!.name;
    expect(name2).toBe("Hex Noise 01");
  });
});
