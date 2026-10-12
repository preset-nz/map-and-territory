// rhizome colours (`[r, g, b, a]`, 0 to 1) as CSS, in one place.

const hex2 = (x: number) =>
  Math.round(Math.min(1, Math.max(0, x)) * 255)
    .toString(16)
    .padStart(2, '0');

/** A rhizome colour (`[r, g, b, a]`, 0 to 1) as CSS: `#rrggbb`, or `#rrggbbaa` when translucent. */
export function cssColour(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const [r, g, b, a] = value as number[];
  const rgb = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a >= 1 ? rgb : `${rgb}${hex2(a)}`;
}
