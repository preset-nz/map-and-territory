// Epic 07 story 6: line widths are paper px, and a hairline is one device pixel, through the
// backend's own transform (pixel ratio × fit × zoom).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerBuiltinLayers } from '@/layers/builtin';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import { paperView } from '@/render/geometry';
import type { SceneFrame } from '@/render/types';

/** A 2D context that keeps the current scale and logs each stroke's width in user and device px. */
function scaleTrackingCanvas() {
  const strokes: { width: number; device: number }[] = [];
  let scale = 1;
  const stack: number[] = [];
  const props: Record<string | symbol, unknown> = { lineWidth: 1 };
  const fns: Record<string, (...a: number[]) => void> = {
    setTransform: (a = 1) => {
      scale = a;
    },
    scale: (k = 1) => {
      scale *= k;
    },
    save: () => {
      stack.push(scale);
    },
    restore: () => {
      scale = stack.pop() ?? 1;
    },
    stroke: () => {
      const width = props.lineWidth as number;
      strokes.push({ width, device: width * scale });
    },
  };
  const ctx = new Proxy(props, {
    get: (target, key) =>
      typeof key === 'string' && fns[key] ? fns[key] : key in target ? target[key] : () => {},
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  return { canvas: { getContext: () => ctx, width: 0, height: 0 }, strokes };
}

beforeAll(() => registerBuiltinLayers());

const SIZE = { w: 1000, h: 700 };

const frame = (grid: Record<string, unknown>, zoom: number, pixelRatio: number): SceneFrame => ({
  size: SIZE,
  pixelRatio,
  paper: { aspect: '16:10', color: '#fff' },
  camera: { x: 0, y: 0, zoom },
  layers: [
    {
      id: 'grid',
      type: 'hexgrid',
      visible: true,
      state: { size: 24, orientation: 'pointy', color: '#000', alpha: 1, ...grid },
    },
  ],
});

function draw(grid: Record<string, unknown>, zoom: number, pixelRatio: number) {
  const { canvas, strokes } = scaleTrackingCanvas();
  const backend = new Canvas2DBackend();
  backend.init(canvas as unknown as HTMLCanvasElement, pixelRatio);
  backend.render(frame(grid, zoom, pixelRatio));
  expect(strokes.length).toBeGreaterThan(0);
  return strokes;
}

describe('hex grid line widths', () => {
  const fit = paperView(SIZE, '16:10').fit;

  it('draws a 1 px line 1 paper px wide at pixel ratio 2, not 1 / 2', () => {
    const [s] = draw({ lineWidth: 1 }, 1, 2);
    expect(s!.width).toBe(1);
    expect(s!.device).toBeCloseTo(2 * fit);
  });

  it('draws a hairline one device pixel wide at zoom 1 and 8', () => {
    for (const pixelRatio of [1, 2]) {
      const at1 = draw({ hairline: true, lineWidth: 5 }, 1, pixelRatio);
      const at8 = draw({ hairline: true, lineWidth: 5 }, 8, pixelRatio);
      expect(at1[0]!.device).toBeCloseTo(1);
      expect(at8[0]!.device).toBeCloseTo(1);
      expect(at1[0]!.width).toBeCloseTo(1 / (pixelRatio * fit));
      expect(at8[0]!.width).toBeCloseTo(1 / (pixelRatio * fit * 8));
    }
  });

  it('draws a hairline as a plain stroke even with width noise on', () => {
    // width noise fills outlines; a hairline has no width to vary, so it strokes
    const strokes = draw({ hairline: true, widthNoise: 1 }, 1, 2);
    expect(strokes[0]!.device).toBeCloseTo(1);
  });
});
