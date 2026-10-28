import { createDeltaEncoder, type DeltaEncoder } from '@/render/delta';
import type { RenderMessage, SceneFrame } from '@/render/types';

export class RenderService {
  private worker: Worker | null = null;
  private ready = false;
  private queue: Array<{ msg: RenderMessage; transfer: Transferable[] }> = [];
  private encoder: DeltaEncoder = createDeltaEncoder();
  private exports = new Map<
    number,
    { resolve: (png: ArrayBuffer) => void; reject: (e: Error) => void }
  >();
  private nextExport = 1;

  init(canvas: HTMLCanvasElement, pixelRatio: number): boolean {
    const fail = (stage: string, e?: unknown) => {
      console.error('[RenderService] Worker init failed at', stage, e);
      return false;
    };
    let offscreen: OffscreenCanvas | null = null;
    try {
      offscreen = canvas.transferControlToOffscreen?.() as OffscreenCanvas | null;
    } catch (e) {
      return fail('transfer-error', e);
    }
    if (!offscreen) return fail('offscreen-null');
    try {
      // One expression, so Vite bundles the worker into the release build.
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      return fail('create-worker-error', e);
    }
    this.ready = false;
    this.worker.onmessage = (ev: MessageEvent<RenderMessage>) => this.receive(ev.data);
    this.worker.onerror = (ev) => console.error('[RenderService] worker error', ev.message);
    const initMsg: RenderMessage = { type: 'init', canvas: offscreen, pixelRatio };
    try {
      this.worker.postMessage(initMsg, [offscreen]);
    } catch (e) {
      this.worker.terminate();
      this.worker = null;
      return fail('postMessage-error', e);
    }
    return true;
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    this.post({ type: 'resize', size, pixelRatio });
  }

  render(frame: SceneFrame) {
    const wire = this.encoder.encode(frame);
    if (wire) this.post({ type: 'render', frame: wire });
  }

  /** Hands a decoded image to the worker; the bitmap is transferred, not copied. */
  texture(id: string, bitmap: ImageBitmap) {
    this.post({ type: 'texture', id, bitmap }, [bitmap]);
  }

  /**
   * The map drawn at `out` pixels from paper space `logical` (epic 07 story 3), as PNG bytes.
   * `frame` goes whole, beside the screen's delta stream, not through it.
   */
  exportPng(
    frame: SceneFrame,
    logical: { w: number; h: number },
    out: { w: number; h: number },
  ): Promise<ArrayBuffer> {
    if (!this.worker) return Promise.reject(new Error('the renderer is not running'));
    const id = this.nextExport++;
    return new Promise((resolve, reject) => {
      this.exports.set(id, { resolve, reject });
      this.post({ type: 'export', id, frame, logical, out });
    });
  }

  /** A message from the worker. */
  receive(msg: RenderMessage | undefined) {
    if (msg?.type === 'inited') {
      this.ready = true;
      // flush queued messages in order
      for (const { msg: m, transfer } of this.queue) this.worker?.postMessage(m, transfer);
      this.queue = [];
    } else if (msg?.type === 'faces') {
      // The worker's face probe (epic 23 story 1): a failure means furniture draws in the
      // platform's fallback faces, measured right but not in the map's lettering.
      if (!msg.available) {
        console.warn('[render] the worker has no FontFace or fonts; furniture uses fallback faces');
      } else if (msg.failed.length > 0) {
        console.warn('[render] faces failed to load:', msg.failed.join('; '));
      } else {
        console.info('[render] faces loaded:', msg.loaded.join(', '));
      }
    } else if (msg?.type === 'exported' || msg?.type === 'export-error') {
      const waiting = this.exports.get(msg.id);
      if (!waiting) return;
      this.exports.delete(msg.id);
      if (msg.type === 'exported') waiting.resolve(msg.png);
      else waiting.reject(new Error(msg.message));
    }
  }

  private post(msg: RenderMessage, transfer: Transferable[] = []) {
    if (!this.worker) return;
    if (this.ready) this.worker.postMessage(msg, transfer);
    else this.queue.push({ msg, transfer });
  }

  destroy() {
    this.worker?.postMessage({ type: 'destroy' });
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.queue = [];
    this.encoder = createDeltaEncoder();
    for (const { reject } of this.exports.values()) reject(new Error('the renderer stopped'));
    this.exports.clear();
  }
}

export default RenderService;
