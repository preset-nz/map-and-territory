/// <reference lib="webworker" />
import type { RenderMessage } from "@/render/types";
import { Canvas2DBackend } from "@/render/backends/canvas2d";
import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { FreeformType } from "@/layers/adapters/freeform-hex";

let backend: Canvas2DBackend | null = null;
let canvasRef: OffscreenCanvas | null = null;

function handleInit(msg: Extract<RenderMessage, { type: "init" }>) {
  // Ensure layer adapters are registered in the worker context
  try {
    registerLayerType(PaperType);
    registerLayerType(HexgridType);
    registerLayerType(HexNoiseType);
    registerLayerType(FreeformType);
  } catch {}
  backend = new Canvas2DBackend();
  canvasRef = msg.canvas;

  // Ensure the OffscreenCanvas starts with clean, minimal dimensions
  // This prevents inheritance of stale dimensions from previous canvas instances
  if (canvasRef) {
    canvasRef.width = 1;
    canvasRef.height = 1;
  }

  backend.init(msg.canvas, msg.pixelRatio);
  // Acknowledge initialization to the main thread
  (self as unknown as { postMessage: (m: RenderMessage) => void }).postMessage({
    type: "inited",
  });
}

function handleResize(msg: Extract<RenderMessage, { type: "resize" }>) {
  if (canvasRef) {
    // Resize bitmap to device pixels
    canvasRef.width = Math.max(
      1,
      Math.floor(msg.size.w * (msg.pixelRatio || 1)),
    );
    canvasRef.height = Math.max(
      1,
      Math.floor(msg.size.h * (msg.pixelRatio || 1)),
    );
  }
  backend?.resize(msg.size, msg.pixelRatio);
}

function handleRender(msg: Extract<RenderMessage, { type: "render" }>) {
  // Defensive: ensure the bitmap matches incoming frame size × dpr
  const dpr = msg.frame.pixelRatio || 1;
  const targetW = Math.max(1, Math.floor(msg.frame.size.w * dpr));
  const targetH = Math.max(1, Math.floor(msg.frame.size.h * dpr));
  if (
    canvasRef &&
    (canvasRef.width !== targetW || canvasRef.height !== targetH)
  ) {
    canvasRef.width = targetW;
    canvasRef.height = targetH;
    backend?.resize(msg.frame.size, dpr);
  }
  backend?.render(msg.frame);
}

function handleDestroy() {
  backend?.destroy();
  backend = null;
  canvasRef = null;
}

self.onmessage = (ev: MessageEvent<RenderMessage>) => {
  const msg = ev.data;
  switch (msg.type) {
    case "init":
      handleInit(msg);
      break;
    case "resize":
      handleResize(msg);
      break;
    case "render":
      handleRender(msg);
      break;
    case "destroy":
      handleDestroy();
      break;
  }
};

export {}; // ensure module scope
