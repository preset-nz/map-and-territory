// The one invalidation key function (README decision 3): a layer redraws when its adapter's
// `getInvalidationKey` says its visuals changed, never because its state object did. Both the
// main thread's delta encoder and the worker's prefix planner call `layerKey`. The frame
// builder keeps a layer's state object while its rows are unchanged, so the memo below makes
// an unchanged row cost nothing.
import { BUILTIN_LAYER_TYPES } from '@/layers/builtin';
import type { LayerType } from '@/layers/types';

const adapters = new Map<string, LayerType['adapter']>(
  BUILTIN_LAYER_TYPES.map((t) => [t.id, t.adapter]),
);
const memo = new WeakMap<object, Map<string, string>>();
const warned = new Set<string>();

/** The key of a layer of `type` in `state`; `type:?` for a type no adapter knows. */
export function layerKey(type: string, state: unknown): string {
  const adapter = adapters.get(type);
  if (!adapter) {
    if (!warned.has(type)) {
      warned.add(type);
      console.warn(`[render] no adapter for layer type "${type}"; it never redraws on change`);
    }
    return `${type}:?`;
  }
  if (typeof state !== 'object' || state === null) return adapter.getInvalidationKey(state);
  let byType = memo.get(state);
  if (!byType) {
    byType = new Map();
    memo.set(state, byType);
  }
  let key = byType.get(type);
  if (key === undefined) {
    key = adapter.getInvalidationKey(state);
    byType.set(type, key);
  }
  return key;
}

/** What tells a layer's entries apart in the delta and planner maps: its id and pass. Never on the wire. */
export const slotOf = (l: { id: string; pass?: string }): string =>
  l.pass ? `${l.id}:${l.pass}` : l.id;
