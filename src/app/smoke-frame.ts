// Smoke frame: replaced by the POM mirror in epic 15.
import { HexgridType } from '@/layers/adapters/hexgrid';
import { PaperType } from '@/layers/adapters/paper';
import type { SceneFrame } from '@/render/types';

/** A fixed paper-and-hexgrid frame from the two adapters' default state, with no store. */
export function smokeFrame(size: { w: number; h: number }, pixelRatio: number): SceneFrame {
  return {
    size,
    pixelRatio,
    paper: { aspect: PaperType.defaultState.aspect, color: PaperType.defaultState.color },
    camera: { x: 0, y: 0, zoom: 1 },
    layers: [
      { id: 'paper', type: PaperType.id, visible: true, state: { ...PaperType.defaultState } },
      {
        id: 'hexgrid',
        type: HexgridType.id,
        visible: true,
        state: { ...HexgridType.defaultState },
      },
    ],
  };
}
