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

import type { MapPalette } from '@/palettes/types';
import type { FacesReport } from '@/render/faces';

export interface SceneFrame {
  size: { w: number; h: number };
  pixelRatio: number;
  paper: PaperSpec;
  camera: Camera;
  layers: SceneLayer[];
  palette?: MapPalette;
}

/** A layer on the wire: `state` is present only when it differs from the last one posted. */
export interface WireLayer {
  id: string;
  type: string;
  visible: boolean;
  state?: unknown;
}

/** `palette`: absent means unchanged, `null` means none. */
export interface WireFrame {
  size: { w: number; h: number };
  pixelRatio: number;
  paper: PaperSpec;
  camera: Camera;
  layers: WireLayer[];
  palette?: MapPalette | null;
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
  | { type: 'inited' }
  /** Once, after init: which faces the worker loaded (epic 23 story 1's WKWebView probe). */
  | ({ type: 'faces' } & FacesReport)
  | { type: 'resize'; size: { w: number; h: number }; pixelRatio: number }
  | { type: 'render'; frame: WireFrame }
  | { type: 'texture'; id: string; bitmap: ImageBitmap }
  | ExportMessage
  | { type: 'exported'; id: number; png: ArrayBuffer }
  | { type: 'export-error'; id: number; message: string }
  | { type: 'destroy' };

/**
 * The map at print size (epic 07 story 3). `frame` is whole, not a delta: it stays out of the
 * screen's delta stream. `logical` is paper space in CSS px, `out` the PNG's size in pixels.
 */
export interface ExportMessage {
  type: 'export';
  id: number;
  frame: SceneFrame;
  logical: { w: number; h: number };
  out: { w: number; h: number };
}
