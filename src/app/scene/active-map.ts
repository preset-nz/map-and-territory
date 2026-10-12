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
