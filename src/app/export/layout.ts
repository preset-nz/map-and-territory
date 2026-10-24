import type { PageOrientation, PageSize } from '@/app/scene/campaign-page';
import { type PaperAspect, resolveAspectRatio } from '@/render/geometry';

export type { PageOrientation, PageSize };

/** Print resolution used for export unless a caller says otherwise. */
export const DEFAULT_DPI = 300;

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;

/** Portrait page sizes in mm, width then height. */
const PAGE_MM: Record<PageSize, { w: number; h: number }> = {
  a5: { w: 148, h: 210 },
  a4: { w: 210, h: 297 },
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageLayoutInput {
  size: PageSize;
  orientation: PageOrientation;
  /** Margin on all four sides, in mm. */
  marginMm: number;
  /** The map's width over its height. */
  aspect: number;
  dpi?: number;
}

export interface PageLayout {
  pageMm: { w: number; h: number };
  pagePx: { w: number; h: number };
  mapMm: Rect;
  mapPx: Rect;
  dpi: number;
}

/** The paper kind's aspect choice as width over height. */
export function paperAspectRatio(aspect: PaperAspect): number {
  const { aw, ah } = resolveAspectRatio(aspect);
  return aw / ah;
}

/** Millimetres to PDF points (1/72 in), not rounded. */
export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * POINTS_PER_INCH;
}

/** Millimetres to pixels at `dpi`, rounded to a whole pixel. */
export function mmToPx(mm: number, dpi: number = DEFAULT_DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

/**
 * Places the map on the page. The map is as wide as the page inside the margins and sits at the
 * top margin; if that is taller than the page inside the margins, it fits the height and is
 * centred across. A margin too large for the page leaves a zero-size map at the centre.
 *
 * Pixels: the page size is `mmToPx` of its mm size. The map's pixel rect rounds its edges
 * (left, top, right, bottom), then takes the size as right minus left, so rounding never pushes
 * the rect past the page. The size can differ from `mmToPx(width)` by one pixel.
 */
export function layoutPage({
  size,
  orientation,
  marginMm,
  aspect,
  dpi = DEFAULT_DPI,
}: PageLayoutInput): PageLayout {
  const portrait = PAGE_MM[size];
  const pageMm = orientation === 'landscape' ? { w: portrait.h, h: portrait.w } : { ...portrait };

  const margin = Math.min(Math.max(0, marginMm), Math.min(pageMm.w, pageMm.h) / 2);
  const availW = pageMm.w - 2 * margin;
  const availH = pageMm.h - 2 * margin;
  const ratio = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;

  let w = availW;
  let h = w / ratio;
  if (h > availH) {
    h = availH;
    w = h * ratio;
  }
  const mapMm: Rect = { x: margin + (availW - w) / 2, y: margin, w, h };

  const left = mmToPx(mapMm.x, dpi);
  const top = mmToPx(mapMm.y, dpi);
  const right = mmToPx(mapMm.x + mapMm.w, dpi);
  const bottom = mmToPx(mapMm.y + mapMm.h, dpi);

  return {
    pageMm,
    pagePx: { w: mmToPx(pageMm.w, dpi), h: mmToPx(pageMm.h, dpi) },
    mapMm,
    mapPx: { x: left, y: top, w: right - left, h: bottom - top },
    dpi,
  };
}
