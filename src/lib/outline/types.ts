import type { Axial } from "@/lib/hex";

export type OutlineCornerIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface OutlineCorner {
  hex: Axial;
  corner: OutlineCornerIndex;
}

export interface OutlinePath {
  id: string;
  corners: OutlineCorner[];
  closed: boolean;
}

export interface OutlineState {
  paths: OutlinePath[];
  activePathId?: string | null;
  opacity: number;
  strokeColor: string;
  strokeWidth: number;
  hoverCorner?: OutlineCorner | null;
  strokePattern: "solid" | "dashed" | "dotted";
  roughness: number;
}

export function cornersEqual(
  a: OutlineCorner | null | undefined,
  b: OutlineCorner | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.hex.q === b.hex.q && a.hex.r === b.hex.r && a.corner === b.corner;
}
