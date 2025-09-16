import type { LayerAdapter, RenderEnv } from "@/layers/types";
import { hexPath, hexTiles, createHexLayout } from "@/layers/hex-utils";

export type HexOrientation = "pointy" | "flat";

export interface HexgridState {
  size: number; // hex radius in px
  orientation: HexOrientation; // 'pointy' | 'flat'
  color: string; // stroke color
  alpha?: number;
  lineWidth?: number;
  origin?: { x: number; y: number }; // future use
}

// (removed unused pattern cache helper)

export const HexgridAdapter: LayerAdapter<HexgridState> = {
  title: "Hex Grid",
  drawMain(ctx, state, env: RenderEnv) {
    const { w, h } = env.size;
    const { size, orientation, color, alpha, lineWidth } = state;
    const r = Math.max(4, size || 16);
    const stroke =
      color && color !== "#000000"
        ? color
        : env.palette?.grid.line || "#000000";
    const a = alpha ?? 0.25;
    const dpr = env.pixelRatio || 1;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, lineWidth ?? 1) / dpr;

    // Use shared hex utilities for tiling and drawing
    const layout = createHexLayout(r, orientation);
    const tilingConfig = {
      size: r,
      orientation,
      center: { x: w / 2, y: h / 2 },
      bounds: { w, h },
      padding: 2,
    };

    for (const tile of hexTiles(tilingConfig)) {
      hexPath(ctx, tile.center, layout);
      ctx.stroke();
    }

    ctx.restore();
  },
  getInvalidationKey(state) {
    const s = state;
    return `hexgrid:${s.size}:${s.orientation}:${s.color}:${s.alpha ?? 1}:${s.lineWidth ?? 1}`;
  },
};

export const HexgridType = {
  id: "hexgrid",
  title: "Hex Grid",
  defaultState: {
    size: 24,
    orientation: "pointy",
    color: "#000000",
    alpha: 1,
    lineWidth: 1,
    origin: { x: 0, y: 0 },
  },
  adapter: HexgridAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Properties schema is registered by the hexgrid plugin during activation.
