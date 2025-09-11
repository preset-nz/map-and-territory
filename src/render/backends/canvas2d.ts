import type { RenderBackend, SceneFrame } from "@/render/types";
import { getLayerType } from "@/layers/registry";
import { computePaperRect, deriveGridHint } from "@/render/env";

export class Canvas2DBackend implements RenderBackend {
  private ctx:
    | (CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D)
    | null = null;
  private pixelRatio = 1;
  private canvasW = 0;
  private canvasH = 0;
  private domCanvas: HTMLCanvasElement | null = null;

  // Overloads to satisfy RenderBackend and also support main-thread HTMLCanvasElement
  init(canvas: OffscreenCanvas, pixelRatio: number): void;
  init(canvas: HTMLCanvasElement, pixelRatio: number): void;
  init(canvas: OffscreenCanvas | HTMLCanvasElement, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    if (typeof (canvas as HTMLCanvasElement).getContext === "function") {
      this.domCanvas = canvas as HTMLCanvasElement;
      this.ctx = this.domCanvas.getContext("2d");
    } else {
      this.domCanvas = null;
      this.ctx = (canvas as OffscreenCanvas).getContext("2d");
    }

    // Reset canvas context state to ensure clean slate
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.fillStyle = "#000000";
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.lineCap = "butt";
      this.ctx.lineJoin = "miter";
      this.ctx.miterLimit = 10;
      this.ctx.shadowOffsetX = 10;
      this.ctx.shadowOffsetY = 10;
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = "rgba(0, 0, 0, 0)";
    }
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    // If we are driving a DOM canvas, update its bitmap size here.
    if (this.domCanvas && this.ctx) {
      const dpr = this.pixelRatio;
      this.domCanvas.width = Math.max(1, Math.floor(size.w * dpr));
      this.domCanvas.height = Math.max(1, Math.floor(size.h * dpr));
    }
    this.canvasW = size.w;
    this.canvasH = size.h;
  }

  // (Removed old pattern cache and helpers; adapters render directly)

  render(frame: SceneFrame) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w: cw, h: ch } = frame.size;
    const dpr = frame.pixelRatio || 1;
    // Clear in device pixels with identity transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Math.floor(cw * dpr), Math.floor(ch * dpr));
    // Now draw in CSS pixels by applying dpr transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute paperRect from the frame and let the Paper adapter draw the fill
    const paperRect = computePaperRect(cw, ch, frame.paper.aspect);

    // Clip to paper
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperRect.x, paperRect.y, paperRect.w, paperRect.h);
    ctx.clip();
    // Transform origin to paper top-left and apply camera
    ctx.translate(paperRect.x, paperRect.y);
    ctx.scale(frame.camera.zoom || 1, frame.camera.zoom || 1);
    ctx.translate(-(frame.camera.x || 0), -(frame.camera.y || 0));

    // Build env and delegate drawing to adapters in array order (bottom -> top)
    const gridHint = deriveGridHint(frame);

    const env = {
      zoom: frame.camera.zoom || 1,
      pixelRatio: dpr,
      size: { w: paperRect.w, h: paperRect.h },
      paperRect,
      camera: frame.camera,
      grid: gridHint,
      palette: frame.palette,
    } as const;

    for (const l of frame.layers) {
      if (!l.visible) continue;
      const type = getLayerType(l.type);
      const draw = type?.adapter?.drawMain;
      if (typeof draw === "function") {
        draw(ctx as CanvasRenderingContext2D, l.state as unknown, env);
      }
    }

    // Draw outline on top for emphasis
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3 / dpr; // ~3px in CSS pixels
    ctx.strokeRect(
      paperRect.x + ctx.lineWidth / 2,
      paperRect.y + ctx.lineWidth / 2,
      paperRect.w - ctx.lineWidth,
      paperRect.h - ctx.lineWidth,
    );
    ctx.restore();

    ctx.restore();
  }

  destroy() {
    this.ctx = null;
  }
}
