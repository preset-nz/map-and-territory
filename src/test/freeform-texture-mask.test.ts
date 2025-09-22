import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import {
  FreeformAdapter,
  type FreeformState,
} from "@/layers/adapters/freeform-hex";
import type { RenderEnv } from "@/layers/types";

class MockContext implements Partial<CanvasRenderingContext2D> {
  public beginPathCount = 0;
  public clipMode: "normal" | "evenodd" | null = null;
  public rectCalls: Array<[number, number, number, number]> = [];
  public pathSegments: Array<
    Array<["move" | "line" | "close", number, number]>
  > = [];
  public current: Array<["move" | "line" | "close", number, number]> | null =
    null;
  public drawImageCalls: Array<[number, number, number, number]> = [];
  public saved = 0;
  public restored = 0;
  public globalAlpha = 1;
  public globalCompositeOperation = "source-over";
  public translateCalls: Array<[number, number]> = [];
  public rotateCalls: number[] = [];
  public scaleCalls: Array<[number, number]> = [];
  public fillRectCalls: Array<[number, number, number, number]> = [];
  public patternRequested = false;
  public fillStyle: string | CanvasGradient | CanvasPattern = "#000";

  beginPath() {
    this.beginPathCount++;
    this.current = [];
  }

  moveTo(x: number, y: number) {
    this.current?.push(["move", x, y]);
  }

  lineTo(x: number, y: number) {
    this.current?.push(["line", x, y]);
  }

  closePath() {
    this.current?.push(["close", NaN, NaN]);
    if (this.current) {
      this.pathSegments.push(this.current);
    }
    this.current = null;
  }

  clip(rule?: CanvasFillRule) {
    this.clipMode = rule === "evenodd" ? "evenodd" : "normal";
  }

  rect(x: number, y: number, w: number, h: number) {
    this.rectCalls.push([x, y, w, h]);
  }

  drawImage(
    _img: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) {
    this.drawImageCalls.push([dx, dy, dw, dh]);
  }

  createPattern(): CanvasPattern | null {
    this.patternRequested = true;
    return {} as CanvasPattern;
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.fillRectCalls.push([x, y, w, h]);
  }

  translate(x: number, y: number) {
    this.translateCalls.push([x, y]);
  }

  rotate(angle: number) {
    this.rotateCalls.push(angle);
  }

  scale(x: number, y: number) {
    this.scaleCalls.push([x, y]);
  }

  save() {
    this.saved++;
  }

  restore() {
    this.restored++;
  }
}

const env: RenderEnv = {
  zoom: 1,
  pixelRatio: 1,
  size: { w: 200, h: 200 },
  paperRect: { x: 0, y: 0, w: 200, h: 200 },
  camera: { x: 0, y: 0, zoom: 1 },
  grid: { size: 10, orientation: "pointy" },
};

const baseTexture = {
  id: "texture-1",
  name: "texture.png",
  mimeType: "image/png",
  dataUrl: "data:image/png;base64,AAA",
  width: 128,
  height: 128,
};

const fakeBitmap = { width: 128, height: 128 } as unknown as CanvasImageSource;

const originalFetch = globalThis.fetch;
const originalCreateImageBitmap = globalThis.createImageBitmap;
const originalTextureReady = (globalThis as Record<string, unknown>)[
  "__freeformTextureReady"
];

let fetchMock: ReturnType<typeof vi.fn>;
let createImageBitmapMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response(new Blob()));
  globalThis.fetch = fetchMock;

  createImageBitmapMock = vi.fn(async () => fakeBitmap as ImageBitmap);
  (globalThis as Record<string, unknown>).createImageBitmap =
    createImageBitmapMock;

  (globalThis as Record<string, unknown>).__freeformTextureReady = vi.fn();
});

afterEach(() => {
  fetchMock.mockClear();
  createImageBitmapMock.mockClear();
});

describe("Freeform texture masking", () => {
  it("skips drawing when no cells and not inverted", () => {
    const ctx = new MockContext();
    const state: FreeformState = {
      cells: {},
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "texture-fill",
      textureFill: baseTexture,
      textureFillInvert: false,
    };
    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );
    expect(ctx.drawImageCalls.length).toBe(0);
  });

  it("clips to painted cells when not inverted", async () => {
    const ctx = new MockContext();
    const state: FreeformState = {
      cells: { "0,0": {}, "0,1": {} },
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "texture-fill",
      textureFill: baseTexture,
      textureFillInvert: false,
    };

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    expect(ctx.clipMode).toBe("normal");
    expect(ctx.drawImageCalls.length).toBeGreaterThan(0);
    expect(ctx.rectCalls.length).toBe(0);
  });

  it("draws full rect when inverted", async () => {
    const ctx = new MockContext();
    const state: FreeformState = {
      cells: {},
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "texture-fill",
      textureFill: baseTexture,
      textureFillInvert: true,
    };

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    expect(ctx.clipMode).toBe("evenodd");
    expect(ctx.rectCalls[0]).toEqual([0, 0, 200, 200]);
    expect(ctx.drawImageCalls[0]).toEqual([-100, -100, 200, 200]);
  });

  it("uses pattern fill when tiling set to repeat", async () => {
    const ctx = new MockContext();
    const state: FreeformState = {
      cells: { "0,0": {} },
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "texture-fill",
      textureFill: baseTexture,
      textureFillInvert: false,
      textureTiling: "repeat",
    };

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    FreeformAdapter.drawMain?.(
      ctx as unknown as CanvasRenderingContext2D,
      state,
      env,
    );

    expect(ctx.patternRequested).toBe(true);
    expect(ctx.fillRectCalls.length).toBeGreaterThan(0);
  });
});

afterAll(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  else delete (globalThis as Record<string, unknown>).fetch;

  if (originalCreateImageBitmap)
    globalThis.createImageBitmap = originalCreateImageBitmap;
  else delete (globalThis as Record<string, unknown>).createImageBitmap;

  if (originalTextureReady !== undefined)
    (globalThis as Record<string, unknown>).__freeformTextureReady =
      originalTextureReady;
  else delete (globalThis as Record<string, unknown>).__freeformTextureReady;
});
