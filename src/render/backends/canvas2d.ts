import type { RenderBackend, SceneFrame } from "@/render/types";
import { getLayerType } from "@/layers/registry";
import { getSceneAdapter, composeEnv } from "@/plugin/loader";
import type { RenderEnv } from "@/layers/types";
import { computePaperRect } from "@/app/scene/geometry";

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

    // Compute paperRect via SceneAdapter (plugin). Fallback to default math.
    const scene = getSceneAdapter();
    const paperRect =
      scene?.computePaperRect?.({
        canvasSize: { w: cw, h: ch },
        paper: frame.paper,
      }) ??
      computePaperRect({
        canvasSize: { w: cw, h: ch },
        paper: frame.paper,
      });

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
    const envBase: RenderEnv = {
      zoom: frame.camera.zoom || 1,
      pixelRatio: dpr,
      size: { w: paperRect.w, h: paperRect.h },
      paperRect,
      camera: frame.camera,
      palette: frame.palette,
    };
    const envLocal: RenderEnv = {
      ...envBase,
      ...(composeEnv(frame) as Partial<RenderEnv>),
    };

    // Allow scene preRender hook (e.g., background effects). Keep pure; no transforms beyond clip/translate above.
    try {
      scene?.preRender?.(ctx as CanvasRenderingContext2D, frame, envLocal);
    } catch (e) {
      // non-fatal
      console.warn("[render] scene.preRender threw", e);
    }

    for (const l of frame.layers) {
      if (!l.visible) continue;
      const type = getLayerType(l.type);
      const draw = type?.adapter?.drawMain;
      if (typeof draw === "function") {
        draw(ctx as CanvasRenderingContext2D, l.state as unknown, envLocal);
      }
    }

    // Scene postRender can draw chrome like paper outline
    try {
      scene?.postRender?.(ctx as CanvasRenderingContext2D, frame, envLocal);
    } catch (e) {
      console.warn("[render] scene.postRender threw", e);
    }

    ctx.restore();
  }

  destroy() {
    this.ctx = null;
  }
}
