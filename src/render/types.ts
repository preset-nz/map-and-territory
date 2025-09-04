export type LayerTypeId = string;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface PaperSpec {
  aspect: 'square' | '4:3' | '16:10';
  color: string;
}

export interface SceneLayer<State = unknown> {
  id: string;
  type: LayerTypeId;
  visible: boolean;
  state: State;
}

export interface SceneFrame {
  size: { w: number; h: number };
  pixelRatio: number;
  paper: PaperSpec;
  camera: Camera;
  layers: SceneLayer[];
}

export interface RenderBackend {
  init(canvas: OffscreenCanvas, pixelRatio: number): void;
  resize(size: { w: number; h: number }, pixelRatio: number): void;
  render(frame: SceneFrame): void;
  destroy(): void;
}

// Worker protocol
export type RenderMessage =
  | { type: 'init'; canvas: OffscreenCanvas; pixelRatio: number }
  | { type: 'resize'; size: { w: number; h: number }; pixelRatio: number }
  | { type: 'render'; frame: SceneFrame }
  | { type: 'destroy' };
