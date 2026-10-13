import { createDeltaEncoder, type DeltaEncoder } from '@/render/delta';
import type { RenderMessage, SceneFrame } from '@/render/types';

export class RenderService {
  private worker: Worker | null = null;
  private ready = false;
  private queue: Array<{ msg: RenderMessage; transfer: Transferable[] }> = [];
  private encoder: DeltaEncoder = createDeltaEncoder();

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
    this.worker.onmessage = (ev: MessageEvent<RenderMessage>) => {
      if (ev.data?.type === 'inited') {
        this.ready = true;
        // flush queued messages in order
        for (const { msg, transfer } of this.queue) this.worker?.postMessage(msg, transfer);
        this.queue = [];
      }
    };
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
  }
}

export default RenderService;
