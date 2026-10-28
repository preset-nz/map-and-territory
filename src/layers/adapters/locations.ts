// Locations (epic 28, first slice): each place's marker on its hex and its name beside it, in
// the grid's ink, plain or over a glow or label of the paper's colour (`labelStyle`). The frame
// projection resolves numbers, the face, the ink and the paper; the adapter draws what it is
// given. Hidden places draw faint with a dashed ring (the window only, until player copies).
// A place on more than one hex is an area: a tint over its hexes inside a dashed edge, with
// its marker and name at their middle. The projection draws the layer in two halves: the
// areas at its place in the stack, the markers and names after the grid, so no grid line or
// tint crosses a name.
import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { corners, fromPoint, toPoint } from '@/lib/hex/layout';
import type { Axial, Layout, Point } from '@/lib/hex/types';
import { faceCaps, faceFont } from '@/render/faces';

export type LocationMarker = 'number' | 'dot' | 'none';
/** How a name sits on the map: plain ink, outlined, a glow of paper behind it, or on a label. */
export type LabelStyle = 'plain' | 'outline' | 'glow' | 'label';

/** One place, as the projection gives it. */
export interface PlacedLocation {
  id: string;
  name: string;
  note?: string;
  hexes: { q: number; r: number }[];
  /** Its number in the map's key; null when its layer isn't numbered. */
  number: number | null;
  marker: LocationMarker;
  hidden: boolean;
  /** Its marker and name against the layer's size; 1 when unset. */
  size?: number;
}

export interface LocationsState {
  locations?: PlacedLocation[];
  /**
   * Which half to draw: the areas' tints and edges at the layer's place in the stack, or the
   * markers and names after the grid (the projection makes one scene layer of each). Unset
   * draws both.
   */
  pass?: 'areas' | 'marks';
  showLabels?: boolean;
  labelStyle?: LabelStyle;
  /** How big markers and names are against the hex; 1 when unset. */
  size?: number;
  /** `map` is resolved by the projection, so the adapter sees a face id. */
  face?: string;
  ink?: string;
  paper?: string;
}

/** Sizes as fractions of the hex size, so the markers grow with the grid. */
const RING = 0.42;
const DOT = 0.16;
const NUMBER_SIZE = 0.42;
const NAME_SIZE = 0.5;
const NOTE_SIZE = 0.36;
/** The glow's blur, and the label's padding, as fractions of the hex size. */
const GLOW = 0.35;
const PAD = 0.12;
/** The outline's width either side of a letter, as a fraction of the hex size. */
const OUTLINE = 0.12;
/** An area's tint, as a strength of the ink. */
export const AREA_TINT = 0.1;
/** How faint a hidden place draws. */
export const HIDDEN_ALPHA = 0.45;

function layoutOf(env: RenderEnv): Layout {
  const size = Math.max(4, env.grid?.size ?? 16);
  const orientation = env.grid?.orientation === 'flat' ? 'flat' : 'pointy';
  return { size, orientation, origin: { x: env.size.w / 2, y: env.size.h / 2 } };
}

/**
 * A name of `px` letters in the layer's style: plain ink; outlined in the paper's colour; over
 * a glow of it, laid down a few times so it carries over dark ground; or on a paper label.
 */
function styledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  style: LabelStyle,
  s: number,
  paper: string,
  ink: string,
) {
  if (style === 'outline') {
    ctx.strokeStyle = paper;
    ctx.lineWidth = s * OUTLINE * 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  } else if (style === 'label') {
    const w = ctx.measureText(text).width;
    // the letters' size, not the font string's leading weight, sets the label's height
    const h = px;
    const left = ctx.textAlign === 'center' ? x - w / 2 : x;
    ctx.fillStyle = paper;
    ctx.fillRect(left - s * PAD, y - h * 0.6, w + s * PAD * 2, h * 1.2);
  } else if (style === 'glow') {
    ctx.save();
    ctx.shadowColor = paper;
    ctx.shadowBlur = s * GLOW;
    ctx.fillStyle = paper;
    for (let i = 0; i < 3; i++) ctx.fillText(text, x, y);
    ctx.restore();
  }
  ctx.fillStyle = ink;
  ctx.fillText(text, x, y);
}

/**
 * The edges round the outside of `hexes`: each hex side whose neighbour across it is not in
 * the set, as corner pairs. The neighbour is the hex centre mirrored through the side's
 * middle, so it holds for pointy and flat grids alike.
 */
export function areaEdges(hexes: readonly Axial[], layout: Layout): [Point, Point][] {
  const inside = new Set(hexes.map((h) => `${h.q},${h.r}`));
  const edges: [Point, Point][] = [];
  for (const h of hexes) {
    const c = toPoint(h, layout);
    const pts = corners(c, layout);
    for (let i = 0; i < 6; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 6];
      const n = fromPoint({ x: a.x + b.x - c.x, y: a.y + b.y - c.y }, layout);
      if (!inside.has(`${n.q},${n.r}`)) edges.push([a, b]);
    }
  }
  return edges;
}

