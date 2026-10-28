// Epic 07 story 3: the map at print size, through the same backend and adapters.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportActiveMap,
  exportFrame,
  exportSize,
  renderMapForExport,
  setMapExporter,
} from '@/app/export/render';
import { registerBuiltinLayers } from '@/layers/builtin';
import { resetInkMask } from '@/layers/ink-noise';
import { registerLayerType } from '@/layers/registry';
import type { RenderEnv } from '@/layers/types';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import { renderExportPng } from '@/render/export';
import RenderService from '@/render/service';
import type { RenderMessage, SceneFrame } from '@/render/types';

type Op = [string, ...unknown[]];

/**
 * A 2D context that logs every call and every line width set; `getTransform` gives back the
 * last transform set.
 */
function recordingCtx(canvas: { width: number; height: number } = { width: 1, height: 1 }) {
  const log: Op[] = [];
  const props: Record<string | symbol, unknown> = {
    canvas,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
  };
  let transform: number[] = [1, 0, 0, 1, 0, 0];
  const fns: Record<string, (...a: unknown[]) => unknown> = {
    setTransform: (...a) => {
      transform = a.length === 1 ? (a[0] as number[]) : (a as number[]);
      log.push(['setTransform', ...transform]);
    },
    getTransform: () => transform,
    createPattern: (src) => ({ pattern: src }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray((w as number) * (h as number) * 4) }),
  };
  const ctx = new Proxy(props, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && fns[key]) return fns[key];
      return (...a: unknown[]) => {
        log.push([String(key), ...a]);
      };
    },
    set(target, key, value) {
      if (key === 'lineWidth') log.push(['lineWidth', value]);
      target[key] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as OffscreenCanvasRenderingContext2D, log };
}

class FakeCanvas {
  static made: FakeCanvas[] = [];
  rec = recordingCtx(this);
  constructor(
    public width: number,
    public height: number,
  ) {
    FakeCanvas.made.push(this);
  }
  getContext() {
    return this.rec.ctx;
  }
  async convertToBlob(opts: { type: string }) {
    const bytes = new Uint8Array([137, 80, 78, 71, this.width % 256]);
    return { type: opts.type, arrayBuffer: async () => bytes.buffer };
  }
}

const seen: RenderEnv[] = [];
beforeAll(() => {
  registerBuiltinLayers();
  registerLayerType({
    id: 'probe',
    title: 'Probe',
    defaultState: {},
    adapter: {
      title: 'Probe',
      drawMain: (_ctx, _state, env) => {
        seen.push(env);
      },
      getInvalidationKey: () => 'probe',
    },
  });
});
beforeEach(() => {
  seen.length = 0;
  FakeCanvas.made.length = 0;
  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
});
afterEach(() => vi.unstubAllGlobals());

const LOGICAL = { w: 400, h: 250 };

const frame = (over: Partial<SceneFrame> = {}): SceneFrame => ({
  size: { w: 900, h: 700 },
  pixelRatio: 2,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 120, y: 40, zoom: 3 },
  layers: [
    { id: 'paper', type: 'paper', visible: true, state: { color: '#f4ecd8', aspect: '16:10' } },
    { id: 'probe', type: 'probe', visible: true, state: {} },
    {
      id: 'grid',
      type: 'hexgrid',
      visible: true,
      state: { size: 20, orientation: 'pointy', color: '#000', usePaletteColor: false, alpha: 1 },
    },
  ],
  ...over,
});

function exportAt(k: number, f = frame(), backend = new Canvas2DBackend()) {
  const out = { w: LOGICAL.w * k, h: LOGICAL.h * k };
  const { ctx, log } = recordingCtx({ width: out.w, height: out.h });
  backend.renderExport(ctx, f, LOGICAL, out);
  return { log, out };
}

const count = (log: Op[], name: string) => log.filter((o) => o[0] === name).length;

