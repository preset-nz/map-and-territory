// What the scene panel shows and offers for each node: pure, so it is tested without React.

/** The part of a mirror row the panel reads. */
export interface TreeRow {
  id: string;
  path: string;
  type: string;
  values?: Record<string, unknown>;
  orders?: Record<string, string[]>;
}

const TITLES: Record<string, string> = {
  campaign: 'Campaign',
  map: 'Map',
  paper: 'Paper',
  hexgrid: 'Hex Grid',
  'hex-noise': 'Hex Noise',
  freeform: 'Freeform',
  outline: 'Outline',
};

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
  const anchor = ANCHORS.has(row.type);
  return {
    rename: 'name' in (row.values ?? {}),
    visible,
    duplicate: !anchor,
    delete: !anchor,
  };
}
