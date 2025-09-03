import type { RenderBackend, SceneFrame } from '@/render/types';
import { createPerlinNoise } from '@/lib/noise';

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
      if (l.type === 'hexnoise') {
        const st = l.state as any;
        const grid = frame.layers.find((x) => x.visible && x.type === 'hexgrid');
        const orientation = (grid?.state as any)?.orientation === 'flat' ? 'flat' : 'pointy';
        const r = Math.max(4, (grid?.state as any)?.size || 16);
        const sqrt3 = Math.sqrt(3);
        // set up noise
        const perlin = createPerlinNoise(st.seed ?? 'seed');
        const freq = Number(st.frequency ?? 0.15);
        const ox = Number(st.offsetX ?? 0);
        const oy = Number(st.offsetY ?? 0);
        const intensity = Math.max(0, Math.min(1, Number(st.intensity ?? 1)));
        const drawHex = (cx: number, cy: number, startAngle: number, q: number, rax: number) => {
          const v = perlin.normalized2D(q * freq + ox, rax * freq + oy);
          const g = Math.floor(v * 255 * intensity);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = startAngle + i * (Math.PI / 3);
            const px = cx + Math.cos(ang) * r;
            const py = cy + Math.sin(ang) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `rgb(${g},${g},${g})`;
          ctx.fill();
        };
        if (orientation === 'flat') {
          const colStep = 1.5 * r;
          const rowStep = sqrt3 * r;
          const cols = Math.ceil(paperW / colStep) + 2;
          const rows = Math.ceil(paperH / rowStep) + 2;
          const centerX = paperW / 2;
          const centerY = paperH / 2;
          const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
          const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
          for (let c = cmin; c <= cmax; c++) {
            const yOffset = (c & 1) ? (rowStep / 2) : 0;
            for (let ri = rmin; ri <= rmax; ri++) {
              const x = c * colStep + centerX;
              const y = ri * rowStep + yOffset + centerY;
              const q = c; const rax = ri; // axial indices aligned to tiling
              drawHex(x, y, 0, q, rax);
            }
          }
        } else {
          const colStep = sqrt3 * r;
          const rowStep = 1.5 * r;
          const cols = Math.ceil(paperW / colStep) + 2;
          const rows = Math.ceil(paperH / rowStep) + 2;
          const centerX = paperW / 2;
          const centerY = paperH / 2;
          const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
          const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
          for (let ri = rmin; ri <= rmax; ri++) {
            const xOffset = (ri & 1) ? (colStep / 2) : 0;
            for (let c = cmin; c <= cmax; c++) {
              const x = c * colStep + xOffset + centerX;
              const y = ri * rowStep + centerY;
              // For pointy layout, axial mapping differs; approximate with r=ri, q=c
              const q = c; const rax = ri;
              drawHex(x, y, -Math.PI / 6, q, rax);
            }
          }
        }
      }
    }
    if (grid) {
      const st = grid.state as any;
      const r = Math.max(4, st.size || 16);
      const stroke = st.color || '#000000';
      const a = st.alpha ?? 1;
      const orientation = st.orientation === 'flat' ? 'flat' : 'pointy';
      const sqrt3 = Math.sqrt(3);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, st.lineWidth ?? 1); // CSS pixel width
      const drawHex = (cx: number, cy: number, startAngle: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = startAngle + i * (Math.PI / 3);
          const px = cx + Math.cos(ang) * r;
          const py = cy + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      };
      if (orientation === 'flat') {
        const colStep = 1.5 * r;
        const rowStep = sqrt3 * r;
        const cols = Math.ceil(paperW / colStep) + 2;
        const rows = Math.ceil(paperH / rowStep) + 2;
        const centerX = paperW / 2;
        const centerY = paperH / 2;
        const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
        const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
        for (let c = cmin; c <= cmax; c++) {
          const yOffset = (c & 1) ? (rowStep / 2) : 0;
          for (let ri = rmin; ri <= rmax; ri++) {
            const x = c * colStep + centerX;
            const y = ri * rowStep + yOffset + centerY;
            drawHex(x, y, 0);
          }
        }
      } else {
        const colStep = sqrt3 * r;
        const rowStep = 1.5 * r;
        const cols = Math.ceil(paperW / colStep) + 2;
        const rows = Math.ceil(paperH / rowStep) + 2;
        const centerX = paperW / 2;
        const centerY = paperH / 2;
        const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
        const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
        for (let ri = rmin; ri <= rmax; ri++) {
          const xOffset = (ri & 1) ? (colStep / 2) : 0;
          for (let c = cmin; c <= cmax; c++) {
            const x = c * colStep + xOffset + centerX;
            const y = ri * rowStep + centerY;
            drawHex(x, y, -Math.PI / 6);
          }
        }
      }
      ctx.restore();
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
