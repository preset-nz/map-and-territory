import type { Axial, Orientation } from './types';

// Offset conversions depend on variant; orientation matters for row vs column offset
export function axialToOffset(
  a: Axial,
  orientation: Orientation,
  variant: 'odd-r' | 'even-r' | 'odd-q' | 'even-q'
): { col: number; row: number } {
  if (variant.endsWith('-r')) {
    // row offset (pointy-top typical)
    const odd = variant.startsWith('odd');
    const col = a.q + ((a.r + (odd ? (a.r & 1) : ((a.r & 1) ^ 1))) >> 1) - ((odd ? 1 : 0) ? 0 : 0); // simplified later
    // Simpler, standard mapping:
    const col2 = a.q + ((a.r - (odd ? (a.r & 1) : 0)) >> 1);
    return { col: col2, row: a.r };
  } else {
    // column offset (flat-top typical)
    const odd = variant.startsWith('odd');
    const row2 = a.r + ((a.q - (odd ? (a.q & 1) : 0)) >> 1);
    return { col: a.q, row: row2 };
  }
}

export function offsetToAxial(
  o: { col: number; row: number },
  orientation: Orientation,
  variant: 'odd-r' | 'even-r' | 'odd-q' | 'even-q'
): Axial {
  if (variant.endsWith('-r')) {
    const odd = variant.startsWith('odd');
    const q = o.col - ((o.row - (odd ? (o.row & 1) : 0)) >> 1);
    const r = o.row;
    return { q, r };
  } else {
    const odd = variant.startsWith('odd');
    const q = o.col;
    const r = o.row - ((o.col - (odd ? (o.col & 1) : 0)) >> 1);
    return { q, r };
  }
}

