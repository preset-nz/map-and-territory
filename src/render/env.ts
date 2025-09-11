import type { SceneFrame } from "@/render/types";

export function computePaperRect(
  canvasW: number,
  canvasH: number,
  aspect: "square" | "4:3" | "16:10",
) {
  const paddingX = Math.max(12, canvasW * 0.05);
  const paddingY = 12;
  const availW = Math.max(0, canvasW - paddingX * 2);
  const availH = Math.max(0, canvasH - paddingY * 2);
  const [aw, ah] =
    aspect === "square" ? [1, 1] : aspect === "4:3" ? [4, 3] : [16, 10];
  let paperW = availW;
  let paperH = (paperW * ah) / aw;
  if (paperH > availH) {
    paperH = availH;
    paperW = (paperH * aw) / ah;
  }
  const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
  const paperY = paddingY;
  return { x: paperX, y: paperY, w: paperW, h: paperH } as const;
}

export function deriveGridHint(
  frame: SceneFrame,
): { size: number; orientation: "flat" | "pointy" } | undefined {
  const layer = frame.layers.find((l) => l.type === "hexgrid");
  if (!layer) return undefined;
  const st = (layer.state ?? {}) as Record<string, unknown>;
  const size = Math.max(4, Number(st.size ?? 16));
  const orientation = st.orientation === "flat" ? "flat" : "pointy";
  return { size, orientation } as const;
}
