export type LayerTypeId = string;

import type { MapPalette } from '@/palettes/types';

export interface RenderEnv {
  zoom: number;
  /** The display's; it sizes backing stores. No adapter scales a drawing by it. */
  pixelRatio: number;
  /**
   * Device px per paper px: pixel ratio × fit × zoom on screen, output over paper size in an
   * export. What a line one device pixel wide (a hairline) is divided by.
   */
  deviceScale: number;
  /** The paper in paper px (epic 07 story 6): what adapters draw in, from its aspect alone. */
  size: { w: number; h: number };
  /** Where the paper sits in the canvas, in CSS px; no adapter reads it. */
  paperRect: { x: number; y: number; w: number; h: number };
  camera: { x: number; y: number; zoom: number };
  // Optional hints derived by render host (e.g., for layers that coordinate with grid)
  grid?: { size: number; orientation: 'pointy' | 'flat' };
  palette?: MapPalette;
  /** Decoded images by the path a layer refers to; the host loads them (epic 18). */
  textures?: ReadonlyMap<string, ImageBitmap>;
}

export interface LayerAdapter<State = unknown> {
  title: string;
  // Draw into main viewport canvas
  drawMain?: (ctx: CanvasRenderingContext2D, state: State, env: RenderEnv) => void;
  // Optional scene/overview rendering
  drawSceneView?: (ctx: CanvasRenderingContext2D, state: State, env: RenderEnv) => void;
  // Optional hit testing for selection tools
  hitTest?: (pt: { x: number; y: number }, state: State, env: RenderEnv) => boolean;
  // Invalidation key — used by host to detect visual-impacting changes
  // Required: adapters must return a stable string that changes only when visuals change.
  getInvalidationKey: (state: State) => string;
  // Optional (de)serialization
  serialize?: (state: State) => unknown;
  deserialize?: (raw: unknown) => State;
}

export interface LayerPolicy {
  canDelete?: boolean; // default true
  canDuplicate?: boolean; // default true
  maxInstances?: number; // default unlimited
}

export interface LayerType<State = unknown> {
  id: LayerTypeId;
  title: string;
  defaultState: State;
  adapter: LayerAdapter<State>;
  policy?: LayerPolicy;
}

export interface LayerInstance<State = unknown> {
  id: string;
  type: LayerTypeId;
  name?: string;
  visible: boolean;
  locked?: boolean;
  state: State;
}
