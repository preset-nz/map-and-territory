// Locations (epic 28, first slice): each place's marker on its hex and its name beside it, in
// the grid's ink, plain or over a glow or label of the paper's colour (`labelStyle`). The frame
// projection resolves numbers, the face, the ink and the paper; the adapter draws what it is
// given. Hidden places draw faint with a dashed ring (the window only, until player copies).
import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { toPoint } from '@/lib/hex/layout';
import type { Layout } from '@/lib/hex/types';
import { faceCaps, faceFont } from '@/render/faces';

export type LocationMarker = 'number' | 'dot' | 'none';
/** How a name sits on the map: plain ink, a glow of paper behind it, or on a paper label. */
export type LabelStyle = 'plain' | 'glow' | 'label';

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
}

export interface LocationsState {
  locations?: PlacedLocation[];
  showLabels?: boolean;
  labelStyle?: LabelStyle;
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
/** How faint a hidden place draws. */
export const HIDDEN_ALPHA = 0.45;

function layoutOf(env: RenderEnv): Layout {
  const size = Math.max(4, env.grid?.size ?? 16);
  const orientation = env.grid?.orientation === 'flat' ? 'flat' : 'pointy';
  return { size, orientation, origin: { x: env.size.w / 2, y: env.size.h / 2 } };
}

/**
 * A name in the layer's style: plain ink; over a glow of the paper's colour, laid down a few
 * times so it carries over dark ground; or on a paper label behind it.
 */
function styledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: LabelStyle,
  s: number,
  paper: string,
  ink: string,
) {
  if (style === 'label') {
    const w = ctx.measureText(text).width;
    const h = parseFloat(ctx.font) || s * NAME_SIZE;
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

export const LocationsAdapter: LayerAdapter<LocationsState> = {
  title: 'Locations',
  drawMain(ctx, state, env) {
    const layout = layoutOf(env);
    const s = layout.size;
    const ink = state.ink || '#000000';
    const paper = state.paper || '#ffffff';
    const face = state.face ?? 'condensed';
    const caps = faceCaps(face);
    for (const loc of state.locations ?? []) {
      const hex = loc.hexes[0];
      if (!hex) continue;
      const c = toPoint(hex, layout);
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
        const x = loc.marker === 'none' ? c.x : c.x + reach + s * 0.15;
        ctx.textAlign = loc.marker === 'none' ? 'center' : 'left';
        ctx.textBaseline = 'middle';
        const style = state.labelStyle ?? 'plain';
        ctx.font = faceFont(face, s * NAME_SIZE);
        const note = loc.note?.trim();
        const y = note ? c.y - s * NAME_SIZE * 0.4 : c.y;
        styledText(ctx, caps ? loc.name.toUpperCase() : loc.name, x, y, style, s, paper, ink);
        if (note) {
          ctx.font = faceFont(face, s * NOTE_SIZE);
          styledText(ctx, note, x, c.y + s * NAME_SIZE * 0.55, style, s, paper, ink);
        }
      }
      ctx.restore();
    }
  },
  getInvalidationKey(s) {
    return JSON.stringify([
      'locations',
      s.locations ?? [],
      s.showLabels !== false,
      s.labelStyle ?? 'plain',
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
