import type { SceneFrame, RenderMessage } from "@/render/types";

export class RenderService {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreen: OffscreenCanvas | null = null;

  init(canvas: HTMLCanvasElement, pixelRatio: number): boolean {
    this.canvas = canvas;
    const offscreen = canvas.transferControlToOffscreen?.();
    if (!offscreen) return false; // fallback: not supported
    this.offscreen = offscreen as OffscreenCanvas;
    try {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
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
    this.worker.postMessage(msg);
  }

  render(frame: SceneFrame) {
    if (!this.worker) return;
    const msg: RenderMessage = { type: "render", frame };
    this.worker.postMessage(msg);
  }

  destroy() {
    this.worker?.postMessage({ type: "destroy" });
    this.worker?.terminate();
    this.worker = null;
    this.offscreen = null;
    this.canvas = null;
  }
}

export default RenderService;
