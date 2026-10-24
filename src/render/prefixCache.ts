// Prefix cache planning (epic 12 story 5). The backend keeps one bitmap: the composite of
// layers [0, p). A layer is unchanged when its id, type, visibility and state object are
// the same ones, which the delta decoder guarantees for unchanged rows. This module only
// decides; the backend owns the bitmap.
import { gridEnv } from './grid-env';
import type { SceneFrame } from './types';

interface Entry {
  id: string;
  type: string;
  visible: boolean;
  state: unknown;
}

// The grid's size and orientation come from the hexgrid layer, the top one, but every layer
// below draws on them; so they belong to the whole frame, not to that one layer.
type Global = Pick<SceneFrame, 'size' | 'pixelRatio' | 'paper' | 'camera' | 'palette'> & {
  grid: ReturnType<typeof gridEnv>;
};

export interface PrefixPlan {
  /** Layers [0, reuse) come from the cached bitmap; 0 draws everything. */
  reuse: number;
  /** Snapshot the composite just before this layer index, or null. */
  snapshotAt: number | null;
}

const sameEntry = (a: Entry, b: Entry) =>
  a.id === b.id && a.type === b.type && a.visible === b.visible && a.state === b.state;

const sameGlobal = (a: Global, b: Global) =>
  a.size.w === b.size.w &&
  a.size.h === b.size.h &&
  a.pixelRatio === b.pixelRatio &&
  a.paper.aspect === b.paper.aspect &&
  a.paper.color === b.paper.color &&
  a.camera.x === b.camera.x &&
  a.camera.y === b.camera.y &&
  a.camera.zoom === b.camera.zoom &&
  a.palette === b.palette &&
  a.grid?.size === b.grid?.size &&
  a.grid?.orientation === b.grid?.orientation;

const globalOf = (f: SceneFrame): Global => ({
  size: { ...f.size },
  pixelRatio: f.pixelRatio,
  paper: { ...f.paper },
  camera: { ...f.camera },
  palette: f.palette,
  grid: gridEnv(f),
});

export class PrefixPlanner {
  private prev: { global: Global; entries: Entry[] } | null = null;
  private cache: { p: number; global: Global; entries: Entry[] } | null = null;
  private pending: { p: number; global: Global; entries: Entry[] } | null = null;

  plan(frame: SceneFrame): PrefixPlan {
    const global = globalOf(frame);
    const entries: Entry[] = frame.layers.map((l) => ({
      id: l.id,
      type: l.type,
      visible: l.visible,
      state: l.state,
    }));
    const n = entries.length;

    // the lowest index that differs from the last frame; n when none does
    let i = n;
    if (!this.prev || !sameGlobal(this.prev.global, global)) i = 0;
    else {
      const was = this.prev.entries;
      i = Math.min(n, was.length);
      for (let k = 0; k < Math.min(n, was.length); k++) {
        if (!sameEntry(entries[k], was[k])) {
          i = k;
          break;
        }
      }
    }
    this.prev = { global, entries };

    const c = this.cache;
    let reuse = 0;
    if (c && c.p > 0 && c.p <= n && sameGlobal(c.global, global)) {
      if (c.entries.every((e, k) => sameEntry(e, entries[k]))) reuse = c.p;
    }
    this.pending = null;
    if (reuse > 0 && i >= reuse) return { reuse, snapshotAt: null };
    const p = Math.min(i, n - 1);
    if (p < 1) {
      this.cache = null;
      return { reuse: 0, snapshotAt: null };
    }
    this.pending = { p, global, entries: entries.slice(0, p) };
    return { reuse, snapshotAt: p };
  }

  /** The backend took the snapshot the last plan asked for. */
  snapshotTaken() {
    if (this.pending) this.cache = this.pending;
    this.pending = null;
  }

  /** The cached bitmap is no longer trustworthy (a texture finished loading, a resize). */
  drop() {
    this.cache = null;
    this.prev = null;
    this.pending = null;
  }
}
