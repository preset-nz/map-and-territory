/// <reference lib="webworker" />

import { registerBuiltinLayers } from '@/layers/builtin';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import { createDeltaDecoder } from '@/render/delta';
import { renderExportPng } from '@/render/export';
import type { RenderMessage, SceneFrame } from '@/render/types';

let backend: Canvas2DBackend | null = null;
let canvasRef: OffscreenCanvas | null = null;
let lastFrame: SceneFrame | null = null;
const decoder = createDeltaDecoder();
// the newest frame not yet drawn: a burst of pointer moves draws once
let pending: SceneFrame | null = null;
let scheduled = false;

function handleInit(msg: Extract<RenderMessage, { type: 'init' }>) {
  registerBuiltinLayers();
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

type Post = (m: RenderMessage, transfer?: Transferable[]) => void;

async function handleExport(msg: Extract<RenderMessage, { type: 'export' }>) {
  const post = (self as unknown as { postMessage: Post }).postMessage.bind(self);
  try {
    if (!backend) throw new Error('the renderer is not ready');
    const png = await renderExportPng(backend, msg);
    post({ type: 'exported', id: msg.id, png }, [png]);
  } catch (e) {
    post({ type: 'export-error', id: msg.id, message: e instanceof Error ? e.message : String(e) });
  }
}

function handleDestroy() {
  backend?.destroy();
  backend = null;
  canvasRef = null;
  lastFrame = null;
  pending = null;
}

self.onmessage = (ev: MessageEvent<RenderMessage>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init':
      handleInit(msg);
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
    case 'export':
      void handleExport(msg);
      break;
    case 'destroy':
      handleDestroy();
      break;
  }
};
