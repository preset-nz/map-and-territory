import type { LayerAdapter, RenderEnv } from '@/layers/types';

export interface HexgridState {
  size: number; // hex radius in px
  rotation: number; // radians
  color: string; // stroke color
  alpha?: number;
}

// Simple pattern cache for performance
const patternCache = new Map<string, CanvasPattern>();

function makePattern(r: number, color: string, alpha: number, dpr: number): CanvasPattern | null {
  const key = `${dpr}:${r}:${color}:${alpha}`;
  const cached = patternCache.get(key);
  if (cached) return cached;
  const off = document.createElement('canvas');
  // Basic pointy-top hex metrics
  const vx = r * 1.5;
  const vy = Math.sin(Math.PI / 3) * r; // half height
  const tileW = Math.max(1, Math.floor(vx * 2));
  const tileH = Math.max(1, Math.floor(vy * 2));
  off.width = Math.floor(tileW * dpr);
  off.height = Math.floor(tileH * dpr);
  const ctx = off.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  // Helper to draw a single hex outline
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

  // Draw a small set that tiles reasonably; seams are acceptable for MVP
  drawHexAt(vx * 0.5, vy); // center-ish
  drawHexAt(0, 0);
  drawHexAt(vx, vy * 2);

  const pattern = ctx.createPattern(off, 'repeat');
  if (pattern) patternCache.set(key, pattern);
  return pattern;
}

export const HexgridAdapter: LayerAdapter<HexgridState> = {
  title: 'Hex Grid',
  drawMain(ctx, state, env: RenderEnv) {
    const { w, h } = env.size;
    const { size, rotation, color, alpha } = state;
    const r = Math.max(6, size || 24);
    const pattern = makePattern(r, color || '#000000', alpha ?? 0.2, env.pixelRatio || 1);
    if (!pattern) return;
    ctx.save();
    // Rotate pattern around paper center
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotation || 0);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },
};

export const HexgridType = {
  id: 'hexgrid',
  title: 'Hex Grid',
  defaultState: { size: 24, rotation: 0, color: '#000000', alpha: 0.2 },
  adapter: HexgridAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;
