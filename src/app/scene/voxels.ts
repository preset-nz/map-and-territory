// The freeform layer's sparse voxel grid, as the document stores it: 16×16 chunks under the
// layer, each a dense list of 256 optional voxels, row-major (object-model doc, question 1).
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

/** A chunk row's painted voxels as the 2025 adapter's `cells`: `"q,r"` → voxel. */
export function decodeChunk(name: string, voxels: unknown): Record<string, Voxel> {
  const m = /^(-?\d+)_(-?\d+)$/.exec(name);
  if (!m || !Array.isArray(voxels)) return {};
  const cq = Number(m[1]);
  const cr = Number(m[2]);
  const out: Record<string, Voxel> = {};
  voxels.forEach((v, slot) => {
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
