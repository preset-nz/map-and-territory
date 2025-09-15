// Hex Lib API Spec (TypeScript)
// Orientation and layout only; rotation removed by design.

export type Orientation = 'pointy' | 'flat';

export interface Layout {
orientation: Orientation;
size: number; // hex radius in pixels
origin: { x: number; y: number }; // pixel origin of axial (0,0)
}

export interface Axial { q: number; r: number }
export interface Cube { x: number; y: number; z: number }

export interface Point { x: number; y: number }

export interface HexAPI {
fromPoint(point: Point, layout: Layout): Axial | null;
toPoint(hex: Axial, layout: Layout): Point;

axialToCube(a: Axial): Cube;
cubeToAxial(c: Cube): Axial;
round(frac: Cube): Axial;

distance(a: Axial, b: Axial): number;
neighbors(h: Axial): Axial[];
diagonals(h: Axial): Axial[];
ring(center: Axial, radius: number): Axial[];
range(center: Axial, radius: number): Axial[];
line(a: Axial, b: Axial): Axial[];

axialToOffset(
a: Axial,
orientation: Orientation,
variant: 'odd-r' | 'even-r' | 'odd-q' | 'even-q'
): { col: number; row: number };

offsetToAxial(
o: { col: number; row: number },
orientation: Orientation,
variant: 'odd-r' | 'even-r' | 'odd-q' | 'even-q'
): Axial;
}
