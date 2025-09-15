// Hex library types and orientation/layout definitions

export type Orientation = "pointy" | "flat";

export interface Layout {
  orientation: Orientation;
  size: number; // hex radius in pixels
  origin: { x: number; y: number }; // pixel coords corresponding to axial (0,0)
}

export interface Axial {
  q: number;
  r: number;
}
export interface Cube {
  x: number;
  y: number;
  z: number;
}
export interface Point {
  x: number;
  y: number;
}
