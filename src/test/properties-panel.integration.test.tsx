import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import PropertiesPanel from "@/components/layout/properties-panel";
import { HexgridType } from "@/layers/adapters/hexgrid";
import { PaperType } from "@/layers/adapters/paper";
import { registerLayerType } from "@/layers/registry";
import { campaignPluginModule } from "@/plugin/builtin/campaign";
import { freeformModule } from "@/plugin/builtin/freeform";
import { hexNoiseModule } from "@/plugin/builtin/hex-noise";
import { hexgridPluginModule } from "@/plugin/builtin/hexgrid";
import { mapPluginModule } from "@/plugin/builtin/map";
import { paperPluginModule } from "@/plugin/builtin/paper";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";

describe("PropertiesPanel Integration — campaign/map/layer", () => {
  beforeEach(async () => {
    useCampaignStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } as any });
    // Minimal layer registrations (anchor types)
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    // Activate built-in plugins to register schemas
    await campaignPluginModule.activate?.({} as any);
    await mapPluginModule.activate?.({} as any);
    await paperPluginModule.activate?.({} as any);
    await hexgridPluginModule.activate?.({} as any);
    await hexNoiseModule.activate?.({} as any);
    await freeformModule.activate?.({} as any);
  });

  it("renders campaign schema fields", () => {
    const c = useCampaignStore.getState().createEmpty({ name: "C" });
    useSelectionStore.getState().selectCampaign();
    render(<PropertiesPanel />);
    expect(screen.getByLabelText("Campaign Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Campaign Description")).toBeInTheDocument();
    // Setting select is present via label text
    expect(screen.getByText("Setting (Palette)")).toBeInTheDocument();
  });

  it("renders map schema fields", () => {
    useCampaignStore.getState().createEmpty({ name: "C" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map A" });
    useCampaignStore.getState().selectMap(mapId);
    useSelectionStore.getState().selectMap(mapId);
    render(<PropertiesPanel />);
    expect(screen.getByLabelText("Map Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Map Description")).toBeInTheDocument();
    expect(screen.getByText("Per‑map override")).toBeInTheDocument();
    expect(
      screen.getByText("Map Setting (when override on)"),
    ).toBeInTheDocument();
  });

  it("renders layer schema fields for hex-noise", () => {
    useCampaignStore.getState().createEmpty({ name: "C" });
    const mapId = useCampaignStore.getState().addMap({ name: "Map A" });
    useCampaignStore.getState().selectMap(mapId);
    // Insert hex-noise layer via store directly
    const layerId = useCampaignStore
      .getState()
      .insertLayerBeforeTopAnchor("hexnoise")!;
    useSelectionStore.getState().selectLayer(layerId);
    render(<PropertiesPanel />);
    // Mode and Terrain labels exist in schema
    expect(screen.getByText("Mode")).toBeInTheDocument();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
    expect(screen.getByLabelText("Seed")).toBeInTheDocument();
  });
});