/** An area's tint over its hexes, in one path so the seams don't show, and its dashed edge. */
function drawArea(
  ctx: CanvasRenderingContext2D,
  hexes: readonly Axial[],
  layout: Layout,
  ink: string,
) {
  const s = layout.size;
  ctx.save();
  ctx.beginPath();
  for (const h of hexes) {
    const pts = corners(toPoint(h, layout), layout);
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
  }
  ctx.globalAlpha *= AREA_TINT;
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  for (const [a, b] of areaEdges(hexes, layout)) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.lineCap = 'round';
  ctx.setLineDash([s * 0.2, s * 0.14]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Where a place's marker sits: its hex, or the middle of an area's hexes. */
function anchorOf(hexes: readonly Axial[], layout: Layout): Point {
  const pts = hexes.map((h) => toPoint(h, layout));
  return {
    x: pts.reduce((t, p) => t + p.x, 0) / pts.length,
    y: pts.reduce((t, p) => t + p.y, 0) / pts.length,
  };
}

export const LocationsAdapter: LayerAdapter<LocationsState> = {
  title: 'Locations',
  drawMain(ctx, state, env) {
    const layout = layoutOf(env);
    const ink = state.ink || '#000000';
    const paper = state.paper || '#ffffff';
    const face = state.face ?? 'condensed';
    const caps = faceCaps(face);
    const places = (state.locations ?? []).filter((loc) => loc.hexes.length > 0);
    for (const loc of state.pass === 'marks' ? [] : places) {
      if (loc.hexes.length < 2) continue;
      ctx.save();
      if (loc.hidden) ctx.globalAlpha *= HIDDEN_ALPHA;
      drawArea(ctx, loc.hexes, layout, ink);
      ctx.restore();
    }
    for (const loc of state.pass === 'areas' ? [] : places) {
      const area = loc.hexes.length > 1;
      const c = anchorOf(loc.hexes, layout);
      // markers and names scale with the hex, the layer's size and the place's own
      const s = layout.size * (state.size ?? 1) * (loc.size ?? 1);
      ctx.save();
      if (loc.hidden) ctx.globalAlpha *= HIDDEN_ALPHA;
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      let reach = 0;
      if (loc.marker === 'number' && loc.number !== null) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, s * RING, 0, 2 * Math.PI);
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.lineWidth = Math.max(1, s * 0.06);
        if (loc.hidden) ctx.setLineDash([s * 0.12, s * 0.08]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ink;
        ctx.font = faceFont(face, s * NUMBER_SIZE);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(loc.number), c.x, c.y);
        reach = s * RING;
      } else if (loc.marker !== 'none') {
        ctx.beginPath();
        ctx.arc(c.x, c.y, s * DOT, 0, 2 * Math.PI);
        ctx.fill();
        if (loc.hidden) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, s * RING, 0, 2 * Math.PI);
          ctx.lineWidth = Math.max(1, s * 0.05);
          ctx.setLineDash([s * 0.12, s * 0.08]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        reach = s * (loc.hidden ? RING : DOT);
      }
      if (state.showLabels !== false && loc.name) {
        // a point's name sits beside its marker; an area's is centred, under the marker
        const beside = !area && loc.marker !== 'none';
        const x = beside ? c.x + reach + s * 0.15 : c.x;
        ctx.textAlign = beside ? 'left' : 'center';
        ctx.textBaseline = 'middle';
        const style = state.labelStyle ?? 'plain';
        ctx.font = faceFont(face, s * NAME_SIZE);
        const note = loc.note?.trim();
        const middle = area && reach > 0 ? c.y + reach + s * NAME_SIZE * 0.7 : c.y;
        const y = note ? middle - s * NAME_SIZE * 0.4 : middle;
        styledText(
          ctx,
          caps ? loc.name.toUpperCase() : loc.name,
          x,
          y,
          s * NAME_SIZE,
          style,
          s,
          paper,
          ink,
        );
        if (note) {
          ctx.font = faceFont(face, s * NOTE_SIZE);
          styledText(
            ctx,
            note,
            x,
            middle + s * NAME_SIZE * 0.55,
            s * NOTE_SIZE,
            style,
            s,
            paper,
            ink,
          );
        }
      }
      ctx.restore();
    }
  },
  getInvalidationKey(s) {
    return JSON.stringify([
      'locations',
      s.pass ?? '',
      s.locations ?? [],
      s.showLabels !== false,
      s.labelStyle ?? 'plain',
      s.size ?? 1,
      s.face ?? 'condensed',
      s.ink ?? '',
      s.paper ?? '',
    ]);
  },
};

export const LocationsType = {
  id: 'locations',
  title: 'Locations',
  defaultState: {
    locations: [],
    showLabels: true,
    labelStyle: 'plain',
    face: 'condensed',
  } satisfies LocationsState,
  adapter: LocationsAdapter,
} as const;
