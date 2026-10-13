/// <reference lib="webworker" />

import { FreeformType } from '@/layers/adapters/freeform-hex';
import { HexNoiseType } from '@/layers/adapters/hex-noise';
import { HexgridType } from '@/layers/adapters/hexgrid';
import { OutlineType } from '@/layers/adapters/outline';
import { PaperType } from '@/layers/adapters/paper';
import { registerLayerType } from '@/layers/registry';
import bootstrapPlugins from '@/plugin/bootstrap';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import { createDeltaDecoder } from '@/render/delta';
import type { RenderMessage, SceneFrame } from '@/render/types';

let backend: Canvas2DBackend | null = null;
let canvasRef: OffscreenCanvas | null = null;
let lastFrame: SceneFrame | null = null;
const decoder = createDeltaDecoder();
// the newest frame not yet drawn: a burst of pointer moves draws once
let pending: SceneFrame | null = null;
let scheduled = false;

const workerGlobal = globalThis as unknown as {
  __freeformTextureReady?: () => void;
};

workerGlobal.__freeformTextureReady = () => {
  if (!backend || !lastFrame) return;
  try {
    backend.dropCache(); // the layer's pixels changed, its state did not
    backend.render(lastFrame);
  } catch (error) {
    console.warn('[worker] re-render after texture ready failed', error);
  }
};

async function handleInit(msg: Extract<RenderMessage, { type: 'init' }>) {
  // Load plugins inside the worker to register layer adapters and render SPI.
  // Rendering will gracefully skip unknown layers if bootstrapping fails.
  try {
    await bootstrapPlugins();
  } catch (e) {
    console.error('[worker] plugin bootstrap failed:', e);
    // Continue; renderer will simply skip unknown layers
  }
  // Always ensure core layer types are registered in the worker even if plugins failed
  try {
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    registerLayerType(HexNoiseType);
    registerLayerType(FreeformType);
    registerLayerType(OutlineType);
  } catch {
    // non-fatal, ignore duplicate registration errors
  }
  backend = new Canvas2DBackend();
  canvasRef = msg.canvas;

  // Ensure the OffscreenCanvas starts with clean, minimal dimensions
  if (canvasRef) {
    canvasRef.width = 1;
    canvasRef.height = 1;
  }

  backend.init(msg.canvas, msg.pixelRatio);
  // Acknowledge initialization to the main thread
  (self as unknown as { postMessage: (m: RenderMessage) => void }).postMessage({
    type: 'inited',
  });
}

function handleResize(msg: Extract<RenderMessage, { type: 'resize' }>) {
  if (canvasRef) {
    // Resize bitmap to device pixels
    canvasRef.width = Math.max(1, Math.floor(msg.size.w * (msg.pixelRatio || 1)));
    canvasRef.height = Math.max(1, Math.floor(msg.size.h * (msg.pixelRatio || 1)));
  }
  backend?.resize(msg.size, msg.pixelRatio);
}

// Build with VITE_RENDER_PARITY=1: every frame is also drawn with no cache, on a canvas of its
// own, and compared byte for byte with the cached one.
const PARITY = import.meta.env.VITE_RENDER_PARITY === '1';
let reference: Canvas2DBackend | null = null;
let referenceCanvas: OffscreenCanvas | null = null;

function checkParity(frame: SceneFrame) {
  if (!canvasRef) return;
  const w = canvasRef.width;
  const h = canvasRef.height;
  if (!reference || !referenceCanvas) {
    referenceCanvas = new OffscreenCanvas(w, h);
    reference = new Canvas2DBackend();
    reference.useCache = false;
    reference.init(referenceCanvas, frame.pixelRatio);
  }
  if (referenceCanvas.width !== w || referenceCanvas.height !== h) {
    referenceCanvas.width = w;
    referenceCanvas.height = h;
  }
  reference.render(frame);
  const a = canvasRef.getContext('2d')?.getImageData(0, 0, w, h).data;
  const b = referenceCanvas.getContext('2d')?.getImageData(0, 0, w, h).data;
  if (!a || !b) return;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      console.error('[render] prefix cache differs from a full render at byte', i);
      return;
    }
  }
}

function drawPending() {
  scheduled = false;
  const frame = pending;
  pending = null;
  if (!frame) return;
  // Defensive: ensure the bitmap matches incoming frame size × dpr
  const dpr = frame.pixelRatio || 1;
  const targetW = Math.max(1, Math.floor(frame.size.w * dpr));
  const targetH = Math.max(1, Math.floor(frame.size.h * dpr));
  if (canvasRef && (canvasRef.width !== targetW || canvasRef.height !== targetH)) {
    canvasRef.width = targetW;
    canvasRef.height = targetH;
    backend?.resize(frame.size, dpr);
  }
  backend?.render(frame);
  lastFrame = frame;
  if (PARITY) checkParity(frame);
}

function handleRender(msg: Extract<RenderMessage, { type: 'render' }>) {
  // Fold the delta into the mirror now, so none is lost; draw only the newest frame.
  pending = decoder.decode(msg.frame);
  if (!scheduled) {
    scheduled = true;
    setTimeout(drawPending, 0);
  }
}

function handleTexture(msg: Extract<RenderMessage, { type: 'texture' }>) {
  backend?.setTexture(msg.id, msg.bitmap);
  // draw again with what is already known; the layer's state did not change
  if (lastFrame) {
    pending = pending ?? lastFrame;
    if (!scheduled) {
      scheduled = true;
      setTimeout(drawPending, 0);
    }
  }
}

function handleDestroy() {
  backend?.destroy();
  backend = null;
  canvasRef = null;
  lastFrame = null;
  pending = null;
  workerGlobal.__freeformTextureReady = undefined;
}

self.onmessage = async (ev: MessageEvent<RenderMessage>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init':
      await handleInit(msg);
      break;
    case 'resize':
      handleResize(msg);
      break;
    case 'render':
      handleRender(msg);
      break;
    case 'texture':
      handleTexture(msg);
      break;
    case 'destroy':
      handleDestroy();
      break;
  }
};
