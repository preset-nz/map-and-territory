import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import StatusBar from "@/components/layout/status-bar";
import { useProjectStore } from "@/stores/project";

describe("StatusBar setting reactivity", () => {
  it("updates setting label when campaign/map settingId changes and when active map switches", async () => {
    // Create empty campaign
    await act(async () => {
      useProjectStore.getState().createEmpty({ name: "Test" });
    });
    // Initially, no maps; default doom-forge
    render(React.createElement(StatusBar));
    expect(await screen.findByTestId("status-bar")).toBeTruthy();
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Doom Forge|doom-forge/i,
    );

    // Add a map and select it
    let mapId = "";
    await act(async () => {
      mapId = useProjectStore.getState().addMap({ name: "Map A" });
      const sel = await import("@/stores/selection");
      sel.useSelectionStore.getState().selectMap(mapId);
    });
    // setting should remain default until overridden
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Doom Forge|doom-forge/i,
    );

    // Set campaign-level setting
    await act(async () => {
      useProjectStore.getState().setCampaignSetting("space-opera");
    });
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Space Opera|space-opera/i,
    );

    // Override at map level
    await act(async () => {
      useProjectStore.getState().setMapSetting(mapId, "gloomy-garden");
    });
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Gloomy Garden|gloomy-garden/i,
    );

    // Add another map without override, switch active map → falls back to campaign (icy-realm)
    await act(async () => {
      const mapB = useProjectStore.getState().addMap({ name: "Map B" });
      const sel = await import("@/stores/selection");
      sel.useSelectionStore.getState().selectMap(mapB);
    });
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Space Opera|space-opera/i,
    );

    // Select campaign: should show campaign-level setting again
    await act(async () => {
      // use selection store to select campaign
      const mod = await import("@/stores/selection");
      mod.useSelectionStore.getState().selectCampaign();
    });
    expect(screen.getByText("Setting:").nextSibling?.textContent).toMatch(
      /Space Opera|space-opera/i,
    );
  });
});
