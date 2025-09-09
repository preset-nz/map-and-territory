import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";

describe("AppSidebar selection visibility", () => {
  it("keeps active map highlighted when a layer is selected", async () => {
    useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "Map A" })!;
    useProjectStore.getState().selectMap(mapId);
    const layerId = useProjectStore.getState().addLayer("hexnoise", "Noise")!;

    render(<AppSidebar />);

    // Select the layer
    useSelectionStore.getState().selectLayer(layerId);

    // Map row should still be highlighted (data-selected="true")
    const mapRow = screen.getByText("Map A").closest("[data-selected]");
    expect(mapRow).toHaveAttribute("data-selected", "true");
  });
});
