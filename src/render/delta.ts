// Delta frames: the main thread posts a layer's state only when its state object changed,
// and nothing at all when the frame would draw the same pixels. The frame builder keeps a
// layer's `state` object while its rows are unchanged, so identity is the change test.
import type { MapPalette } from '@/palettes/types';
import type { Camera, PaperSpec, SceneFrame, SceneLayer, WireFrame, WireLayer } from './types';

const sameCamera = (a: Camera, b: Camera) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;
const samePaper = (a: PaperSpec, b: PaperSpec) => a.aspect === b.aspect && a.color === b.color;

export interface DeltaEncoder {
  /** The wire frame for `frame`, or null when it would draw what the last one drew. */
  encode(frame: SceneFrame): WireFrame | null;
}

export function createDeltaEncoder(): DeltaEncoder {
  let states = new Map<string, unknown>();
  let palette: MapPalette | undefined;
  let last: SceneFrame | null = null;
  let havePalette = false;
  return {
    encode(frame) {
      const next = new Map<string, unknown>();
      let changed =
        !last ||
        last.size.w !== frame.size.w ||
        last.size.h !== frame.size.h ||
        last.pixelRatio !== frame.pixelRatio ||
        !samePaper(last.paper, frame.paper) ||
        !sameCamera(last.camera, frame.camera) ||
        last.layers.length !== frame.layers.length;
      const layers: WireLayer[] = frame.layers.map((l, i) => {
        next.set(l.id, l.state);
        const wire: WireLayer = { id: l.id, type: l.type, visible: l.visible };
        if (!states.has(l.id) || states.get(l.id) !== l.state) {
          wire.state = l.state;
          changed = true;
        }
        const was = last?.layers[i];
        if (!was || was.id !== l.id || was.type !== l.type || was.visible !== l.visible) {
          changed = true;
        }
        return wire;
      });
      const wire: WireFrame = {
        size: frame.size,
        pixelRatio: frame.pixelRatio,
        paper: frame.paper,
        camera: frame.camera,
        layers,
      };
      if (!havePalette || palette !== frame.palette) {
        wire.palette = frame.palette ?? null;
        palette = frame.palette;
        havePalette = true;
        changed = true;
      }
      if (!changed) return null;
      states = next;
      last = frame;
      return wire;
    },
  };
}

export interface DeltaDecoder {
  /** Fold a wire frame into the mirror and return the whole frame. */
  decode(wire: WireFrame): SceneFrame;
}

export function createDeltaDecoder(): DeltaDecoder {
  let states = new Map<string, unknown>();
  let palette: MapPalette | undefined;
  return {
    decode(wire) {
      const next = new Map<string, unknown>();
      const layers: SceneLayer[] = wire.layers.map((l) => {
        const state = 'state' in l ? l.state : states.get(l.id);
        next.set(l.id, state);
        return { id: l.id, type: l.type, visible: l.visible, state };
      });
      states = next; // ids that disappeared are dropped
      if (wire.palette !== undefined) palette = wire.palette ?? undefined;
      return {
        size: wire.size,
        pixelRatio: wire.pixelRatio,
        paper: wire.paper,
        camera: wire.camera,
        layers,
        palette,
      };
    },
  };
}
