// The freeform layer's sparse voxel grid, as the document stores it: 16×16 chunks under the
// layer, each a palette and a run-length string over its 256 slots, row-major (object-model
// doc, "Chunk voxels"): `{ palette: [{terrainId, color?}], cells: "1 0*2 1 0*252" }`. A token is
// `i` or `i*n`; 0 is empty, k is palette[k-1]. Rust encodes and decodes
// (`src-tauri/src/object_model/voxels.rs`); this file only decodes the mirror's copy. Both run
// the same fixtures, `voxels_fixtures.json`.
import { cssColour } from './colour';

export const CHUNK = 16;

export interface Voxel {
  terrainId?: string;
  color?: string;
}

const floorDiv = (n: number) => Math.floor(n / CHUNK);

/** The chunk a hex lies in, and its slot there. */
export function chunkOf(q: number, r: number): { cq: number; cr: number; slot: number } {
  const cq = floorDiv(q);
  const cr = floorDiv(r);
  return { cq, cr, slot: (r - cr * CHUNK) * CHUNK + (q - cq * CHUNK) };
}

/** A chunk node's path name, `<cq>_<cr>`. */
export const chunkName = (cq: number, cr: number) => `${cq + 0}_${cr + 0}`;

const SLOTS = CHUNK * CHUNK;

/** The 256 slots of a `voxels` value: the palette entry, or null where empty. Null if malformed. */
export function decodeSlots(voxels: unknown): (unknown | null)[] | null {
  if (!voxels || typeof voxels !== 'object') return null;
  const { palette, cells } = voxels as { palette?: unknown; cells?: unknown };
  if (!Array.isArray(palette) || typeof cells !== 'string') return null;
  const slots: (unknown | null)[] = [];
  for (const token of cells.split(' ')) {
    const m = /^(\d+)(?:\*(\d+))?$/.exec(token);
    if (!m) return null;
    const index = Number(m[1]);
    const run = m[2] === undefined ? 1 : Number(m[2]);
    if (index > palette.length || slots.length + run > SLOTS) return null;
    const entry = index === 0 ? null : palette[index - 1];
    for (let k = 0; k < run; k++) slots.push(entry);
  }
  return slots.length === SLOTS ? slots : null;
}

/** A chunk row's painted voxels as the 2025 adapter's `cells`: `"q,r"` → voxel. */
export function decodeChunk(name: string, voxels: unknown): Record<string, Voxel> {
  const m = /^(-?\d+)_(-?\d+)$/.exec(name);
  const slots = m ? decodeSlots(voxels) : null;
  if (!m || !slots) return {};
  const cq = Number(m[1]);
  const cr = Number(m[2]);
  const out: Record<string, Voxel> = {};
  slots.forEach((v, slot) => {
    if (!v || typeof v !== 'object') return;
    const raw = v as { terrainId?: unknown; color?: unknown };
    const q = cq * CHUNK + (slot % CHUNK);
    const r = cr * CHUNK + Math.floor(slot / CHUNK);
    const voxel: Voxel = {};
    if (typeof raw.terrainId === 'string' && raw.terrainId) voxel.terrainId = raw.terrainId;
    const color = raw.color == null ? undefined : cssColour(raw.color);
    if (color) voxel.color = color;
    out[`${q},${r}`] = voxel;
  });
  return out;
}
