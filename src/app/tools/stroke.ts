// A paint or erase stroke as one undo step (object-model doc, "Gestures"): begin on pointer-down,
// send the hexes gathered since the last frame as one command per frame, end on pointer-up.
// Pending hexes add up rather than replace each other, so a fast drag drops none.
import type { Channel } from '@preset.nz/pom';

export type Cell = { q: number; r: number; terrainId?: string; color?: string };

export interface Stroke {
  add(cell: Cell): void;
  /** Sends what is left and closes the step. */
  end(): void;
}

export interface StrokeOptions {
  channel: Pick<Channel, 'begin' | 'run' | 'end'>;
  /** The undo step's name: "Paint", "Erase". */
  label: string;
  command: 'freeform.paint' | 'freeform.erase';
  at: string;
  /** Called once per frame; tests pass their own. */
  nextFrame?: (f: () => void) => void;
}

const raf = (f: () => void) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(f);
  else setTimeout(f, 16);
};

export function createStroke(o: StrokeOptions): Stroke {
  const nextFrame = o.nextFrame ?? raf;
  const token = o.channel.begin(o.label);
  const pending = new Map<string, Cell>();
  const seen = new Set<string>();
  let scheduled = false;
  let ended = false;

  const payload = (cells: Cell[]) =>
    o.command === 'freeform.erase'
      ? { at: o.at, cells: cells.map((c) => [c.q, c.r]) }
      : { at: o.at, cells };

  const flush = () => {
    scheduled = false;
    if (pending.size === 0) return;
    const cells = [...pending.values()];
    pending.clear();
    o.channel.run(o.command, payload(cells)).catch((e) => console.error(`[stroke] ${o.label}`, e));
  };

  return {
    add(cell) {
      if (ended) return;
      const key = `${cell.q},${cell.r}`;
      // one stroke paints a hex once: dragging back over it sends nothing new
      if (seen.has(key)) return;
      seen.add(key);
      pending.set(key, cell);
      if (!scheduled) {
        scheduled = true;
        nextFrame(flush);
      }
    },
    end() {
      if (ended) return;
      ended = true;
      flush();
      o.channel.end(token).catch((e) => console.error(`[stroke] ${o.label} end`, e));
    },
  };
}
