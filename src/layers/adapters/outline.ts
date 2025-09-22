import type { LayerAdapter, RenderEnv } from "@/layers/types";
import type { Layout, Point } from "@/lib/hex";
import type {
  OutlineState,
  OutlinePath,
  OutlineCorner,
} from "@/lib/outline/types";
import { interpolateCorners, cornerPoint } from "@/lib/outline/geometry";

function applyPattern(
  ctx: CanvasRenderingContext2D,
  pattern: OutlineState["strokePattern"],
) {
  switch (pattern) {
    case "dashed":
      ctx.setLineDash([12, 8]);
      break;
    case "dotted":
      ctx.setLineDash([2, 6]);
      break;
    default:
      ctx.setLineDash([]);
      break;
  }
}

function hashCorner(corner: OutlineCorner): number {
  const base =
    corner.hex.q * 73856093 +
    corner.hex.r * 19349663 +
    corner.corner * 83492791;
  const sinVal = Math.sin(base) * 43758.5453;
  return sinVal - Math.floor(sinVal);
}

function jitterPoint(
  point: Point,
  corner: OutlineCorner,
  magnitude: number,
): Point {
  if (magnitude <= 0) return point;
  const rnd = hashCorner(corner);
  const angle = rnd * Math.PI * 2;
  const radius = rnd * magnitude;
  return {
    x: point.x + Math.cos(angle) * radius,
    y: point.y + Math.sin(angle) * radius,
  };
}

function drawWithRoughness(
  ctx: CanvasRenderingContext2D,
  corners: OutlineCorner[],
  layout: Layout,
  roughness: number,
  includeFirst = false,
) {
  const magnitude = Math.max(0, Math.min(1, roughness)) * (layout.size * 0.2);
  const startIndex = includeFirst ? 0 : 1;
  for (let i = startIndex; i < corners.length; i++) {
    const corner = corners[i]!;
    const base = cornerPoint(corner, layout);
    const pt = magnitude > 0 ? jitterPoint(base, corner, magnitude) : base;
    ctx.lineTo(pt.x, pt.y);
  }
}

function buildLayout(env: RenderEnv): Layout {
  const size = Math.max(4, env.grid?.size ?? 16);
  const orientation = env.grid?.orientation === "flat" ? "flat" : "pointy";
  const origin = { x: env.size.w / 2, y: env.size.h / 2 };
  return { size, orientation, origin };
}

function pathKey(path: OutlinePath): string {
  const last = path.corners[path.corners.length - 1];
  const lastKey = last ? `${last.hex.q},${last.hex.r},${last.corner}` : "-";
  return `${path.id}:${path.corners.length}:${path.closed ? 1 : 0}:${lastKey}`;
}

export const OutlineAdapter: LayerAdapter<OutlineState> = {
  title: "Outlines",
  drawMain(ctx, state, env) {
    if (!state.paths.length) return;
    const layout = buildLayout(env);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, Number(state.opacity ?? 1)));
    ctx.strokeStyle = state.strokeColor || "#ffffff";
    ctx.lineWidth = Math.max(0.5, Number(state.strokeWidth ?? 4));
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    applyPattern(ctx, state.strokePattern ?? "solid");

    for (const path of state.paths) {
      if (path.corners.length < 2) continue;
      ctx.beginPath();
      const firstPoint = cornerPoint(path.corners[0]!, layout);
      const start = jitterPoint(
        firstPoint,
        path.corners[0]!,
        Math.max(0, Math.min(1, state.roughness ?? 0)) * (layout.size * 0.2),
      );
      ctx.moveTo(start.x, start.y);
      drawWithRoughness(ctx, path.corners, layout, state.roughness ?? 0);
      if (path.closed) ctx.closePath();
      ctx.stroke();
    }

    const activePath = state.activePathId
      ? state.paths.find((p) => p.id === state.activePathId)
      : null;
    const lastCorner = activePath?.corners[activePath.corners.length - 1];
    if (activePath && lastCorner && state.hoverCorner) {
      const steps = interpolateCorners(lastCorner, state.hoverCorner, layout);
      if (steps.length) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = state.strokeColor || "#ffffff";
        ctx.lineWidth = Math.max(0.5, Number(state.strokeWidth ?? 4));
        const previewCorners = [lastCorner, ...steps];
        const startPreview = jitterPoint(
          cornerPoint(lastCorner, layout),
          lastCorner,
          Math.max(0, Math.min(1, state.roughness ?? 0)) * (layout.size * 0.2),
        );
        ctx.moveTo(startPreview.x, startPreview.y);
        drawWithRoughness(
          ctx,
          previewCorners,
          layout,
          state.roughness ?? 0,
          false,
        );
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.setLineDash([]);
  },
  getInvalidationKey(state) {
    const fragments = state.paths.map(pathKey).join("|");
    const hover = state.hoverCorner
      ? `${state.hoverCorner.hex.q},${state.hoverCorner.hex.r},${state.hoverCorner.corner}`
      : "-";
    return `outline:${state.paths.length}:${state.opacity}:${state.strokeColor}:${state.strokeWidth}:${state.strokePattern ?? "solid"}:${state.roughness ?? 0}:${fragments}:${state.activePathId ?? "-"}:${hover}`;
  },
};

export const OutlineType = {
  id: "outline",
  title: "Hex Outlines",
  defaultState: {
    paths: [],
    activePathId: null,
    opacity: 1,
    strokeColor: "#f8f5e5",
    strokeWidth: 4,
    hoverCorner: null,
    strokePattern: "solid",
    roughness: 0,
  } satisfies OutlineState,
  adapter: OutlineAdapter,
  policy: { canDelete: true, canDuplicate: true },
} as const;
