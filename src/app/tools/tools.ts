// The active tool and the hex under the pointer: interaction state, never in the document.
import { createStore, useStore } from '@preset.nz/app-kit/core';

export type ToolId = 'paint' | 'erase' | 'fill' | 'select' | 'outline';

/** Menu command id → tool, in the Tool menu's order (menu standard: `1` to `5`). */
export const TOOL_COMMANDS: Record<string, ToolId> = {
  'tool.paint': 'paint',
  'tool.erase': 'erase',
  'tool.fill': 'fill',
  'tool.select': 'select',
  'tool.outline': 'outline',
};

const active = createStore<ToolId>('select');

export const tools = {
  get: active.get,
  set: active.set,
  subscribe: active.subscribe,
  use: () => useStore(active),
};

export type Hex = { q: number; r: number };

const hover = createStore<Hex | null>(null);

/** The hex under the pointer, for the status bar; null off the paper or with no grid. */
export const pointerHex = {
  get: hover.get,
  set: (h: Hex | null) => {
    const now = hover.get();
    if (h === now || (h && now && h.q === now.q && h.r === now.r)) return;
    hover.set(h);
  },
  subscribe: hover.subscribe,
  use: () => useStore(hover),
};
