import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType } from "@/layers/registry";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { useSelectionStore } from "@/stores/selection";

describe("AppSidebar DnD ordering (UI reflects store order)", () => {
  beforeAll(() => {
    registerLayerType(HexNoiseType);
  });

  it("renders layers in reversed UI order and updates when store order changes", async () => {
    // Seed project with a map and two non-anchor layers
    useCampaignStore.getState().createEmpty({ name: "Test Campaign" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map A" })!;
    useCampaignStore.getState().selectMap(mapId);
    // Insert two hex-noise layers (inserted just below grid per policy)
    const id1 = useCampaignStore.getState().addLayer("hexnoise", "Noise 1")!;
    const id2 = useCampaignStore.getState().addLayer("hexnoise", "Noise 2")!;

    render(<AppSidebar />);

    // UI shows top of render at top (reverse of array), so last added should appear first
    const firstRow = await screen.findByText("Noise 2");
    const secondRow = await screen.findByText("Noise 1");
    expect(firstRow).toBeInTheDocument();
    expect(secondRow).toBeInTheDocument();

    // Select Noise 2 and expect selected attribute on its row
    useSelectionStore.getState().selectLayer(id2);
    const row = firstRow.closest("[data-selected]");
    expect(row).toHaveAttribute("data-selected", "true");

    // Move Noise 1 above Noise 2 in array order via store and expect UI to flip accordingly
    const layers = useCampaignStore.getState().current!.maps[0].layers!;
    const idx1 = layers.findIndex((l) => l.id === id1);
    useCampaignStore.getState().moveLayer(id1, idx1 + 1);

    // Now UI top should still be the element with higher array index (Noise 1)
    expect(await screen.findByText("Noise 1")).toBeInTheDocument();
    expect(await screen.findByText("Noise 2")).toBeInTheDocument();
  });
});
