// What the scene panel shows and offers for each node: pure, so it is tested without React.

/** The part of a mirror row the panel reads. */
export interface TreeRow {
  id: string;
  path: string;
  type: string;
  values?: Record<string, unknown>;
  orders?: Record<string, string[]>;
  refs?: Record<string, { node?: string; file?: string }>;
}

/** Whether the campaign is a booklet of pages rather than a collection of maps (epic 32). */
export function isBooklet(campaign: TreeRow | undefined): boolean {
  const b = campaign?.values?.booklet;
  return typeof b === 'string' && b !== 'none';
}

/** The map a page shows, by id; null for a blank page. */
export function pageMap(page: TreeRow | undefined): string | null {
  return page?.refs?.map?.node ?? null;
}

/** The maps on no page, in `maps` order: what a page can take. */
export function mapsOffPages(
  maps: readonly string[],
  pages: readonly (TreeRow | undefined)[],
): string[] {
  const on = new Set(pages.map(pageMap).filter((m): m is string => m !== null));
  return maps.filter((m) => !on.has(m));
}

const TITLES: Record<string, string> = {
  campaign: 'Campaign',
  map: 'Map',
  paper: 'Paper',
  hexgrid: 'Hex Grid',
  'hex-noise': 'Hex Noise',
  freeform: 'Freeform',
  outline: 'Outline',
  page: 'Page',
  cartouche: 'Title',
  compass: 'Compass',
};

/** Furniture kinds: in the map's `furniture`, drawn after `layers` (map furniture §1). */
export const FURNITURE_KINDS = new Set(['cartouche', 'compass']);

const ANCHORS = new Set(['paper', 'hexgrid']);

/** The row's `name`, or its kind's title when it has none (paper has none). */
export function displayName(row: TreeRow): string {
  const name = row.values?.name;
  return typeof name === 'string' && name.trim() !== '' ? name : (TITLES[row.type] ?? row.type);
}

/** A map's layers as the panel lists them: top first, the reverse of the stored z-order. */
export function layersTopFirst(map: TreeRow | undefined): string[] {
  return [...(map?.orders?.layers ?? [])].reverse();
}

/**
 * A map's furniture as the panel lists it: top first, above the layers. rhizome keeps no empty
 * order, so a map without furniture has no `furniture` at all.
 */
export function furnitureTopFirst(map: TreeRow | undefined): string[] {
  return [...(map?.orders?.furniture ?? [])].reverse();
}

export interface RowActions {
  rename: boolean;
  /** Present when the row can be shown and hidden; the value is whether it is visible now. */
  visible?: boolean;
  duplicate: boolean;
  delete: boolean;
}

/** What a row offers. The anchors only show and hide (paper not even that); Rust refuses the rest anyway. */
export function actionsFor(row: TreeRow): RowActions {
  const v = row.values?.visible;
  const visible = typeof v === 'boolean' ? v : undefined;
  if (row.type === 'campaign') return { rename: true, duplicate: false, delete: false };
  // a location is listed in its layer's order, which a duplicate wouldn't join (epic 28); a
  // page's copy wouldn't join `pages` either, and its map is on one page only (epic 32)
  if (row.type === 'location' || row.type === 'page')
    return { rename: true, duplicate: false, delete: true };
  const anchor = ANCHORS.has(row.type);
  return {
    rename: 'name' in (row.values ?? {}),
    visible,
    duplicate: !anchor,
    delete: !anchor,
  };
}
