/**
 * The map that has just appeared between two readings of the `maps` order (New Map, or a
 * paste): exactly one more map, and that one new. It becomes the selection, as in 2025.
 * A wholesale change (another campaign opened) selects nothing.
 */
export function addedMap(before: readonly string[], after: readonly string[]): string | null {
  if (after.length !== before.length + 1) return null;
  const added = after.filter((id) => !before.includes(id));
  return added.length === 1 ? added[0] : null;
}

/** One reading of a list of children, with the node they belong to. */
export interface Reading {
  owner: string | null;
  ids: readonly string[];
}

/**
 * The child just added between two readings of the same owner's list. A different owner (the
 * active map changed) selects nothing: a map with no titles and one with a single title would
 * otherwise read as a title added.
 */
export function addedChild(before: Reading | null, after: Reading): string | null {
  if (!before || before.owner !== after.owner) return null;
  return addedMap(before.ids, after.ids);
}
