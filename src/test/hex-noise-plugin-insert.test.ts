import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { loadPlugin } from "@/plugin/loader";
import { executeCommand } from "@/lib/commands";
import { hexNoiseManifest, hexNoiseModule } from "@/plugin/builtin/hex-noise";

describe("Hex Noise plugin insertion rules", () => {
  beforeEach(() => {
    // reset stores
    useProjectStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } });
  });

  it("inserts just below hexgrid when a map is selected", async () => {
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map 1" })!;
    useProjectStore.getState().selectMap(mapId);
    useSelectionStore.getState().selectMap(mapId);
    await loadPlugin(hexNoiseManifest, hexNoiseModule);
    const before = useProjectStore.getState().current!.maps[0].layers!;
    const hexIdxBefore = before.findIndex((l) => l.type === "hexgrid");
    await executeCommand("layer.hexnoise.add");
    const after = useProjectStore.getState().current!.maps[0].layers!;
    const newIdx = after.findIndex((l) => l.type === "hexnoise");
    expect(newIdx).toBe(hexIdxBefore); // directly before hexgrid
  });

  it("inserts just above selected layer when a layer is selected", async () => {
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map 1" })!;
    useProjectStore.getState().selectMap(mapId);
    // Add a dummy noise layer to select
    await loadPlugin(hexNoiseManifest, hexNoiseModule);
    await executeCommand("layer.hexnoise.add");
    const layers = useProjectStore.getState().current!.maps[0].layers!;
    const target = layers.find((l) => l.type === "hexnoise")!;
    const beforeIdx = layers.findIndex((l) => l.id === target.id);
    useSelectionStore.getState().selectLayer(target.id);
    await executeCommand("layer.hexnoise.add");
    const after = useProjectStore.getState().current!.maps[0].layers!;
    const newNoise = after.find(
      (l) => l.type === "hexnoise" && l.id !== target.id,
    )!;
    const newIdx = after.findIndex((l) => l.id === newNoise.id);
    expect(newIdx).toBe(beforeIdx + 1); // inserted above (higher index) the selected layer
  });

  it("when grid is selected, falls back to insert before top anchor", async () => {
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map 1" })!;
    useProjectStore.getState().selectMap(mapId);
    await loadPlugin(hexNoiseManifest, hexNoiseModule);
    const layers = useProjectStore.getState().current!.maps[0].layers!;
    const grid = layers.find((l) => l.type === "hexgrid")!;
    const hexIdx = layers.findIndex((l) => l.id === grid.id);
    useSelectionStore.getState().selectLayer(grid.id);
    await executeCommand("layer.hexnoise.add");
    const after = useProjectStore.getState().current!.maps[0].layers!;
    const noiseIdx = after.findIndex((l) => l.type === "hexnoise");
    expect(noiseIdx).toBe(hexIdx); // directly before grid
  });
});
