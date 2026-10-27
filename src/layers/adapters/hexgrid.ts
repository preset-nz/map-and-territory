import {
  type Edge,
  type EdgeWobble,
  edgeHash,
  fitDashPattern,
  type HexOrientation,
  type LineStyle,
  misregistrationShift,
  noiseAlongEdge,
  noiseAtPoint,
  noisyWidth,
  ownedEdgeKeys,
  ownedEdges,
  seedBase,
  traceInkEdge,
  widthField,
  widthStep,
} from '@/layers/hex-lines';
import { hexTiles } from '@/layers/hex-utils';
import { applyInkMask, getInkMask, type InkParams, makeSurface } from '@/layers/ink-noise';
import type { LayerAdapter, RenderEnv } from '@/layers/types';

export type { HexOrientation };

export interface HexgridState {
  size: number; // hex radius in px
  orientation: HexOrientation; // 'pointy' | 'flat'
  color: string; // stroke color when not inheriting from palette
  usePaletteColor: boolean; // inherit color from active palette setting when true
  alpha?: number;
  lineWidth?: number; // paper px
  hairline?: boolean; // the thinnest line the output draws: one device px, lineWidth ignored
  lineStyle?: LineStyle; // missing is solid
  dashLength?: number; // in line widths
  gapLength?: number; // in line widths, the visible space between marks
  seed?: string; // picks the misregistration direction and the corner jitter
  misregistration?: number; // px the whole grid sits off the paper
  cornerJitter?: number; // px, the most a corner moves
  widthNoise?: number; // 0..1, how much the line swells and thins (solid lines only)
  noiseScale?: number; // px, the length of one swell
  joinCorners?: boolean; // edges meeting at a corner share its width; missing is on
  inkNoise?: number; // 0..1, how uneven the ink density is (all line styles)
  inkScale?: number; // px, the size of one patch of ink
  origin?: { x: number; y: number }; // future use
}

// (removed unused pattern cache helper)

/** Edge lengths are grouped to this many px to share a dash pattern when corners are jittered. */
const LENGTH_BIN = 0.25;

let scratchCanvas: OffscreenCanvas | null = null;

/**
 * The ink-noise scratch, one per worker, as big as the canvas being drawn on: it takes ctx's
 * transform, so the paper lands on the same device pixels in it as in ctx.
 */
