// `just examples` (epic 27 story 2), the webview's half: a debug launch with MT_EXAMPLE set has
// the campaign open already (src-tauri/src/examples.rs). This waits for the mirror and the
// canvas, exports the campaign's maps the way File > Export does, crops and scales the ones
// the manifest names to 1200 px wide, writes each as a PNG and ends the run. With no job (every
// launch of a release build) it does nothing.

import type { RowSource } from '../scene/frame';
import { type ExamplesJob, examplesDone, examplesJob, examplesWrite, exportSheet } from './native';
import { exportCampaignMaps, mapExporter } from './render';

/** The width every example is drawn at. */
export const EXAMPLE_WIDTH = 1200;
/** The side of a page's thumbnail. */
export const THUMB_SIZE = 128;

type Entry = ExamplesJob['entries'][number];
type Source = RowSource & { ready: boolean };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until the mirror holds the campaign's maps and the canvas can draw them. */
async function untilReady(rows: Source, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const maps = rows.nodeAt('/maps')?.orders?.maps ?? [];
    if (rows.ready && maps.length > 0 && mapExporter() !== null) return;
    if (Date.now() - start > timeoutMs) throw new Error('the campaign never became drawable');
    await sleep(100);
  }
}

/** The source rows to draw, top to bottom: all of `h`, or the parts above and below `cut`. */
export function bands(h: number, cut?: Entry['cut']): { y: number; h: number }[] {
  if (!cut) return [{ y: 0, h }];
  const top = Math.round(cut.y * h);
  const bottom = Math.round((cut.y + cut.h) * h);
  return [
    { y: 0, h: top },
    { y: bottom, h: h - bottom },
  ];
}

const GAP = 24;

async function bitmapOf(png: ArrayBuffer): Promise<ImageBitmap> {
  return createImageBitmap(new Blob([png], { type: 'image/png' }));
}

function context(c: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

type Piece = { source: OffscreenCanvas; x: number; y: number; w: number; h: number };

/** `png` with `entry.cut` taken out, and the part of it `entry.crop` (fractions) keeps. */
async function cropped(png: ArrayBuffer, entry: Entry): Promise<Piece> {
  const bitmap = await bitmapOf(png);
  // the cut first, at full size, onto its own canvas; the crop then works on that
  const parts = bands(bitmap.height, entry.cut);
  const joined = new OffscreenCanvas(
    bitmap.width,
    parts.reduce((n, b) => n + b.h, 0),
  );
  const jctx = context(joined);
  let at = 0;
  for (const b of parts) {
    jctx.drawImage(bitmap, 0, b.y, bitmap.width, b.h, 0, at, bitmap.width, b.h);
    at += b.h;
  }
  bitmap.close();
  const c = entry.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  return {
    source: joined,
    x: Math.round(c.x * joined.width),
    y: Math.round(c.y * joined.height),
    w: Math.round(c.w * joined.width),
    h: Math.round(c.h * joined.height),
  };
}

/** The pieces side by side, each scaled to the tallest's height, with a gap of transparent
 * pixels between. */
function row(pieces: Piece[]): OffscreenCanvas {
  const height = Math.max(...pieces.map((p) => p.h));
  const widths = pieces.map((p) => Math.round((p.w * height) / p.h));
  const out = new OffscreenCanvas(
    widths.reduce((a, b) => a + b, 0) + GAP * (pieces.length - 1),
    height,
  );
  const ctx = context(out);
  let x = 0;
  pieces.forEach((p, i) => {
    ctx.drawImage(p.source, p.x, p.y, p.w, p.h, x, 0, widths[i] as number, height);
    x += (widths[i] as number) + GAP;
  });
  return out;
}

async function png(canvas: OffscreenCanvas): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

/** The piece, or the row of them, scaled to EXAMPLE_WIDTH wide. One piece is drawn straight
 * from its source, in one resample. */
function scaled(pieces: Piece[]): OffscreenCanvas {
  const [only] = pieces;
  const piece: Piece = only && pieces.length === 1 ? only : rowPiece(pieces);
  const canvas = new OffscreenCanvas(
    EXAMPLE_WIDTH,
    Math.round((EXAMPLE_WIDTH * piece.h) / piece.w),
  );
  context(canvas).drawImage(
    piece.source,
    piece.x,
    piece.y,
    piece.w,
    piece.h,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

function rowPiece(pieces: Piece[]): Piece {
  const source = row(pieces);
  return { source, x: 0, y: 0, w: source.width, h: source.height };
}

/** The square `thumb` names, from the whole export of the entry's first map, at 128 px. */
async function thumbnail(
  full: ArrayBuffer,
  thumb: NonNullable<Entry['thumb']>,
): Promise<Uint8Array> {
  const bitmap = await bitmapOf(full);
  const side = Math.round(thumb.w * bitmap.width);
  const canvas = new OffscreenCanvas(THUMB_SIZE, THUMB_SIZE);
  context(canvas).drawImage(
    bitmap,
    Math.round(thumb.x * bitmap.width),
    Math.round(thumb.y * bitmap.height),
    side,
    side,
    0,
    0,
    THUMB_SIZE,
    THUMB_SIZE,
  );
  bitmap.close();
  return png(canvas);
}

async function runJob(rows: Source, job: ExamplesJob): Promise<void> {
  await untilReady(rows);
  const maps = await exportCampaignMaps(rows, exportSheet);
  const nameOf = (path: string) => (rows.nodeAt(path)?.values?.name as string | undefined) ?? '';
  for (const entry of job.entries) {
    const hits = (entry.maps ?? [entry.map ?? '']).map((name) => {
      const hit = maps.find((m) => nameOf(m.mapPath) === name);
      if (!hit) throw new Error(`${job.campaign} has no drawable map named ${name}`);
      return hit;
    });
    const pieces = await Promise.all(hits.map((h) => cropped(h.png, entry)));
    await examplesWrite(entry.image, await png(scaled(pieces)));
    const first = hits[0];
    if (entry.thumb && first) {
      await examplesWrite(`${entry.page}-thumb`, await thumbnail(first.png, entry.thumb));
    }
  }
}

let started = false;

/** Runs this launch's examples job, if it has one. Once, whatever mounts twice. */
export async function runExamples(rows: Source): Promise<void> {
  if (started) return;
  started = true;
  let job: ExamplesJob | null;
  try {
    job = await examplesJob();
  } catch (e) {
    console.error('[examples]', e);
    return;
  }
  if (job === null) return;
  try {
    await runJob(rows, job);
    await examplesDone(false);
  } catch (e) {
    console.error('[examples]', e);
    await examplesDone(true);
  }
}
