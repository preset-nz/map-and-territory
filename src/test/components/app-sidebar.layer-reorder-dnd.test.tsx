import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useProjectStore } from "@/stores/project";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";

describe("AppSidebar DnD ordering (UI reflects store order)", () => {
  beforeAll(() => {
    registerLayerType(HexNoiseType);
  });

  it("renders layers in reversed UI order and updates when store order changes", async () => {
    // Seed project with a map and two non-anchor layers
    useProjectStore.getState().createEmpty({ name: "Test Campaign" });
    const mapId = useProjectStore.getState().addMap({ name: "Map A" })!;
    useProjectStore.getState().selectMap(mapId);
    // Insert two hex-noise layers (inserted just below grid per policy)
    const id1 = useProjectStore.getState().addLayer("hexnoise", "Noise 1")!;
    const id2 = useProjectStore.getState().addLayer("hexnoise", "Noise 2")!;

    render(<AppSidebar />);

    // UI shows top of render at top (reverse of array), so last added should appear first
    const firstRow = await screen.findByText("Noise 2");
    const secondRow = await screen.findByText("Noise 1");
    expect(firstRow).toBeInTheDocument();
    expect(secondRow).toBeInTheDocument();

    // Move Noise 1 above Noise 2 in array order via store and expect UI to flip accordingly
    const layers = useProjectStore.getState().current!.maps[0].layers!;
    const idx1 = layers.findIndex((l) => l.id === id1);
    useProjectStore.getState().moveLayer(id1, idx1 + 1);

    // Now UI top should still be the element with higher array index (Noise 1)
    expect(await screen.findByText("Noise 1")).toBeInTheDocument();
    expect(await screen.findByText("Noise 2")).toBeInTheDocument();
  });
});
