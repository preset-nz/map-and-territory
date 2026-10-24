// A short message for the status bar: what an export did, or why it didn't. Interaction state,
// never in the document. It clears itself, so a stale message doesn't outlive its moment.
import { createStore, useStore } from '@preset.nz/app-kit/core';

export interface Notice {
  text: string;
  kind: 'info' | 'error';
}

const current = createStore<Notice | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

/** How long a notice stays: long enough to read, an error longer. */
const SHOWN_MS = { info: 6000, error: 12000 };

export const notice = {
  get: current.get,
  subscribe: current.subscribe,
  use: () => useStore(current),
  show(text: string, kind: Notice['kind'] = 'info') {
    clearTimeout(timer);
    current.set({ text, kind });
    timer = setTimeout(() => current.set(null), SHOWN_MS[kind]);
  },
  clear() {
    clearTimeout(timer);
    current.set(null);
  },
};
