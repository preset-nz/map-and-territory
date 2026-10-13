import { getLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { composeEnv, getSceneAdapter } from '@/plugin/loader';
import { layerComposite } from '@/render/composite';
import { computePaperRect } from '@/render/geometry';
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
      textures: this.textures,
    };
    const envLocal: RenderEnv = {
      ...envBase,
      ...(composeEnv(frame) as Partial<RenderEnv>),
    };

    const plan = this.useCache
      ? this.planner.plan(frame)
      : ({ reuse: 0, snapshotAt: null } as const);
    if (plan.reuse > 0 && this.prefix) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // the paper clip stays in force
      ctx.drawImage(this.prefix, 0, 0);
      ctx.restore();
    } else {
      // Allow scene preRender hook (e.g., background effects). Keep pure; no transforms beyond clip/translate above.
      try {
        scene?.preRender?.(ctx as CanvasRenderingContext2D, frame, envLocal);
      } catch (e) {
        // non-fatal
        console.warn('[render] scene.preRender threw', e);
      }
    }

    const first = this.prefix ? plan.reuse : 0;
    for (let index = first; index < frame.layers.length; index++) {
      const l = frame.layers[index];
      if (index === plan.snapshotAt) this.snapshot(ctx, cw, ch, dpr);
      if (!l.visible) continue;
      const type = getLayerType(l.type);
      const draw = type?.adapter?.drawMain;
      if (typeof draw !== 'function') continue;
      const comp = layerComposite(l.state);
      if (!comp) {
        draw(ctx as CanvasRenderingContext2D, l.state as unknown, envLocal);
        continue;
      }
      // Opacity and blend belong to the layer, not to each shape in it: draw it whole into
      // the scratch buffer, then composite that once.
      const w = Math.max(1, Math.floor(cw * dpr));
      const h = Math.max(1, Math.floor(ch * dpr));
      if (!this.scratch) this.scratch = new OffscreenCanvas(w, h);
      if (this.scratch.width !== w || this.scratch.height !== h) {
        this.scratch.width = w;
        this.scratch.height = h;
      }
      const sctx = this.scratch.getContext('2d');
      if (!sctx) continue;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, w, h);
      sctx.setTransform(ctx.getTransform());
      draw(sctx as unknown as CanvasRenderingContext2D, l.state as unknown, envLocal);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // the paper clip stays in force
      ctx.globalAlpha = comp.opacity;
      ctx.globalCompositeOperation = comp.operation;
      ctx.drawImage(this.scratch, 0, 0);
      ctx.restore();
    }

    // Scene postRender can draw chrome like paper outline
    try {
      scene?.postRender?.(ctx as CanvasRenderingContext2D, frame, envLocal);
    } catch (e) {
      console.warn('[render] scene.postRender threw', e);
    }

    ctx.restore();
  }

  private snapshot(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    cw: number,
    ch: number,
    dpr: number,
  ) {
    const w = Math.max(1, Math.floor(cw * dpr));
    const h = Math.max(1, Math.floor(ch * dpr));
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
