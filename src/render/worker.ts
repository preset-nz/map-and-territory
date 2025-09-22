/// <reference lib="webworker" />
import type { RenderMessage, SceneFrame } from "@/render/types";
import { Canvas2DBackend } from "@/render/backends/canvas2d";
import bootstrapPlugins from "@/plugin/bootstrap";
import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";
import { HexgridType } from "@/layers/adapters/hexgrid";
import { HexNoiseType } from "@/layers/adapters/hex-noise";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import { OutlineType } from "@/layers/adapters/outline";

let backend: Canvas2DBackend | null = null;
let canvasRef: OffscreenCanvas | null = null;
let lastFrame: SceneFrame | null = null;

const workerGlobal = globalThis as unknown as {
  __freeformTextureReady?: () => void;
};

workerGlobal.__freeformTextureReady = () => {
  if (!backend || !lastFrame) return;
  try {
    backend.render(lastFrame);
  } catch (error) {
    console.warn("[worker] re-render after texture ready failed", error);
  }
};

async function handleInit(msg: Extract<RenderMessage, { type: "init" }>) {
  // Load plugins inside the worker to register layer adapters and render SPI.
  // Rendering will gracefully skip unknown layers if bootstrapping fails.
  try {
    await bootstrapPlugins();
  } catch (e) {
    console.error("[worker] plugin bootstrap failed:", e);
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
  lastFrame = msg.frame;
}

function handleDestroy() {
  backend?.destroy();
  backend = null;
  canvasRef = null;
  lastFrame = null;
  workerGlobal.__freeformTextureReady = undefined;
}

self.onmessage = async (ev: MessageEvent<RenderMessage>) => {
  const msg = ev.data;
  switch (msg.type) {
    case "init":
      await handleInit(msg);
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
