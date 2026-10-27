import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { layerComposite } from '@/render/composite';
import { computePaperRect } from '@/render/geometry';
import { gridEnv } from '@/render/grid-env';
import { PrefixPlanner } from '@/render/prefixCache';
import type { RenderBackend, SceneFrame } from '@/render/types';

export class Canvas2DBackend implements RenderBackend {
  private ctx: (CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) | null = null;
  private pixelRatio = 1;
  private domCanvas: HTMLCanvasElement | null = null;
  // where a layer with opacity or a blend mode is drawn before it is composited
  private scratch: OffscreenCanvas | null = null;
  // the composite of the layers below the one being edited, so a stroke redraws only from there up
  private prefix: OffscreenCanvas | null = null;
  private planner = new PrefixPlanner();
  /** Off for the reference render that checks the cache. */
  useCache = true;
  // decoded images layers refer to, the most recently set last
  private textures = new Map<string, ImageBitmap>();

  // Overloads to satisfy RenderBackend and also support main-thread HTMLCanvasElement
  init(canvas: OffscreenCanvas, pixelRatio: number): void;
  init(canvas: HTMLCanvasElement, pixelRatio: number): void;
  init(canvas: OffscreenCanvas | HTMLCanvasElement, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    if (typeof (canvas as HTMLCanvasElement).getContext === 'function') {
      this.domCanvas = canvas as HTMLCanvasElement;
      this.ctx = this.domCanvas.getContext('2d');
    } else {
      this.domCanvas = null;
      this.ctx = (canvas as OffscreenCanvas).getContext('2d');
    }

    // Reset canvas context state to ensure clean slate
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
      this.ctx.globalAlpha = 1;
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = '#000000';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.lineCap = 'butt';
      this.ctx.lineJoin = 'miter';
      this.ctx.miterLimit = 10;
      this.ctx.shadowOffsetX = 10;
      this.ctx.shadowOffsetY = 10;
      this.ctx.shadowBlur = 0;
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0)';
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
  }

  /** A decoded image for layers that refer to `id`. Keeps the newest eight. */
  setTexture(id: string, bitmap: ImageBitmap) {
    this.textures.get(id)?.close?.();
    this.textures.delete(id);
    this.textures.set(id, bitmap);
    while (this.textures.size > 8) {
      const oldest = this.textures.keys().next().value as string;
      this.textures.get(oldest)?.close?.();
      this.textures.delete(oldest);
    }
    this.planner.drop(); // a layer's pixels changed, its state did not
  }

  /** Forget the cached prefix: something a layer draws changed without its state changing. */
  dropCache() {
    this.planner.drop();
  }

  render(frame: SceneFrame) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w: cw, h: ch } = frame.size;
    const dpr = frame.pixelRatio || 1;
    // Clear in device pixels with identity transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Math.floor(cw * dpr), Math.floor(ch * dpr));
    // No map: the frame has no layers (a map always has its paper and grid), so the canvas
    // stays empty, with no paper edge.
    if (frame.layers.length === 0) return;
    // Now draw in CSS pixels by applying dpr transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const paperRect = computePaperRect({ canvasSize: { w: cw, h: ch }, paper: frame.paper });

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
    const envLocal: RenderEnv = {
      zoom: frame.camera.zoom || 1,
      pixelRatio: dpr,
      size: { w: paperRect.w, h: paperRect.h },
      paperRect,
      camera: frame.camera,
      palette: frame.palette,
      textures: this.textures,
      grid: gridEnv(frame),
    };

    const plan = this.useCache
      ? this.planner.plan(frame)
      : ({ reuse: 0, snapshotAt: null } as const);
    if (plan.reuse > 0 && this.prefix) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // the paper clip stays in force
      ctx.drawImage(this.prefix, 0, 0);
      ctx.restore();
    }

    const first = this.prefix ? plan.reuse : 0;
    const device = { w: Math.max(1, Math.floor(cw * dpr)), h: Math.max(1, Math.floor(ch * dpr)) };
    this.drawLayers(ctx, frame, envLocal, device, first, plan.snapshotAt, () => {
      if (!this.scratch) this.scratch = new OffscreenCanvas(device.w, device.h);
      return this.scratch;
    });

    // the paper's edge is the host's chrome, drawn over every layer
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = '#000000';
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

  /**
   * The map alone at print size (epic 07 story 3): paper space `logical` (CSS px, what the
   * screen shows at Fit) scaled into `out` device px. Camera at 1x, no paper edge, no prefix
   * cache; the textures are the ones this backend already holds. `env.pixelRatio` stays the
   * frame's, so line widths that adapters divide by it come out as the screen's, scaled.
   */
  renderExport(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    frame: SceneFrame,
    logical: { w: number; h: number },
    out: { w: number; h: number },
  ) {
    const lw = Math.max(1, logical.w);
    const lh = Math.max(1, logical.h);
    const sx = out.w / lw;
    const sy = out.h / lh;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, out.w, out.h);
    ctx.save();
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, lw, lh);
    ctx.clip();
    const camera = { x: 0, y: 0, zoom: 1 };
    const env: RenderEnv = {
      zoom: 1,
      pixelRatio: frame.pixelRatio || 1,
      size: { w: lw, h: lh },
      paperRect: { x: 0, y: 0, w: lw, h: lh },
      camera,
      palette: frame.palette,
      textures: this.textures,
      grid: gridEnv(frame),
    };
    // a scratch of its own, so the screen's is not grown to print size; dropped with the call
    let scratch: OffscreenCanvas | null = null;
    this.drawLayers(ctx, { ...frame, camera }, env, out, 0, null, () => {
      if (!scratch) scratch = new OffscreenCanvas(out.w, out.h);
      return scratch;
    });
    ctx.restore();
  }

  /**
   * The layers from `first` up, bottom to top. A layer with opacity or a blend mode is drawn
   * whole into the scratch (`device` px, the target's bitmap size) and composited once.
   */
  private drawLayers(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    frame: SceneFrame,
    env: RenderEnv,
    device: { w: number; h: number },
    first: number,
    snapshotAt: number | null,
    scratchCanvas: () => OffscreenCanvas,
  ) {
    for (let index = first; index < frame.layers.length; index++) {
      const l = frame.layers[index];
      if (index === snapshotAt) this.snapshot(ctx, device);
      if (!l.visible) continue;
      const type = getLayerType(l.type);
      const draw = type?.adapter?.drawMain;
      if (typeof draw !== 'function') continue;
      const comp = layerComposite(l.state);
      if (!comp) {
        draw(ctx as CanvasRenderingContext2D, l.state as unknown, env);
        continue;
      }
      // Opacity and blend belong to the layer, not to each shape in it: draw it whole into
      // the scratch buffer, then composite that once.
      const { w, h } = device;
      const scratch = scratchCanvas();
      if (scratch.width !== w || scratch.height !== h) {
        scratch.width = w;
        scratch.height = h;
      }
      const sctx = scratch.getContext('2d');
      if (!sctx) continue;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, w, h);
      sctx.setTransform(ctx.getTransform());
      draw(sctx as unknown as CanvasRenderingContext2D, l.state as unknown, env);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // the paper clip stays in force
      ctx.globalAlpha = comp.opacity;
      ctx.globalCompositeOperation = comp.operation;
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();
    }
  }

  private snapshot(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    device: { w: number; h: number },
  ) {
    const { w, h } = device;
    if (!this.prefix) this.prefix = new OffscreenCanvas(w, h);
    if (this.prefix.width !== w || this.prefix.height !== h) {
      this.prefix.width = w;
      this.prefix.height = h;
    }
    const pctx = this.prefix.getContext('2d');
    if (!pctx) return;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, w, h);
    pctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0);
    this.planner.snapshotTaken();
  }

  destroy() {
    this.prefix = null;
    this.ctx = null;
    this.scratch = null;
  }
}
