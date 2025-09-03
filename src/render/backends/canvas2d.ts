import type { RenderBackend, SceneFrame } from '@/render/types';

function parseAspect(aspect: 'square' | '4:3' | '16:10'): { aw: number; ah: number } {
  switch (aspect) {
    case 'square': return { aw: 1, ah: 1 };
    case '4:3': return { aw: 4, ah: 3 };
    case '16:10':
    default: return { aw: 16, ah: 10 };
  }
}

export class Canvas2DBackend implements RenderBackend {
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private pixelRatio = 1;
  private canvasW = 0;
  private canvasH = 0;

  init(canvas: OffscreenCanvas, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    this.ctx = canvas.getContext('2d');
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    this.pixelRatio = Math.max(1, pixelRatio || 1);
    // Note: The OffscreenCanvas is already resized by the host; nothing to do here.
    this.canvasW = size.w;
    this.canvasH = size.h;
  }

  // Simple pattern cache for hexgrid
  private patternCache = new Map<string, CanvasPattern>();

  private makeHexPattern(r: number, color: string, alpha: number, dpr: number): CanvasPattern | null {
    const key = `${dpr}:${r}:${color}:${alpha}`;
    const cached = this.patternCache.get(key);
    if (cached) return cached;
    const off = new OffscreenCanvas(Math.max(1, Math.floor(r * 3 * dpr)), Math.max(1, Math.floor(r * 2 * dpr)));
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    const vx = r * 1.5;
    const vy = Math.sin(Math.PI / 3) * r;
    const drawHexAt = (x: number, y: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * (Math.PI / 3);
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    };
    drawHexAt(vx * 0.5, vy);
    drawHexAt(0, 0);
    drawHexAt(vx, vy * 2);
    const pattern = ctx.createPattern(off as any, 'repeat');
    if (pattern) this.patternCache.set(key, pattern);
    return pattern;
  }

  render(frame: SceneFrame) {
    const ctx = this.ctx; if (!ctx) return;
    const { w: cw, h: ch } = frame.size;
    const dpr = frame.pixelRatio || 1;
    // Clear in device pixels with identity transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Math.floor(cw * dpr), Math.floor(ch * dpr));
    // Now draw in CSS pixels by applying dpr transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute paperRect: fill width with left/right/top spacing, top-aligned; ensure it fits height
    const paddingX = Math.max(12, cw * 0.05);
    const paddingY = 12;
    const availW = Math.max(0, cw - paddingX * 2);
    const availH = Math.max(0, ch - paddingY * 2);
    const { aw, ah } = parseAspect(frame.paper.aspect);
    let paperW = availW;
    let paperH = (paperW * ah) / aw;
    if (paperH > availH) { // If too tall, fit height instead
      paperH = availH;
      paperW = (paperH * aw) / ah;
    }
    const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
    const paperY = paddingY; // top-aligned

    // Draw paper fill (screen space)
    ctx.save();
    ctx.fillStyle = frame.paper.color || '#ffffff';
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

    // Draw non-paper layers; grid last
    const nonGrid = frame.layers.filter((l) => l.visible && l.type !== 'paper' && l.type !== 'hexgrid');
    const grid = frame.layers.find((l) => l.visible && l.type === 'hexgrid');
    for (const l of nonGrid) {
      if (!l.visible || l.type === 'paper') continue;
      if (l.type === 'hexgrid') {
        const st = l.state as any;
        const r = Math.max(6, st.size || 24);
        const color = st.color || '#000000';
        const alpha = st.alpha ?? 0.2;
        const rot = st.rotation || 0;
        const pattern = this.makeHexPattern(r, color, alpha, frame.pixelRatio || 1);
        if (pattern) {
          ctx.save();
          ctx.translate(paperW / 2, paperH / 2);
          ctx.rotate(rot);
          ctx.translate(-paperW / 2, -paperH / 2);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, paperW, paperH);
          ctx.restore();
        }
      }
      // Other layer types can be added here or drawn via future adapter bridge
    }
    if (grid) {
      const st = grid.state as any;
      const r = Math.max(6, st.size || 24);
      const color = st.color || '#000000';
      const alpha = st.alpha ?? 0.2;
      const rot = st.rotation || 0;
      const pattern = this.makeHexPattern(r, color, alpha, frame.pixelRatio || 1);
      if (pattern) {
        ctx.save();
        ctx.translate(paperW / 2, paperH / 2);
        ctx.rotate(rot);
        ctx.translate(-paperW / 2, -paperH / 2);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, paperW, paperH);
        ctx.restore();
      }
    }

    // Draw outline on top for emphasis
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 / dpr; // ~3px in CSS pixels
    ctx.strokeRect(paperX + ctx.lineWidth / 2, paperY + ctx.lineWidth / 2, paperW - ctx.lineWidth, paperH - ctx.lineWidth);
    ctx.restore();

    ctx.restore();
  }

  destroy() {
    this.ctx = null;
  }
}
