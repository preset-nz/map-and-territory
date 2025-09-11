import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PropertiesPanel from "@/components/layout/properties-panel";
import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";

describe("PropertiesPanel — disabledWhen", () => {
  beforeEach(() => {
    // reset stores
    useCampaignStore.setState({ current: null });
    useSelectionStore.setState({ selection: { kind: "none" } as any });
  });

  it("disables a field when condition matches (map override off)", () => {
    // Register a simple map schema with checkbox + dependent select
    registerPropertySchema("map", {
      groups: [
        {
          id: "m",
          title: "Map",
          rows: [{ kind: "text", id: "name", path: "name", label: "Title" }],
        },
        {
          id: "adv",
          title: "Advanced",
          rows: [
            {
              kind: "checkbox",
              id: "overrideEnabled",
              label: "Per‑map override",
              path: "overrideEnabled",
            },
            {
              kind: "select",
              id: "settingId",
              label: "Map Setting (when override on)",
              path: "settingId",
              disabledWhen: { path: "overrideEnabled", equals: false },
              options: [
                { value: "", label: "— Select Terrain —" },
                { value: "x", label: "X" },
              ],
            },
          ],
        },
      ],
    });

    const p = useCampaignStore.getState().createEmpty({ name: "Test" });
    const mapId = useCampaignStore.getState().addMap({ name: "A" });
    useCampaignStore.getState().selectMap(mapId);
    useSelectionStore.getState().selectMap(mapId);

    // By default, overrideEnabled is false (no map.settingId) → dependent select disabled
    render(<PropertiesPanel />);
    const label = screen.getByText("Map Setting (when override on)");
    const group = label.closest("div")?.parentElement; // SelectField wrapper
    expect(group?.className).toMatch(/opacity-50/);
    expect(group?.className).toMatch(/pointer-events-none/);

    unregisterPropertySchema("map");
  });
});
