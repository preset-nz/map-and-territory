import {
  fitDashPattern,
  type HexOrientation,
  type LineStyle,
  ownedEdges,
} from '@/layers/hex-lines';
import { hexTiles } from '@/layers/hex-utils';
import type { LayerAdapter, RenderEnv } from '@/layers/types';

export type { HexOrientation };

export interface HexgridState {
  size: number; // hex radius in px
  orientation: HexOrientation; // 'pointy' | 'flat'
  color: string; // stroke color when not inheriting from palette
  usePaletteColor: boolean; // inherit color from active palette setting when true
  alpha?: number;
  lineWidth?: number;
  lineStyle?: LineStyle; // missing is solid
  dashLength?: number; // in line widths
  gapLength?: number; // in line widths, the visible space between marks
  origin?: { x: number; y: number }; // future use
}

// (removed unused pattern cache helper)

export const HexgridAdapter: LayerAdapter<HexgridState> = {
  title: 'Hex Grid',
  drawMain(ctx, state, env: RenderEnv) {
    const { w, h } = env.size;
    const { size, orientation, color, alpha, lineWidth, usePaletteColor } = state;
    const style = state.lineStyle ?? 'solid';
    const r = Math.max(4, size || 16);
    const paletteStroke = env.palette?.grid.line || '#000000';
    const stroke = usePaletteColor
      ? paletteStroke
      : color && color.length > 0
        ? color
        : paletteStroke;
    const a = alpha ?? 0.25;
    const dpr = env.pixelRatio || 1;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, lineWidth ?? 1) / dpr;

    const tilingConfig = {
      size: r,
      orientation,
      center: { x: w / 2, y: h / 2 },
      bounds: { w, h },
      padding: 2,
    };

    // Every edge once, as its own subpath, in one stroke: a dash pattern restarts at each
    // subpath, and a shared edge drawn from both sides would put two phases on top of each
    // other. Round caps close the corners that closed hex paths used to join.
    ctx.lineCap = 'round';
    const plan = fitDashPattern(
      style,
      state.dashLength ?? 4,
      state.gapLength ?? 2,
      ctx.lineWidth,
      r,
    );
    ctx.setLineDash(plan.pattern);
    ctx.lineDashOffset = plan.offset;

    ctx.beginPath();
    for (const tile of hexTiles(tilingConfig)) {
      for (const [a, b] of ownedEdges(tile.center, r, orientation)) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();

    ctx.restore();
  },
  getInvalidationKey(state) {
    const s = state;
    const colorKey = s.usePaletteColor ? 'palette' : s.color;
    return `hexgrid:${s.size}:${s.orientation}:${colorKey}:${s.alpha ?? 1}:${s.lineWidth ?? 1}:${s.lineStyle ?? 'solid'}:${s.dashLength ?? 4}:${s.gapLength ?? 2}`;
  },
};

export const HexgridType = {
  id: 'hexgrid',
  title: 'Hex Grid',
  defaultState: {
    size: 24,
    orientation: 'pointy',
    color: '#000000',
    usePaletteColor: true,
    alpha: 1,
    lineWidth: 1,
    lineStyle: 'solid',
    dashLength: 4,
    gapLength: 2,
    origin: { x: 0, y: 0 },
  },
  adapter: HexgridAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Properties schema is registered by the hexgrid plugin during activation.
