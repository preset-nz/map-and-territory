import React from "react";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import CanvasViewport from "@/components/map/canvas-viewport";
import { useCampaignStore } from "@/stores/campaign";
import { useLayoutStore } from "@/stores/layout";
import { registerCoreLayerTypes } from "@/test/test-helpers";

vi.mock("@/stores/selectors/scale", () => ({
  useActiveScaleConfig: () => ({
    enabled: false,
    placement: "overlay" as const,
    unitId: "kilometers",
    label: "Kilometers",
    shortLabel: "km",
    unitsPerHex: 5,
    useSettingUnits: true,
  }),
}));

// Minimal canvas 2D context mock so fallback renderer can initialize
beforeAll(() => {
  // Register core layer types for tests
  registerCoreLayerTypes();
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
  // Minimal ResizeObserver mock
  (globalThis as any).ResizeObserver = class {
    callback: any;
    constructor(cb: any) {
      this.callback = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // PointerEvent polyfill for jsdom
  if (!(globalThis as any).PointerEvent) {
    (globalThis as any).PointerEvent = class extends MouseEvent {
      constructor(type: string, params?: any) {
        super(type, params);
      }
    };
  }
});

function seedProject(orientation: "pointy" | "flat", visible = true) {
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
            id: "paper",
            type: "paper",
            name: "Paper",
            visible: true,
            state: { color: "#ffffff", aspect: "16:10" as const },
          },
          {
            id: "grid",
            type: "hexgrid",
            name: "Hex Grid",
            visible,
            state: {
              size: 24,
              orientation,
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
}

function mockCanvasRect(el: HTMLCanvasElement, w = 800, h = 600) {
  (el as any).getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    width: w,
    height: h,
    toJSON: () => {},
  });
}

// Compute paper center for 16:10, paddingX=0.05*cw, paddingY=12
function paperCenter(cw = 800, ch = 600) {
  const paddingX = Math.max(12, cw * 0.05);
  const paddingY = 12;
  const availW = cw - paddingX * 2;
  const availH = ch - paddingY * 2;
  const aw = 16,
    ah = 10;
  let paperW = availW;
  let paperH = (paperW * ah) / aw;
  if (paperH > availH) {
    paperH = availH;
    paperW = (paperH * aw) / ah;
  }
  const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
  const paperY = paddingY;
  return { x: paperX + paperW / 2, y: paperY + paperH / 2 };
}

describe("pointer → hex routing via AppAPI.hex", () => {
  it("updates store with {0,0} at paper center (pointy)", async () => {
    seedProject("pointy", true);
    const { container } = render(React.createElement(CanvasViewport));
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    mockCanvasRect(canvas, 800, 600);
    const c = paperCenter(800, 600);
    fireEvent.pointerMove(canvas, { clientX: c.x, clientY: c.y });
    const mp = useLayoutStore.getState().mousePosition;
    expect(mp.x).toBeCloseTo(c.x, 0);
    expect(mp.y).toBeCloseTo(c.y, 0);
    const hex = mp.hex;
    expect(hex).toEqual({ q: 0, r: 0 });
  });

  it("updates store with {0,0} at paper center (flat)", async () => {
    seedProject("flat", true);
    const { container } = render(React.createElement(CanvasViewport));
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    mockCanvasRect(canvas, 800, 600);
    const c = paperCenter(800, 600);
    fireEvent.pointerMove(canvas, { clientX: c.x, clientY: c.y });
    const mp = useLayoutStore.getState().mousePosition;
    expect(mp.x).toBeCloseTo(c.x, 0);
    expect(mp.y).toBeCloseTo(c.y, 0);
    const hex = mp.hex;
    expect(hex).toEqual({ q: 0, r: 0 });
  });

  it("sets hex to null when hexgrid is not visible", async () => {
    seedProject("pointy", false);
    const { container } = render(React.createElement(CanvasViewport));
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    mockCanvasRect(canvas, 800, 600);
    const c = paperCenter(800, 600);
    fireEvent.pointerMove(canvas, { clientX: c.x, clientY: c.y });
    const hex = useLayoutStore.getState().mousePosition.hex;
    expect(hex).toBeNull();
  });
});
