import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import { registerCoreLayerTypes } from "@/test/test-helpers";

describe("Project Store Maps", () => {
  beforeEach(() => {
    // Register core layer types for tests
    registerCoreLayerTypes();
    useProjectStore.setState({ current: null });
  });

  it("adds and selects a new map", () => {
    useProjectStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useProjectStore
      .getState()
      .addMap({ name: "Map 1", description: "" });
    expect(useProjectStore.getState().current?.maps.length).toBe(1);
    expect(useProjectStore.getState().current?.activeMapId).toBe(id);
    const m = useProjectStore.getState().current!.maps[0];
    expect(m.paper).toBeTruthy();
    expect(m.paper.aspect).toBe("16:10");
    expect(m.paper.color).toBeTypeOf("string");
  });

  it("seeds base layers on map add and enforces policies", () => {
    useProjectStore.getState().createEmpty({ name: "Camp", description: "" });
    useProjectStore.getState().addMap({ name: "Map 2", description: "" });
    const current = useProjectStore.getState().current!;
    const map = current.maps.find((m) => m.name === "Map 2")!;
    expect(map.layers && map.layers.length).toBeGreaterThanOrEqual(2);
    const paper = map.layers!.find((l) => l.type === "paper")!;
    const hex = map.layers!.find((l) => l.type === "hexgrid")!;
    // cannot duplicate base layers
    const dupPaper = useProjectStore.getState().duplicateLayer(paper.id);
    expect(dupPaper).toBeNull();
    // cannot delete base layers
    useProjectStore.getState().removeLayer(hex.id);
    const stillHex = useProjectStore
      .getState()
      .current!.maps.find((m) => m.name === "Map 2")!
      .layers!.find((l) => l.type === "hexgrid");
    expect(stillHex).toBeTruthy();
  });

  it("renames and deletes a map", () => {
    useProjectStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useProjectStore
      .getState()
      .addMap({ name: "Old", description: "" });
    useProjectStore.getState().renameMap(id, "New Name");
    expect(useProjectStore.getState().current?.maps[0].name).toBe("New Name");
    useProjectStore.getState().deleteMap(id);
    expect(useProjectStore.getState().current?.maps.length).toBe(0);
  });

  it("toggles map visibility", () => {
    useProjectStore.getState().createEmpty({ name: "Camp", description: "" });
    const id = useProjectStore
      .getState()
      .addMap({ name: "Visible Map", description: "" });
    expect(useProjectStore.getState().current?.maps[0].visible).toBe(true);
    useProjectStore.getState().setMapVisibility(id, false);
    expect(useProjectStore.getState().current?.maps[0].visible).toBe(false);
  });
});
