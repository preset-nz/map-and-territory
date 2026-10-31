/** FNV-1a (32 bit) over the strings, each ended by a separator so ["ab","c"] and ["a","bc"] differ. */
export function fnv1a(parts: Iterable<string>): string {
  let h = 0x811c9dc5;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
