import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppToolbar from "@/components/layout/app-toolbar";
import { loadPlugin } from "@/plugin/loader";
import { hexNoiseManifest, hexNoiseModule } from "@/plugin/builtin/hex-noise";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";

describe("AppToolbar capability gating (integration)", () => {
  beforeEach(() => {
    useCampaignStore.setState({ current: null });
    useSelectionStore.setState({
      selection: { kind: "none" } as { kind: "none" },
    });
  });

  it("disables Hex Noise without active map and enables after creating map", async () => {
    await loadPlugin(hexNoiseManifest, hexNoiseModule);
    render(
      <TooltipProvider>
        <AppToolbar />
      </TooltipProvider>,
    );

    const btn = await screen.findByRole("button", { name: "Hex Noise" });
    expect(btn).toBeDisabled();

    // Create project and map
    const p = useCampaignStore.getState().createEmpty({ name: "P" });
    useCampaignStore.getState().setActive(p);
    const mapId = useCampaignStore.getState().addMap({ name: "M" })!;
    useCampaignStore.getState().selectMap(mapId);

    await waitFor(() => expect(btn).toBeEnabled());
  });
});
