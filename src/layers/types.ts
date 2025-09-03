export type LayerTypeId = string;

export interface RenderEnv {
  zoom: number;
  pixelRatio: number;
  size: { w: number; h: number };
  paperRect: { x: number; y: number; w: number; h: number };
  camera: { x: number; y: number; zoom: number };
}

export interface LayerAdapter<State = unknown> {
  title: string;
  // Draw into main viewport canvas
  drawMain?: (ctx: CanvasRenderingContext2D, state: State, env: RenderEnv) => void;
  // Optional scene/overview rendering
  drawSceneView?: (ctx: CanvasRenderingContext2D, state: State, env: RenderEnv) => void;
  // Optional hit testing for selection tools
  hitTest?: (pt: { x: number; y: number }, state: State, env: RenderEnv) => boolean;
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
