/// <reference lib="webworker" />
import type { RenderMessage, SceneFrame } from '@/render/types';
import { Canvas2DBackend } from '@/render/backends/canvas2d';

let backend: Canvas2DBackend | null = null;
let canvasRef: OffscreenCanvas | null = null;

function handleInit(msg: Extract<RenderMessage, { type: 'init' }>) {
  backend = new Canvas2DBackend();
  canvasRef = msg.canvas;
  backend.init(msg.canvas, msg.pixelRatio);
}

function handleResize(msg: Extract<RenderMessage, { type: 'resize' }>) {
  if (canvasRef) {
    // Resize bitmap to device pixels
    (canvasRef as any).width = Math.max(1, Math.floor(msg.size.w * (msg.pixelRatio || 1)));
    (canvasRef as any).height = Math.max(1, Math.floor(msg.size.h * (msg.pixelRatio || 1)));
  }
  backend?.resize(msg.size, msg.pixelRatio);
}

function handleRender(msg: Extract<RenderMessage, { type: 'render' }>) {
  backend?.render(msg.frame as SceneFrame);
}

function handleDestroy() {
  backend?.destroy();
  backend = null;
  canvasRef = null;
}

self.onmessage = (ev: MessageEvent<RenderMessage>) => {
  const msg = ev.data;
  switch (msg.type) {
    case 'init': handleInit(msg); break;
    case 'resize': handleResize(msg); break;
    case 'render': handleRender(msg); break;
    case 'destroy': handleDestroy(); break;
  }
};

export {}; // ensure module scope
