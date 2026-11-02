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

/** `png` with `entry.cut` taken out, cropped to `entry.crop` (fractions) and scaled to
 * EXAMPLE_WIDTH wide. */
async function framed(png: ArrayBuffer, entry: Entry): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([png], { type: 'image/png' }));
  // the cut first, at full size, onto its own canvas; the crop and scale then work on that
  const parts = bands(bitmap.height, entry.cut);
  const joined = new OffscreenCanvas(
    bitmap.width,
    parts.reduce((n, b) => n + b.h, 0),
  );
  const jctx = joined.getContext('2d');
  if (!jctx) throw new Error('no 2d context');
  let at = 0;
  for (const b of parts) {
    jctx.drawImage(bitmap, 0, b.y, bitmap.width, b.h, 0, at, bitmap.width, b.h);
    at += b.h;
  }
  bitmap.close();
  const c = entry.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.round(c.x * joined.width);
  const sy = Math.round(c.y * joined.height);
  const sw = Math.round(c.w * joined.width);
  const sh = Math.round(c.h * joined.height);
  const canvas = new OffscreenCanvas(EXAMPLE_WIDTH, Math.round((EXAMPLE_WIDTH * sh) / sw));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(joined, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

async function runJob(rows: Source, job: ExamplesJob): Promise<void> {
  await untilReady(rows);
  const maps = await exportCampaignMaps(rows, exportSheet);
  const nameOf = (path: string) => (rows.nodeAt(path)?.values?.name as string | undefined) ?? '';
  for (const entry of job.entries) {
    const hit = maps.find((m) => nameOf(m.mapPath) === entry.map);
    if (!hit) throw new Error(`${job.campaign} has no drawable map named ${entry.map}`);
    await examplesWrite(entry.image, await framed(hit.png, entry));
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
