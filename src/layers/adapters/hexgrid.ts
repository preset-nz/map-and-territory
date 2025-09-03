import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { registerPropertySchema } from '@/properties/registry';

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
    const r = Math.max(4, size || 16);
    const stroke = color || '#000000';
    const a = alpha ?? 0.25;
    const dpr = env.pixelRatio || 1;
    const hexH = Math.sin(Math.PI / 3) * r * 2; // height of hex
    const colStep = r * 1.5; // x step between columns
    const rowStep = hexH / 2; // y half-step

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1 / dpr;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotation || 0);
    ctx.translate(-w / 2, -h / 2);

    const cols = Math.ceil(w / colStep) + 2;
    const rows = Math.ceil(h / rowStep) + 2;

    const drawHex = (cx: number, cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = Math.PI / 6 + i * (Math.PI / 3);
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    };

    for (let c = -1; c < cols; c++) {
      for (let ri = -1; ri < rows; ri++) {
        const x = c * colStep;
        const y = ri * rowStep * 2 + ((c & 1) ? rowStep : 0);
        drawHex(x, y);
      }
    }
    ctx.restore();
  },
};

export const HexgridType = {
  id: 'hexgrid',
  title: 'Hex Grid',
  defaultState: { size: 24, rotation: 0, color: '#000000', alpha: 1, lineWidth: 1 },
  adapter: HexgridAdapter,
  policy: { canDelete: false, canDuplicate: false, maxInstances: 1 },
} as const;

// Register hexgrid properties schema
registerPropertySchema('layer:hexgrid', {
  groups: [
    {
      id: 'hexgrid',
      title: 'Hex Grid',
      rows: [
        { kind: 'slider', id: 'size', label: 'Hex Size', path: 'size', min: 20, max: 120, step: 1 },
        { kind: 'slider', id: 'lineWidth', label: 'Line Width', path: 'lineWidth', min: 1, max: 8, step: 1 },
        { kind: 'color', id: 'color', label: 'Line Color', path: 'color' },
      ],
    },
  ],
});