describe('export render', () => {
  it('draws at camera 1x on the logical paper, scaled by k into the output', () => {
    const { log } = exportAt(3);
    expect(seen).toHaveLength(1);
    const env = seen[0]!;
    expect(env.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(env.zoom).toBe(1);
    expect(env.size).toEqual(LOGICAL);
    expect(env.paperRect).toEqual({ x: 0, y: 0, ...LOGICAL });
    // a device pixel is out / logical paper px, whatever the screen's pixel ratio
    expect(env.pixelRatio).toBe(2);
    expect(env.deviceScale).toBe(3);
    const transforms = log.filter((o) => o[0] === 'setTransform');
    expect(transforms[0]).toEqual(['setTransform', 1, 0, 0, 1, 0, 0]);
    expect(transforms[1]).toEqual(['setTransform', 3, 0, 0, 3, 0, 0]);
    // no translate or scale for a camera
    expect(count(log, 'translate')).toBe(0);
    expect(count(log, 'scale')).toBe(0);
    expect(log.find((o) => o[0] === 'clearRect')).toEqual(['clearRect', 0, 0, 1200, 750]);
  });

  it('draws no paper edge: that is screen chrome', () => {
    const { log } = exportAt(2);
    expect(count(log, 'strokeRect')).toBe(0);
  });

  it('scales the drawing rather than tiling it: the same hexes at 1x and 3x', () => {
    const a = exportAt(1).log;
    const b = exportAt(3).log;
    const hexEdges = count(a, 'moveTo');
    expect(hexEdges).toBeGreaterThan(50);
    expect(count(b, 'moveTo')).toBe(hexEdges);
    // the same paper-space coordinates; only the transform differs
    expect(b.filter((o) => o[0] === 'moveTo')).toEqual(a.filter((o) => o[0] === 'moveTo'));
  });

  it('draws with the textures the backend already holds', () => {
    const backend = new Canvas2DBackend();
    const bmp = { width: 4, height: 4 } as unknown as ImageBitmap;
    backend.setTexture('paper.png', bmp);
    exportAt(2, frame(), backend);
    expect(seen[0]!.textures?.get('paper.png')).toBe(bmp);
  });

  it('composites a layer with opacity through a scratch at the output size', () => {
    const f = frame();
    f.layers[1] = { ...f.layers[1]!, state: { opacity: 0.5 } };
    const { log, out } = exportAt(3, f);
    const scratch = FakeCanvas.made.find((c) => c.width === out.w && c.height === out.h);
    expect(scratch).toBeDefined();
    const composite = log.find((o) => o[0] === 'drawImage');
    expect(composite?.[1]).toBe(scratch);
  });

  it("leaves the screen render's prefix cache alone", () => {
    const backend = new Canvas2DBackend();
    const planner = (backend as unknown as { planner: { plan: () => unknown } }).planner;
    const plan = vi.spyOn(planner, 'plan');
    exportAt(2, frame(), backend);
    expect(plan).not.toHaveBeenCalled();
  });
});

// epic 07 story 6: the export draws the map's paper size, not the window's
describe('export independent of the window', () => {
  const inWindow = (size: { w: number; h: number }, pixelRatio: number) =>
    frame({ size, pixelRatio, camera: { x: 0, y: 0, zoom: 1 } });

  it("exports at the map's paper size, whatever the window", () => {
    const a = exportFrame(inWindow({ w: 900, h: 700 }, 2));
    const b = exportFrame(inWindow({ w: 2200, h: 1300 }, 1));
    expect(a.logical).toEqual({ w: 1200, h: 750 });
    expect(b.logical).toEqual(a.logical);
    expect(exportFrame(frame({ paper: { aspect: 'square', color: '#fff' } })).logical).toEqual({
      w: 1200,
      h: 1200,
    });
    // the camera is dropped: the export is at Fit
    expect(exportFrame(frame()).frame.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('leaves hidden places out, keeping the others’ numbers', () => {
    const place = (id: string, number: number, hidden: boolean) => ({
      id,
      name: id,
      hexes: [{ q: 0, r: number }],
      number,
      marker: 'number',
      hidden,
    });
    const f = frame();
    const layer = {
      ...f.layers[0],
      id: 'loc',
      type: 'locations',
      state: {
        locations: [place('keep', 1, false), place('chapel', 2, true), place('ford', 3, false)],
      },
    };
    const out = exportFrame({ ...f, layers: [...f.layers, layer] }).frame.layers.at(-1);
    const left = (out?.state as { locations?: { id: string; number: number }[] })?.locations ?? [];
    expect(left.map((l) => [l.id, l.number])).toEqual([
      ['keep', 1],
      ['ford', 3],
    ]);
  });

  it('draws the same calls from two window sizes and pixel ratios', () => {
    const draw = (f: SceneFrame) => {
      const { frame: atFit, logical } = exportFrame(f);
      const out = { w: 600, h: 375 };
      const { ctx, log } = recordingCtx({ width: out.w, height: out.h });
      // ink noise draws its lines into a scratch canvas, kept across draws: its calls count too
      for (const c of FakeCanvas.made) c.rec.log.length = 0;
      new Canvas2DBackend().renderExport(ctx, atFit, logical, out);
      const scratches = FakeCanvas.made.flatMap((c) => c.rec.log);
      return [...log, ...scratches].filter((o) => o[0] !== 'drawImage');
    };
    const grids = [
      { lineWidth: 2 },
      { hairline: true, lineStyle: 'dashed' },
      { widthNoise: 0.5, inkNoise: 0.5 },
    ];
    for (const grid of grids) {
      const at = (size: { w: number; h: number }, pixelRatio: number) => {
        const f = inWindow(size, pixelRatio);
        const layers = f.layers.map((l) =>
          l.type === 'hexgrid' ? { ...l, state: { ...(l.state as object), ...grid } } : l,
        );
        return draw({ ...f, layers });
      };
      // the first draw builds the ink mask and scratch, which later draws reuse
      resetInkMask();
      at({ w: 900, h: 700 }, 2);
      const a = at({ w: 900, h: 700 }, 2);
      expect(a.length).toBeGreaterThan(50);
      expect(at({ w: 2200, h: 1300 }, 1)).toEqual(a);
    }
  });
});

describe('export PNG in the worker', () => {
  it('draws into a canvas of the output size and encodes PNG bytes', async () => {
    const backend = new Canvas2DBackend();
    const png = await renderExportPng(backend, {
      frame: frame(),
      logical: LOGICAL,
      out: { w: 800, h: 500 },
    });
    expect(FakeCanvas.made[0]).toMatchObject({ width: 800, height: 500 });
    expect(new Uint8Array(png).slice(0, 4)).toEqual(new Uint8Array([137, 80, 78, 71]));
  });
});

describe('export size', () => {
  it('keeps the map rectangle when it fits and clamps uniformly when not', () => {
    expect(exportSize({ w: 2244, h: 1403 })).toEqual({
      size: { w: 2244, h: 1403 },
      clamped: false,
    });
    const big = exportSize({ w: 16000, h: 10000 }, 8192);
    expect(big).toEqual({ size: { w: 8192, h: 5120 }, clamped: true });
  });
});

/** A worker stand-in: answers `inited`, and an export with bytes or an error. */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((ev: MessageEvent<RenderMessage>) => void) | null = null;
  onerror: unknown = null;
  posted: RenderMessage[] = [];
  constructor() {
    FakeWorker.last = this;
  }
  reply(msg: RenderMessage) {
    this.onmessage?.({ data: msg } as MessageEvent<RenderMessage>);
  }
  postMessage(msg: RenderMessage) {
    this.posted.push(msg);
    if (msg.type === 'init') queueMicrotask(() => this.reply({ type: 'inited' }));
    if (msg.type === 'export') {
      queueMicrotask(() =>
        msg.out.w > 0
          ? this.reply({ type: 'exported', id: msg.id, png: new Uint8Array([msg.out.w]).buffer })
          : this.reply({ type: 'export-error', id: msg.id, message: 'too small' }),
      );
    }
  }
  terminate() {}
}

describe('export through the render service', () => {
  const start = () => {
    vi.stubGlobal('Worker', FakeWorker);
    const svc = new RenderService();
    const canvas = { transferControlToOffscreen: () => ({}) } as unknown as HTMLCanvasElement;
    expect(svc.init(canvas, 2)).toBe(true);
    return svc;
  };

  it('posts the whole frame and resolves with the PNG bytes', async () => {
    const svc = start();
    // what Rust gives a 16:10 map on A5 portrait with 10 mm margins
    const mapPx = { w: 1512, h: 945 };
    const done = await renderMapForExport(svc, frame(), LOGICAL, mapPx);
    const sent = FakeWorker.last!.posted.find((m) => m.type === 'export');
    expect(sent).toMatchObject({
      logical: LOGICAL,
      out: mapPx,
    });
    if (sent?.type !== 'export') throw new Error('no export posted');
    expect(sent.frame.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(sent.frame.layers).toHaveLength(3);
    expect(done.size).toEqual(mapPx);
    expect(done.clamped).toBe(false);
    expect(new Uint8Array(done.png)[0]).toBe(mapPx.w % 256);
    svc.destroy();
  });

  it('rejects on a worker error and on destroy', async () => {
    const svc = start();
    await expect(svc.exportPng(frame(), LOGICAL, { w: 0, h: 0 })).rejects.toThrow('too small');
    const pending = svc.exportPng(frame(), LOGICAL, { w: -1, h: 1 });
    FakeWorker.last!.postMessage = () => {};
    const never = svc.exportPng(frame(), LOGICAL, { w: 10, h: 10 });
    svc.destroy();
    await expect(never).rejects.toThrow('stopped');
    await expect(pending).rejects.toThrow();
  });
});

describe('export cost at A4 300 dpi (mock context: geometry and adapter work only)', () => {
  it('measures', () => {
    // A4 portrait, 16:10, 10 mm margins, as Rust lays it out
    const mapPx = { w: 2244, h: 1403 };
    const logical = { w: 1100, h: 687.5 };
    const grid = (over: Record<string, unknown>) =>
      frame({
        layers: [
          { id: 'paper', type: 'paper', visible: true, state: { color: '#fff', aspect: '16:10' } },
          {
            id: 'grid',
            type: 'hexgrid',
            visible: true,
            state: { size: 24, orientation: 'pointy', color: '#000', alpha: 1, ...over },
          },
        ],
      });
    const time = (f: SceneFrame) => {
      const backend = new Canvas2DBackend();
      const { ctx } = recordingCtx({ width: mapPx.w, height: mapPx.h });
      const t0 = performance.now();
      backend.renderExport(ctx, f, logical, mapPx);
      return performance.now() - t0;
    };
    const plain = time(grid({}));
    const noisy = time(grid({ widthNoise: 0.5, inkNoise: 0.5 }));
    // EXPORT_COST=1 vitest run src/test/render/export.test.ts prints the numbers
    if (process.env.EXPORT_COST) {
      process.stderr.write(
        `[export cost] A4 portrait 16:10 map ${mapPx.w}x${mapPx.h} px from ${logical.w}x${logical.h}: plain grid ${plain.toFixed(1)} ms, width+ink noise ${noisy.toFixed(1)} ms (mock ctx)\n`,
      );
    }
    expect(plain).toBeGreaterThan(0);
  });
});

describe('exporting the active map', () => {
  const rows = (path: string | undefined) => ({
    node: (id: string) => (id === 'm1' ? { id, type: 'map', path } : undefined),
    nodeAt: () => undefined,
  });
  const sheet = {
    pagePt: { w: 595.28, h: 841.89 },
    mapPt: { x: 28.35, y: 28.35, w: 538.58, h: 336.61 },
    mapPx: { w: 2244, h: 1403 },
  };

  it('draws it at the pixel size Rust gives for its path', async () => {
    const sheetOf = vi.fn(async () => sheet);
    expect(await exportActiveMap(rows('/maps/fen'), sheetOf)).toBeNull();
    const exportPng = vi.fn(async () => new ArrayBuffer(1));
    const prepare = vi.fn(async () => {});
    setMapExporter({
      target: { exportPng },
      current: () => ({ mapId: 'm1', frame: frame(), logical: LOGICAL }),
      of: () => null,
      prepare,
    });
    try {
      const done = await exportActiveMap(rows('/maps/fen'), sheetOf);
      expect(sheetOf).toHaveBeenCalledWith('/maps/fen');
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(exportPng).toHaveBeenCalledWith(expect.anything(), LOGICAL, sheet.mapPx);
      expect(done?.size).toEqual(sheet.mapPx);
      expect(done?.clamped).toBe(false);
      // no path, nothing for Rust to lay out
      expect(await exportActiveMap(rows(undefined), sheetOf)).toBeNull();
    } finally {
      setMapExporter(null);
    }
  });

  it('draws smaller and says so when the page asks for more than the limit', async () => {
    const big = { ...sheet, mapPx: { w: 16000, h: 10000 } };
    const exportPng = vi.fn(async () => new ArrayBuffer(1));
    setMapExporter({
      target: { exportPng },
      current: () => ({ mapId: 'm1', frame: frame(), logical: LOGICAL }),
      of: () => null,
      prepare: async () => {},
    });
    try {
      const done = await exportActiveMap(rows('/maps/fen'), async () => big);
      expect(done?.clamped).toBe(true);
      expect(done?.size).toEqual({ w: 8192, h: 5120 });
    } finally {
      setMapExporter(null);
    }
  });
});
