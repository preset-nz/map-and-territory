import type { SceneFrame, RenderMessage } from "@/render/types";

export class RenderService {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offscreen: OffscreenCanvas | null = null;
  private ready = false;
  private queue: Array<RenderMessage> = [];
  private dbg =
    typeof window !== "undefined"
      ? (window as unknown as Window & {
          __renderWorkerStatus?: Record<string, unknown>;
        })
      : (undefined as unknown as Window & {
          __renderWorkerStatus?: Record<string, unknown>;
        });

  init(canvas: HTMLCanvasElement, pixelRatio: number): boolean {
    this.canvas = canvas;
    let offscreen: OffscreenCanvas | null = null;
    const fail = (stage: string, e?: unknown) => {
      try {
        this.canvas?.setAttribute("data-worker-stage", stage);
        if (e)
          this.canvas?.setAttribute(
            "data-worker-error",
            String(e instanceof Error ? e.message : e),
          );
      } catch {}
      if (typeof window !== "undefined") {
        console.error("[RenderService] Worker init failed at", stage, e);
        this.dbg.__renderWorkerStatus = {
          stage,
          error: e ? String(e instanceof Error ? e.message : e) : undefined,
          t: Date.now(),
        };
      }
      return false;
    };
    try {
      if (typeof window !== "undefined") {
        console.info("[RenderService] attempting transferControlToOffscreen");
        this.dbg.__renderWorkerStatus = {
          stage: "before-transfer",
          t: Date.now(),
        };
      }
      try {
        this.canvas?.setAttribute("data-worker-stage", "before-transfer");
      } catch {}
      offscreen =
        canvas.transferControlToOffscreen?.() as OffscreenCanvas | null;
      if (typeof window !== "undefined") {
        this.dbg.__renderWorkerStatus = {
          stage: "after-transfer",
          ok: !!offscreen,
          t: Date.now(),
        };
      }
      try {
        this.canvas?.setAttribute(
          "data-worker-stage",
          offscreen ? "after-transfer-ok" : "after-transfer-null",
        );
      } catch {}
    } catch (e) {
      // Do not swallow; mark and signal failure up to caller
      return fail("transfer-error", e);
    }
    if (!offscreen) return fail("offscreen-null");
    this.offscreen = offscreen as OffscreenCanvas;
    try {
      if (typeof window !== "undefined") {
        this.dbg.__renderWorkerStatus = {
          stage: "creating-worker",
          t: Date.now(),
        };
      }
      try {
        this.canvas?.setAttribute("data-worker-stage", "creating-worker");
      } catch {}
      try {
        this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
          type: "module",
        });
      } catch (e) {
        return fail("create-worker-error", e);
      }
      this.ready = false;
      this.worker.onmessage = (ev: MessageEvent<RenderMessage>) => {
        if (ev.data?.type === "inited") {
          this.ready = true;
          // flush queued messages in order
          for (const msg of this.queue) this.worker?.postMessage(msg);
          this.queue = [];
          if (typeof window !== "undefined") {
            this.dbg.__renderWorkerStatus = {
              stage: "inited",
              ok: true,
              t: Date.now(),
            };
          }
          try {
            this.canvas?.setAttribute("data-worker-stage", "inited");
          } catch {}
        }
      };
      const initMsg: RenderMessage = {
        type: "init",
        canvas: this.offscreen,
        pixelRatio,
      };
      if (typeof window !== "undefined") {
        this.dbg.__renderWorkerStatus = {
          stage: "posting-init",
          t: Date.now(),
        };
      }
      try {
        this.canvas?.setAttribute("data-worker-stage", "posting-init");
      } catch {}
      try {
        this.worker.postMessage(initMsg, [this.offscreen]);
      } catch (e) {
        return fail("postMessage-error", e);
      }
      if (typeof window !== "undefined") {
        this.dbg.__renderWorkerStatus = {
          stage: "posted-init",
          ok: true,
          t: Date.now(),
        };
      }
      try {
        this.canvas?.setAttribute("data-worker-stage", "posted-init");
      } catch {}
      return true;
    } catch (e) {
      this.worker?.terminate();
      this.worker = null;
      this.offscreen = null;
      return fail("worker-error", e);
    }
  }

  resize(size: { w: number; h: number }, pixelRatio: number) {
    if (!this.worker) return;
    const msg: RenderMessage = { type: "resize", size, pixelRatio };
    if (this.ready) this.worker.postMessage(msg);
    else this.queue.push(msg);
  }

  render(frame: SceneFrame) {
    if (!this.worker) return;
    const msg: RenderMessage = { type: "render", frame };
    if (this.ready) this.worker.postMessage(msg);
    else this.queue.push(msg);
  }

  destroy() {
    this.worker?.postMessage({ type: "destroy" });
    this.worker?.terminate();
    this.worker = null;
    this.offscreen = null;
    this.canvas = null;
    this.ready = false;
    this.queue = [];
  }
}

export default RenderService;
