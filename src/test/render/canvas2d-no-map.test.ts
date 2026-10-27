// With no map the canvas is empty: no paper edge for a map that isn't there (Georg, 2026-10-28).
import { describe, expect, it } from 'vitest';
import { Canvas2DBackend } from '@/render/backends/canvas2d';
import type { SceneFrame } from '@/render/types';

function recordingCanvas() {
  const log: string[] = [];
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) =>
      key in target
        ? target[key]
        : (..._a: unknown[]) => {
            log.push(String(key));
          },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  return { canvas: { getContext: () => ctx, width: 0, height: 0 }, log };
}

const frame = (layers: SceneFrame['layers']): SceneFrame => ({
  size: { w: 400, h: 300 },
  pixelRatio: 1,
  paper: { aspect: '16:10', color: '#ffffff' },
  camera: { x: 0, y: 0, zoom: 1 },
  layers,
});

describe('the canvas with no map', () => {
  it('is cleared and nothing else: no paper edge', () => {
    const { canvas, log } = recordingCanvas();
    const backend = new Canvas2DBackend();
    backend.init(canvas as unknown as HTMLCanvasElement, 1);
    log.length = 0;
    backend.render(frame([]));
    expect(log).toContain('clearRect');
    expect(log).not.toContain('strokeRect');
    expect(log).not.toContain('clip');
  });
});