function scratchFor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  deviceScale: number,
): OffscreenCanvas | null {
  const cw = ctx.canvas?.width || Math.ceil(w * deviceScale);
  const ch = ctx.canvas?.height || Math.ceil(h * deviceScale);
  if (!scratchCanvas) scratchCanvas = makeSurface(cw, ch);
  else if (scratchCanvas.width !== cw || scratchCanvas.height !== ch) {
    scratchCanvas.width = cw;
    scratchCanvas.height = ch;
  }
  return scratchCanvas;
}

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
    const deviceScale = env.deviceScale || 1;

    const inkNoise = Math.min(1, Math.max(0, state.inkNoise ?? 0));
    // 1 px is 1 paper px on every display (epic 07 story 6). A hairline is one device pixel at
    // any zoom, fit and pixel ratio; its dashes keep the rhythm of a 1 paper px line.
    const hairline = state.hairline === true;
    const lineW = hairline ? 1 / deviceScale : Math.max(1, lineWidth ?? 1);
    const dashWidth = hairline ? 1 : lineW;
    const styleCtx = (c: CanvasRenderingContext2D, alpha: number) => {
      c.globalAlpha = alpha;
      c.strokeStyle = stroke;
      c.lineWidth = lineW;
    };

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
    const dash = state.dashLength ?? 4;
    const gap = state.gapLength ?? 2;
    const misregistration = Math.max(0, state.misregistration ?? 0);
    const jitter = Math.max(0, state.cornerJitter ?? 0);
    const seed = state.seed ?? 'grid';
    const wobble: EdgeWobble | undefined =
      misregistration > 0 || jitter > 0
        ? {
            origin: tilingConfig.center,
            base: seedBase(seed),
            jitter,
            shift: misregistrationShift(seed, misregistration),
          }
        : undefined;

    // a hairline has no width to vary
    const widthNoise = hairline ? 0 : Math.min(1, Math.max(0, state.widthNoise ?? 0));

    // The lines, in whatever ctx they go to: the layer's own, or the ink noise's scratch.
    const paintInk = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = 'round';
      if (style === 'solid' && widthNoise > 0) {
        // Width varies along each edge, which a stroke can't do: each edge is a filled outline,
        // all in one path and one fill (nonzero, so overlaps at corners paint once).
        const scale = Math.max(1, state.noiseScale ?? 24);
        const join = state.joinCorners ?? true;
        const field = widthField(
          seed,
          widthNoise,
          scale,
          join,
          wobble?.shift ?? { x: 0, y: 0 },
          tilingConfig.center,
        );
        const step = widthStep(scale);
        const w0 = ctx.lineWidth;
        ctx.fillStyle = stroke;
        ctx.beginPath();
        for (const tile of hexTiles(tilingConfig)) {
          const edges = ownedEdges(tile.center, r, orientation, wobble);
          const keys = join
            ? undefined
            : ownedEdgeKeys(tile.center, r, orientation, tilingConfig.center);
          edges.forEach(([a, b], i) => {
            const offset = keys ? edgeHash(field.edgeBase, keys[i]![0], keys[i]![1]) * 200 : 0;
            traceInkEdge(ctx, a, b, step, (s, x, y) =>
              noisyWidth(
                w0,
                widthNoise,
                join ? noiseAtPoint(field, x, y) : noiseAlongEdge(field, s, offset),
              ),
            );
          });
        }
        ctx.fill();
      } else if (style === 'solid' || jitter === 0) {
        // all edges are r long (the shift moves them together), so one pattern fits them all
        const plan = fitDashPattern(style, dash, gap, dashWidth, r);
        ctx.setLineDash(plan.pattern);
        ctx.lineDashOffset = plan.offset;
        ctx.beginPath();
        for (const tile of hexTiles(tilingConfig)) {
          for (const [a, b] of ownedEdges(tile.center, r, orientation, wobble)) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
        ctx.stroke();
      } else {
        // Jittered edges differ in length and each needs its own fit, but a canvas stroke has
        // one dash pattern. Group edges by length to LENGTH_BIN and fit the group's length: a
        // few dozen strokes, not one per edge, and a corner is at most half a bin off the
        // pattern's end.
        const groups = new Map<number, Edge[]>();
        for (const tile of hexTiles(tilingConfig)) {
          for (const e of ownedEdges(tile.center, r, orientation, wobble)) {
            const bin = Math.round(Math.hypot(e[1].x - e[0].x, e[1].y - e[0].y) / LENGTH_BIN);
            const list = groups.get(bin);
            if (list) list.push(e);
            else groups.set(bin, [e]);
          }
        }
        for (const [bin, edges] of groups) {
          const plan = fitDashPattern(style, dash, gap, dashWidth, bin * LENGTH_BIN);
          ctx.setLineDash(plan.pattern);
          ctx.lineDashOffset = plan.offset;
          ctx.beginPath();
          for (const [a, b] of edges) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
          ctx.stroke();
        }
      }
    };

    const inkScale = Math.max(1, state.inkScale ?? 40);
    const ink: InkParams = {
      seed,
      amount: inkNoise,
      scale: inkScale,
      size: { w, h },
      origin: tilingConfig.center,
      shift: wobble?.shift ?? { x: 0, y: 0 },
    };
    // Ink noise: draw the lines whole into a scratch canvas, take the density mask's alpha
    // off them there, then lay the scratch on ctx once, at the layer's alpha. No canvas
    // (a test runner) or no 2D context: draw the lines plain.
    const mask = inkNoise > 0 ? getInkMask(ink) : null;
    const scratch = mask ? scratchFor(ctx, w, h, deviceScale) : null;
    const sctx = scratch?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
    if (mask && scratch && sctx) {
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, scratch.width, scratch.height);
      // the same transform as ctx's: the camera, the fit and the pixel ratio
      if (ctx.getTransform) sctx.setTransform(ctx.getTransform());
      else sctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      sctx.save();
      styleCtx(sctx, 1);
      paintInk(sctx);
      sctx.restore();
      applyInkMask(sctx, mask, ink);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // the scratch is in device pixels
      ctx.globalAlpha = a;
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }
    ctx.save();
    styleCtx(ctx, a);
    paintInk(ctx);
    ctx.restore();
  },
  getInvalidationKey(state) {
    const s = state;
    const colorKey = s.usePaletteColor ? 'palette' : s.color;
    return `hexgrid:${s.size}:${s.orientation}:${colorKey}:${s.alpha ?? 1}:${s.lineWidth ?? 1}:${s.hairline ?? false}:${s.lineStyle ?? 'solid'}:${s.dashLength ?? 4}:${s.gapLength ?? 2}:${s.seed ?? 'grid'}:${s.misregistration ?? 0}:${s.cornerJitter ?? 0}:${s.widthNoise ?? 0}:${s.noiseScale ?? 24}:${s.joinCorners ?? true}:${s.inkNoise ?? 0}:${s.inkScale ?? 40}`;
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
    hairline: false,
    lineStyle: 'solid',
    dashLength: 4,
    gapLength: 2,
    seed: 'grid',
    misregistration: 0,
    cornerJitter: 0,
    widthNoise: 0,
    noiseScale: 24,
    joinCorners: true,
    inkNoise: 0,
    inkScale: 40,
    origin: { x: 0, y: 0 },
  },
  adapter: HexgridAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Properties schema is registered by the hexgrid plugin during activation.
