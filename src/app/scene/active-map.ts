/**
 * Which map is drawn. Selection lives in the webview, never in the document: switching maps is
 * not an edit. A map that has just appeared (New Map, or a paste) becomes active, as in 2025;
 * otherwise the active map stays while it exists, and falls back to the first.
 */
export function nextActiveMap(
  active: string | null,
  before: readonly string[],
  maps: readonly string[],
): string | null {
  const added = maps.find((id) => !before.includes(id));
  if (added !== undefined && before.length + 1 === maps.length) return added;
  if (active !== null && maps.includes(active)) return active;
  return maps[0] ?? null;
}
