import type { LayerAdapter } from "@/layers/types";
import { parseAxialKey, hexPath } from "@/layers/hex-utils";
import { toPoint, corners } from "@/lib/hex/layout";
import type { MapPalette } from "@/palettes/types";
import { resolveTerrainFill } from "@/stores/selectors/palette";

type FreeformRenderMode = "paint" | "texture-fill";

export interface TextureFillSettings {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface FreeformCell {
  terrainId?: string;
  color?: string; // explicit override
}

export interface FreeformState {
  cells: Record<string, FreeformCell>; // key: "q,r"
  opacity: number; // 0..1
  brushTerrainId?: string;
  brushColor?: string; // if set, overrides terrain color when painting new cells
  fillMode?: "auto" | "same-value" | "empty-only";
  renderMode?: FreeformRenderMode;
  textureFill?: TextureFillSettings | null;
  textureFillInvert?: boolean;
}

const textureBitmapCache = new Map<string, ImageBitmap>();
const pendingTextureBitmaps = new Map<string, Promise<ImageBitmap>>();
const MAX_TEXTURE_CACHE = 4;

function disposeBitmap(bitmap: ImageBitmap) {
  if (typeof bitmap.close === "function") {
    try {
      bitmap.close();
    } catch {
      // ignore disposal errors
    }
  }
}

function evictOldestIfNeeded() {
  while (textureBitmapCache.size > MAX_TEXTURE_CACHE) {
    const oldest = textureBitmapCache.keys().next();
    if (oldest.done) break;
    const id = oldest.value;
    const bmp = textureBitmapCache.get(id);
    if (bmp) disposeBitmap(bmp);
    textureBitmapCache.delete(id);
  }
}

function notifyTextureReady() {
  const target = globalThis as {
    __freeformTextureReady?: () => void;
  };
  try {
    target.__freeformTextureReady?.();
  } catch (error) {
    console.warn("[freeform] texture ready notification failed", error);
  }
}

interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
}

function traceHexPath(
  target: PathSink,
  center: { x: number; y: number },
  layout: { size: number; orientation: "pointy" | "flat" },
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

function ensureTextureBitmap(
  settings: TextureFillSettings,
): ImageBitmap | null {
  const cached = textureBitmapCache.get(settings.id);
  if (cached) {
    // touch for simple LRU behaviour
    textureBitmapCache.delete(settings.id);
    textureBitmapCache.set(settings.id, cached);
    return cached;
  }
  if (pendingTextureBitmaps.has(settings.id)) return null;
  if (typeof createImageBitmap !== "function") return null;
  if (typeof fetch !== "function") return null;

  const promise = (async () => {
    const response = await fetch(settings.dataUrl);
    const blob = await response.blob();
    return await createImageBitmap(blob);
  })();
  pendingTextureBitmaps.set(settings.id, promise);
  promise
    .then((bitmap) => {
      pendingTextureBitmaps.delete(settings.id);
      textureBitmapCache.set(settings.id, bitmap);
      evictOldestIfNeeded();
      notifyTextureReady();
    })
    .catch((error) => {
      pendingTextureBitmaps.delete(settings.id);
      console.warn("[freeform] failed to load texture asset", error);
    });
  return null;
}

function colorForCell(
  palette: MapPalette | undefined,
  cell: FreeformCell,
): string {
  if (cell.color) return cell.color;
  return resolveTerrainFill(palette, cell.terrainId);
}

export const FreeformAdapter: LayerAdapter<FreeformState> = {
  title: "Freeform",
  drawMain(ctx, state, env) {
    const size = Math.max(4, env.grid?.size ?? 16);
    const orientation = env.grid?.orientation === "flat" ? "flat" : "pointy";
    const origin = { x: env.size.w / 2, y: env.size.h / 2 } as const;
    const layout = { size, orientation, origin } as const;
    const a = Math.max(0, Math.min(1, Number(state.opacity ?? 1)));

    if ((state.renderMode ?? "paint") === "texture-fill") {
      const settings = state.textureFill;
      const cells = Object.entries(state.cells || {});
      const invert = Boolean(state.textureFillInvert);
      if (!settings) return;
      if (!invert && cells.length === 0) return;
      const bitmap = ensureTextureBitmap(settings);
      if (!bitmap) return;
      const width = env.size?.w ?? bitmap.width;
      const height = env.size?.h ?? bitmap.height;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = "source-over";
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
        ctx.clip("evenodd");
      } else {
        ctx.clip();
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = a;
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
    const lastKey = Object.keys(state.cells || {}).slice(-1)[0] || "-";
    const mode = state.renderMode ?? "paint";
    const textureId = state.textureFill?.id ?? "-";
    const invert = state.textureFillInvert ? 1 : 0;
    return `freeform:${count}:${state.opacity ?? 1}:${lastKey}:${mode}:${textureId}:${invert}`;
  },
};

export const FreeformType = {
  id: "freeform",
  title: "Freeform",
  defaultState: {
    cells: {},
    opacity: 1,
    brushTerrainId: undefined,
    brushColor: undefined,
    fillMode: "auto",
    renderMode: "paint",
    textureFill: null,
    textureFillInvert: false,
  },
  adapter: FreeformAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;

// Properties schema is registered by the freeform plugin during activation.
