import React from "react";
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import CanvasViewport from "@/components/map/canvas-viewport";
import { useCampaignStore } from "@/stores/campaign";
import { registerLayerType, unregisterLayerType } from "@/layers/registry";
import type { LayerType, LayerAdapter } from "@/layers/types";

// Minimal canvas 2D context mock so fallback renderer can initialize
beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = () => ({
    setTransform: () => {},
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    translate: () => {},
    closePath: () => {},
    stroke: () => {},
    strokeRect: () => {},
    lineTo: () => {},
    moveTo: () => {},
  });
});

describe("CanvasViewport invalidation contract", () => {
  it("throws when a layer type lacks required getInvalidationKey", () => {
    // Define a misconfigured adapter (cast to bypass TS enforcement for the test)
    const badAdapter = { title: "Bad Layer" } as unknown as LayerAdapter<
      Record<string, unknown>
    >;
    const BadType: LayerType<Record<string, unknown>> = {
      id: "bad",
      title: "Bad",
      defaultState: {},
      adapter: badAdapter as any,
    };
    registerLayerType(BadType);

    // Seed store with a project containing the bad layer
    const project = {
      id: "p1",
      version: 1,
      name: "Test",
      maps: [
        {
          id: "m1",
          name: "Map",
          description: "",
          visible: true,
          paper: { aspect: "16:10" as const, color: "#ffffff" },
          layers: [
            {
              id: "l1",
              type: "paper",
              name: "Paper",
              visible: true,
              state: { color: "#ffffff", aspect: "16:10" },
            },
            { id: "l2", type: "bad", name: "Bad", visible: true, state: {} },
            {
              id: "l9",
              type: "hexgrid",
              name: "Hex Grid",
              visible: true,
              state: {
                size: 24,
                orientation: "pointy",
                color: "#000000",
                alpha: 1,
                lineWidth: 1,
              },
            },
          ],
        },
      ],
      activeMapId: "m1",
    } as const;
    useCampaignStore.getState().setActive(project as unknown as typeof project);

    expect(() => render(<CanvasViewport />)).toThrow(
      /missing required getInvalidationKey/i,
    );

    unregisterLayerType("bad");
  });
});
