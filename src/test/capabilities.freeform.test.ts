import { describe, it, expect, beforeEach } from "vitest";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { registerLayerType } from "@/layers/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import type { LayerType } from "@/layers/types";

describe("Plugin capability tokens — freeform/tools", () => {
  beforeEach(() => {
    useProjectStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } });
    registerLayerType(FreeformType as unknown as LayerType);
  });

  it("activeLayerIs:freeform enables only when a freeform layer is selected", () => {
    const project = useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map A" })!;
    useProjectStore.getState().selectMap(mapId);
    // insert freeform
    const id = useProjectStore
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
    useProjectStore.getState().createEmpty({ name: "A" });
    const mapId = useProjectStore.getState().addMap({ name: "M" })!;
    useProjectStore.getState().selectMap(mapId);
    let res = resolvePreconditions(["gridVisible"]);
    expect(res.enabled).toBe(true);
    // hide grid
    const cur = useProjectStore.getState().current!;
    const grid = cur.maps[0].layers!.find((l) => l.type === "hexgrid")!;
    useProjectStore.getState().setLayerVisibility(grid.id, false);
    res = resolvePreconditions(["gridVisible"]);
    expect(res.enabled).toBe(false);
  });
});
