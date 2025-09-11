import type { SceneFrame, RenderMessage } from "@/render/types";

export class RenderService {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreen: OffscreenCanvas | null = null;
  private ready = false;
  private queue: Array<RenderMessage> = [];

  init(canvas: HTMLCanvasElement, pixelRatio: number): boolean {
    this.canvas = canvas;
    let offscreen: OffscreenCanvas | null = null;
    try {
      offscreen =
        canvas.transferControlToOffscreen?.() as OffscreenCanvas | null;
    } catch {
      // Calling transferControlToOffscreen twice on the same canvas throws.
      // Fail gracefully so the host can choose a fallback path.
      offscreen = null;
    }
    if (!offscreen) return false; // fallback: not supported or already transferred
    this.offscreen = offscreen as OffscreenCanvas;
    try {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.ready = false;
      this.worker.onmessage = (ev: MessageEvent<RenderMessage>) => {
        if (ev.data?.type === "inited") {
          this.ready = true;
          // flush queued messages in order
          for (const msg of this.queue) this.worker?.postMessage(msg);
          this.queue = [];
        }
      };
      const initMsg: RenderMessage = {
        type: "init",
        canvas: this.offscreen,
        pixelRatio,
      };
      this.worker.postMessage(initMsg, [this.offscreen]);
      return true;
    } catch {
      this.worker?.terminate();
      this.worker = null;
      this.offscreen = null;
      return false;
    }
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    if (!this.worker) return;
    const msg: RenderMessage = { type: "resize", size, pixelRatio };
    if (this.ready) this.worker.postMessage(msg);
    else this.queue.push(msg);
  }

  render(frame: SceneFrame) {
    if (!this.worker) return;
    const msg: RenderMessage = { type: "render", frame };
    if (this.ready) this.worker.postMessage(msg);
    else this.queue.push(msg);
  }

  destroy() {
    this.worker?.postMessage({ type: "destroy" });
    this.worker?.terminate();
    this.worker = null;
    this.offscreen = null;
    this.canvas = null;
    this.ready = false;
    this.queue = [];
  }
}

export default RenderService;
