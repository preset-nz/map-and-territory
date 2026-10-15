import { hexPath, parseAxialKey } from '@/layers/hex-utils';
import type { LayerAdapter } from '@/layers/types';
import { corners, toPoint } from '@/lib/hex/layout';
import { resolveTerrainFill } from '@/palettes/terrain-fill';
import type { MapPalette } from '@/palettes/types';

type FreeformRenderMode = 'paint' | 'texture-fill';
type TextureTilingMode = 'stretch' | 'fit' | 'repeat';
type TextureOverlayMode = 'normal' | 'overlay' | 'screen' | 'multiply';

export interface FreeformCell {
  terrainId?: string;
  color?: string; // explicit override
}

export interface FreeformState {
  cells: Record<string, FreeformCell>; // key: "q,r"
  opacity: number; // 0..1
  brushTerrainId?: string;
  brushColor?: string; // if set, overrides terrain color when painting new cells
  fillMode?: 'auto' | 'same-value' | 'empty-only';
  renderMode?: FreeformRenderMode;
  /** The image's path as written (epic 18); the bitmap arrives through `env.textures`. */
  texture?: string;
  textureFillInvert?: boolean;
  textureOffsetX?: number;
  textureOffsetY?: number;
  textureScale?: number;
  textureRotation?: number; // degrees
  textureTiling?: TextureTilingMode;
  textureOverlayMode?: TextureOverlayMode;
}

interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

function traceHexPath(
  target: PathSink,
  center: { x: number; y: number },
  layout: { size: number; orientation: 'pointy' | 'flat' },
) {
  const pts = corners(center, {
    size: layout.size,
    orientation: layout.orientation,
    origin: { x: 0, y: 0 },
  });
  if (!pts.length) return;
  target.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    target.lineTo(pts[i]!.x, pts[i]!.y);
  }
  target.closePath();
}

function colorForCell(palette: MapPalette | undefined, cell: FreeformCell): string {
  if (cell.color) return cell.color;
  return resolveTerrainFill(palette, cell.terrainId);
}

export const FreeformAdapter: LayerAdapter<FreeformState> = {
  title: 'Freeform',
  drawMain(ctx, state, env) {
    const size = Math.max(4, env.grid?.size ?? 16);
    const orientation = env.grid?.orientation === 'flat' ? 'flat' : 'pointy';
    const origin = { x: env.size.w / 2, y: env.size.h / 2 } as const;
    const layout = { size, orientation, origin } as const;

    if ((state.renderMode ?? 'paint') === 'texture-fill') {
      const cells = Object.entries(state.cells || {});
      const invert = Boolean(state.textureFillInvert);
      if (!state.texture) return;
      if (!invert && cells.length === 0) return;
      const bitmap = env.textures?.get(state.texture) ?? null;
      if (!bitmap) return;
      const width = env.size?.w ?? bitmap.width;
      const height = env.size?.h ?? bitmap.height;
      const offsetX = Number.isFinite(state.textureOffsetX) ? Number(state.textureOffsetX) : 0;
      const offsetY = Number.isFinite(state.textureOffsetY) ? Number(state.textureOffsetY) : 0;
      const scaleRaw = Number.isFinite(state.textureScale) ? Number(state.textureScale) : 1;
      const scale = Math.max(0.05, Math.min(8, scaleRaw || 1));
      const rotationDeg = Number.isFinite(state.textureRotation)
        ? Number(state.textureRotation)
        : 0;
      const rotation = (rotationDeg * Math.PI) / 180;
      const tiling: TextureTilingMode =
        state.textureTiling === 'fit' || state.textureTiling === 'repeat'
          ? state.textureTiling
          : 'stretch';
      ctx.save();
      const overlayMode = state.textureOverlayMode ?? 'normal';
      const compositeOperation = overlayMode === 'normal' ? 'source-over' : overlayMode;
      ctx.beginPath();
      if (invert) {
        ctx.rect(0, 0, width, height);
      }
      for (const [key] of cells) {
        const axial = parseAxialKey(key);
        const center = toPoint(axial, {
          size,
          origin,
          orientation,
        } as const);
        traceHexPath(ctx, center, layout);
      }
      if (invert) {
        ctx.clip('evenodd');
      } else {
        ctx.clip();
      }

      if (!invert && overlayMode !== 'normal') {
        for (const [key, cell] of cells) {
          ctx.beginPath();
          const axial = parseAxialKey(key);
          const center = toPoint(axial, {
            size,
            origin,
            orientation,
          } as const);
          traceHexPath(ctx, center, layout);
          ctx.fillStyle = colorForCell(env.palette, cell);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation =
        compositeOperation as CanvasRenderingContext2D['globalCompositeOperation'];
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.translate(offsetX, offsetY);

      if (tiling === 'repeat') {
        const pattern = ctx.createPattern(bitmap as CanvasImageSource, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          const span = Math.max(width, height) * 2;
          ctx.fillRect(-span, -span, span * 2, span * 2);
        } else {
          ctx.drawImage(bitmap, -width / 2, -height / 2, width, height);
        }
      } else {
        let drawW = width;
        let drawH = height;
        if (tiling === 'fit') {
          const ratio = Math.min(width / bitmap.width, height / bitmap.height);
          drawW = bitmap.width * ratio;
          drawH = bitmap.height * ratio;
        }
        ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
      }

      ctx.restore();
      ctx.restore();
      return;
    }

    ctx.save();
    for (const [key, cell] of Object.entries(state.cells || {})) {
      const axial = parseAxialKey(key);
      // Convert axial to pixel center using shared helper (matches grid)
      const center = toPoint(axial, { size, origin, orientation } as const);
      hexPath(ctx, center, layout);
      ctx.fillStyle = colorForCell(env.palette, cell);
      ctx.fill();
    }
    ctx.restore();
  },
  getInvalidationKey(state) {
    const count = Object.keys(state.cells || {}).length;
    // lightweight key: count + opacity + last key for cheap change detection
    const lastKey = Object.keys(state.cells || {}).slice(-1)[0] || '-';
    const mode = state.renderMode ?? 'paint';
    const textureId = state.texture ?? '-';
    const invert = state.textureFillInvert ? 1 : 0;
    const offsetX = Number(state.textureOffsetX ?? 0).toFixed(2);
    const offsetY = Number(state.textureOffsetY ?? 0).toFixed(2);
    const scale = Number(state.textureScale ?? 1).toFixed(3);
    const rotation = Number(state.textureRotation ?? 0).toFixed(2);
    const tiling = state.textureTiling ?? 'stretch';
    const overlay = state.textureOverlayMode ?? 'normal';
    return `freeform:${count}:${state.opacity ?? 1}:${lastKey}:${mode}:${overlay}:${textureId}:${invert}:${offsetX}:${offsetY}:${scale}:${rotation}:${tiling}`;
  },
};

export const FreeformType = {
  id: 'freeform',
  title: 'Freeform',
  defaultState: {
    cells: {},
    opacity: 1,
    brushTerrainId: undefined,
    brushColor: undefined,
    fillMode: 'auto',
    renderMode: 'paint',
    texture: undefined,
    textureFillInvert: false,
    textureOffsetX: 0,
    textureOffsetY: 0,
    textureScale: 1,
    textureRotation: 0,
    textureTiling: 'stretch',
    textureOverlayMode: 'normal',
  },
  adapter: FreeformAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;
