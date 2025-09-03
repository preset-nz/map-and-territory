import type { LayerAdapter, RenderEnv } from '@/layers/types';
import { registerPropertySchema } from '@/properties/registry';

export type HexOrientation = 'pointy' | 'flat';

export interface HexgridState {
  size: number; // hex radius in px
  orientation: HexOrientation; // 'pointy' | 'flat'
  color: string; // stroke color
  alpha?: number;
  lineWidth?: number;
  origin?: { x: number; y: number }; // future use
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

  // Helper to draw a single flat-top hex outline (for tiny pattern fill only)
  const drawHexAt = (x: number, y: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = 0 + i * (Math.PI / 3);
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
    const { size, orientation, color, alpha, lineWidth } = state;
    const r = Math.max(4, size || 16);
    const stroke = color || '#000000';
    const a = alpha ?? 0.25;
    const dpr = env.pixelRatio || 1;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, lineWidth ?? 1) / dpr;
    // Orientation-specific tiling based on Red Blob Games
    const sqrt3 = Math.sqrt(3);
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
      const cols = Math.ceil(w / colStep) + 2;
      const rows = Math.ceil(h / rowStep) + 2;
      const centerX = w / 2;
      const centerY = h / 2;
      const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
      const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
      for (let c = cmin; c <= cmax; c++) {
        const yOffset = (c & 1) ? (rowStep / 2) : 0;
        for (let rr = rmin; rr <= rmax; rr++) {
          const x = c * colStep + centerX;
          const y = rr * rowStep + yOffset + centerY;
          drawHex(x, y, 0); // flat-top starts at 0 rad
        }
      }
    } else {
      // pointy
      const colStep = sqrt3 * r;            // horizontal distance between columns
      const rowStep = 1.5 * r;         // vertical distance between rows
      const cols = Math.ceil(w / colStep) + 2;
      const rows = Math.ceil(h / rowStep) + 2;
      const centerX = w / 2;
      const centerY = h / 2;
      const rmin = -Math.ceil(rows / 2), rmax = Math.ceil(rows / 2);
      const cmin = -Math.ceil(cols / 2), cmax = Math.ceil(cols / 2);
      for (let rr = rmin; rr <= rmax; rr++) {
        const xOffset = (rr & 1) ? (colStep / 2) : 0;
        for (let c = cmin; c <= cmax; c++) {
          const x = c * colStep + xOffset + centerX;
          const y = rr * rowStep + centerY;
          drawHex(x, y, -Math.PI / 6); // pointy-top starts at -30°
        }
      }
    }
    ctx.restore();
  },
  getInvalidationKey(state) {
    const s = state;
    return `hexgrid:${s.size}:${s.orientation}:${s.color}:${s.alpha ?? 1}:${s.lineWidth ?? 1}`;
  },
};

export const HexgridType = {
  id: 'hexgrid',
  title: 'Hex Grid',
  defaultState: { size: 24, orientation: 'pointy', color: '#000000', alpha: 1, lineWidth: 1, origin: { x: 0, y: 0 } },
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
        { kind: 'select', id: 'orientation', label: 'Orientation', path: 'orientation', options: [
          { value: 'pointy', label: 'Pointy Top' },
          { value: 'flat', label: 'Flat Top' },
        ] },
        { kind: 'slider', id: 'size', label: 'Hex Size', path: 'size', min: 8, max: 120, step: 1 },
        { kind: 'slider', id: 'lineWidth', label: 'Line Width', path: 'lineWidth', min: 1, max: 8, step: 1 },
        { kind: 'color', id: 'color', label: 'Line Color', path: 'color' },
      ],
    },
  ],
});
