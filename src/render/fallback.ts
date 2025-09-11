import type { SceneFrame } from "@/render/types";
import { Canvas2DBackend } from "@/render/backends/canvas2d";

export class MainThreadRenderService {
  private backend: Canvas2DBackend | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ready = false;

  init(canvas: HTMLCanvasElement, pixelRatio: number): boolean {
    this.canvas = canvas;
    try {
      const b = new Canvas2DBackend();
      b.init(canvas, pixelRatio);
      this.backend = b;
      this.ready = true;
      return true;
    } catch {
      this.backend = null;
      this.canvas = null;
      this.ready = false;
      return false;
    }
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    if (!this.backend) return;
    this.backend.resize(size, pixelRatio);
  }

  render(frame: SceneFrame) {
    if (!this.backend) return;
    this.backend.render(frame);
  }

  destroy() {
    this.backend?.destroy();
    this.backend = null;
    this.canvas = null;
    this.ready = false;
  }
}

export default MainThreadRenderService;
