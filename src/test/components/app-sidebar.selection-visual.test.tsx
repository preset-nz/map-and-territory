import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";

describe("AppSidebar selection visibility", () => {
  it("keeps active map highlighted when a layer is selected", async () => {
    useCampaignStore.getState().createEmpty({ name: "Test" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map A" })!;
    useCampaignStore.getState().selectMap(mapId);
    const layerId = useCampaignStore.getState().addLayer("hexnoise", "Noise")!;

    render(<AppSidebar />);

    // Select the layer
    useSelectionStore.getState().selectLayer(layerId);

    // Map row should still be highlighted (data-selected="true")
    const mapRow = screen.getByText("Map A").closest("[data-selected]");
    expect(mapRow).toHaveAttribute("data-selected", "true");
  });
});
