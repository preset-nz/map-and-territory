import type { RenderBackend, SceneFrame } from "@/render/types";
import { getLayerType } from "@/layers/registry";

function parseAspect(aspect: "square" | "4:3" | "16:10"): {
  aw: number;
  ah: number;
} {
  switch (aspect) {
    case "square":
      return { aw: 1, ah: 1 };
    case "4:3":
      return { aw: 4, ah: 3 };
    case "16:10":
    default:
      return { aw: 16, ah: 10 };
  }
}

export class Canvas2DBackend implements RenderBackend {
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private pixelRatio = 1;
  private canvasW = 0;
  private canvasH = 0;

  init(canvas: OffscreenCanvas, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    this.ctx = canvas.getContext("2d");
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    // Note: The OffscreenCanvas is already resized by the host; nothing to do here.
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

    // Determine paper from layer state (fallback to frame.paper) and compute paperRect
    const paperLayer = frame.layers.find((l) => l.type === "paper");
    const paperAspect =
      (paperLayer?.state as { aspect?: "square" | "4:3" | "16:10" } | undefined)
        ?.aspect ?? frame.paper.aspect;
    const paperColor =
      (paperLayer?.state as { color?: string } | undefined)?.color ??
      frame.paper.color;

    // Compute paperRect: fill width with left/right/top spacing, top-aligned; ensure it fits height
    const paddingX = Math.max(12, cw * 0.05);
    const paddingY = 12;
    const availW = Math.max(0, cw - paddingX * 2);
    const availH = Math.max(0, ch - paddingY * 2);
    const { aw, ah } = parseAspect(paperAspect);
    let paperW = availW;
    let paperH = (paperW * ah) / aw;
    if (paperH > availH) {
      // If too tall, fit height instead
      paperH = availH;
      paperW = (paperH * aw) / ah;
    }
    const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
    const paperY = paddingY; // top-aligned

    // Draw paper fill (screen space)
    ctx.save();
    ctx.fillStyle = paperColor || "#ffffff";
    ctx.fillRect(paperX, paperY, paperW, paperH);
    ctx.restore();

    // Clip to paper
    ctx.save();
    ctx.beginPath();
    ctx.rect(paperX, paperY, paperW, paperH);
    ctx.clip();
    // Transform origin to paper top-left and apply camera
    ctx.translate(paperX, paperY);
    ctx.scale(frame.camera.zoom || 1, frame.camera.zoom || 1);
    ctx.translate(-(frame.camera.x || 0), -(frame.camera.y || 0));

    // Build env and delegate drawing to adapters in array order (bottom -> top)
    const gridLayer = frame.layers.find((l) => l.type === "hexgrid");
    const gridHint = gridLayer
      ? {
          size: Math.max(
            4,
            Number(
              (gridLayer.state as Record<string, unknown>)?.["size"] ?? 16,
            ),
          ),
          orientation: ((gridLayer.state as Record<string, unknown>)?.[
            "orientation"
          ] === "flat"
            ? "flat"
            : "pointy") as "pointy" | "flat",
        }
      : undefined;

    const env = {
      zoom: frame.camera.zoom || 1,
      pixelRatio: dpr,
      size: { w: paperW, h: paperH },
      paperRect: { x: paperX, y: paperY, w: paperW, h: paperH },
      camera: frame.camera,
      grid: gridHint,
      palette: frame.palette,
    } as const;

    for (const l of frame.layers) {
      if (!l.visible) continue;
      const type = getLayerType(l.type);
      const draw = type?.adapter?.drawMain;
      if (typeof draw === "function") {
        draw(
          ctx as unknown as CanvasRenderingContext2D,
          l.state as unknown,
          env,
        );
      }
    }

    // Draw outline on top for emphasis
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3 / dpr; // ~3px in CSS pixels
    ctx.strokeRect(
      paperX + ctx.lineWidth / 2,
      paperY + ctx.lineWidth / 2,
      paperW - ctx.lineWidth,
      paperH - ctx.lineWidth,
    );
    ctx.restore();

    ctx.restore();
  }

  destroy() {
    this.ctx = null;
  }
}
