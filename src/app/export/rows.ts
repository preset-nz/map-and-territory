// The layout of an example picture made of rows of pieces (the manifest's `rows`): every piece
// at its own size, so they all show at one scale; each row centred; a gap between pieces and
// between rows. Pure, so it is tested without a canvas.

export interface Size {
  w: number;
  h: number;
}

export interface Placed extends Size {
  /** Index into the rows, then into that row. */
  row: number;
  col: number;
  x: number;
  y: number;
}

/** Where each piece goes, and the size of the whole. The gap is transparent. */
export function layoutRows(
  rows: Size[][],
  gap: number,
): { width: number; height: number; placed: Placed[] } {
  const widths = rows.map((r) => r.reduce((n, p) => n + p.w, 0) + gap * Math.max(0, r.length - 1));
  const heights = rows.map((r) => Math.max(0, ...r.map((p) => p.h)));
  const width = Math.max(0, ...widths);
  const height = heights.reduce((n, h) => n + h, 0) + gap * Math.max(0, rows.length - 1);
  const placed: Placed[] = [];
  let y = 0;
  rows.forEach((r, row) => {
    let x = Math.round((width - (widths[row] as number)) / 2);
    r.forEach((p, col) => {
      // pieces shorter than their row sit centred in it
      placed.push({ ...p, row, col, x, y: y + Math.round(((heights[row] as number) - p.h) / 2) });
      x += p.w + gap;
    });
    y += (heights[row] as number) + gap;
  });
  return { width, height, placed };
}
