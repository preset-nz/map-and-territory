export function nextNumberedName(
  baseTitle: string,
  existingNames: string[],
): string {
  const prefix = `${baseTitle} `;
  let maxN = 0;
  for (const name of existingNames) {
    if (!name || !name.startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    // Accept only pure integer suffixes (ignore "Copy" etc.)
    if (/^\d{1,}$/.test(rest)) {
      const n = parseInt(rest, 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }
  const next = Math.max(1, maxN + 1);
  // Zero-pad width 2
  const padded = next.toString().padStart(2, "0");
  return `${baseTitle} ${padded}`;
}
