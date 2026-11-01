import { describe, expect, it, vi } from 'vitest';
import { BUILTIN_LAYER_TYPES } from '@/layers/builtin';
import { layerKey } from '@/render/keys';

// Per built-in adapter: a filled example, and one change per state field its drawing reads.
// A field that draws and is not here is a hole in the key; a field here that doesn't change the
// key is one too.
const corner = (q: number, r: number, c = 0) => ({ hex: { q, r }, corner: c });
const place = {
  id: 'p1',
  name: 'Gallows Ford',
  note: 'toll',
  hexes: [{ q: 0, r: 0 }],
  number: 1,
  marker: 'number',
  hidden: false,
  size: 1,
};
const outlinePath = {
  id: 'o1',
  corners: [corner(0, 0, 0), corner(0, 0, 1), corner(0, 0, 2)],
  closed: false,
};

type Case = { base: Record<string, unknown>; changes: Record<string, unknown>[] };
const CASES: Record<string, Case> = {
  paper: {
    base: {
      color: '#ffffff',
      aspect: '16:10',
      orientation: 'landscape',
      texture: 'a.png',
      textureBlend: 'multiply',
      textureFit: 'cover',
      textureScale: 1,
    },
    changes: [
      { color: '#000000' },
      { aspect: 'square' },
      { orientation: 'portrait' },
      { texture: 'b.png' },
      { textureBlend: 'normal' },
      { textureFit: 'repeat' },
      { textureScale: 2 },
    ],
  },
  hexgrid: {
    base: {
      size: 24,
      orientation: 'pointy',
      color: '#000000',
      usePaletteColor: false,
      alpha: 0.5,
      lineWidth: 1,
      hairline: false,
      lineStyle: 'solid',
      dashLength: 4,
      gapLength: 2,
      seed: 'grid',
      misregistration: 0,
      cornerJitter: 0,
      widthNoise: 0,
      noiseScale: 24,
      joinCorners: true,
      inkNoise: 0,
      inkScale: 40,
    },
    changes: [
      { size: 25 },
      { orientation: 'flat' },
      { color: '#ff0000' },
      { usePaletteColor: true },
      { alpha: 1 },
      { alpha: undefined }, // draws at 0.25
      { lineWidth: 2 },
      { hairline: true },
      { lineStyle: 'dashed' },
      { dashLength: 5 },
      { gapLength: 3 },
      { seed: 'other' },
      { misregistration: 2 },
      { cornerJitter: 2 },
      { widthNoise: 0.5 },
      { noiseScale: 40 },
      { joinCorners: false },
      { inkNoise: 0.5 },
      { inkScale: 80 },
    ],
  },
  'hex-noise': {
    base: {
      seed: 'seed',
      frequency: 0.15,
      offsetX: 0,
      offsetY: 0,
      intensity: 1,
      gamma: 1,
      min: 0,
      max: 1,
      mode: 'paint',
      terrain: 'plains',
      paintColor: '#aaaaaa',
    },
    changes: [
      { seed: 'other' },
      { frequency: 0.2 },
      { offsetX: 1 },
      { offsetY: 1 },
      { intensity: 0.5 },
      { gamma: 2 },
      { min: 0.2 },
      { max: 0.8 },
      { mode: 'shape' },
      { terrain: 'hills' },
      { paintColor: '#bbbbbb' },
    ],
  },
  freeform: {
    base: {
      cells: { '0,0': { terrainId: 'plains' }, '1,0': { color: '#112233' }, '2,0': {} },
      opacity: 1,
      renderMode: 'paint',
      texture: 'a.png',
      textureFillInvert: false,
      textureOffsetX: 0,
      textureOffsetY: 0,
      textureScale: 1,
      textureRotation: 0,
      textureTiling: 'stretch',
      textureOverlayMode: 'normal',
    },
    changes: [
      { cells: { '0,0': { terrainId: 'plains' }, '1,0': { color: '#112233' } } }, // one fewer
      { cells: { '0,0': { terrainId: 'plains' }, '1,0': { color: '#112233' }, '2,1': {} } },
      // repainting a cell that is not the last one
      { cells: { '0,0': { terrainId: 'water' }, '1,0': { color: '#112233' }, '2,0': {} } },
      { cells: { '0,0': { terrainId: 'plains' }, '1,0': { color: '#445566' }, '2,0': {} } },
      { opacity: 0.5 },
      { renderMode: 'texture-fill' },
      { texture: 'b.png' },
      { textureFillInvert: true },
      { textureOffsetX: 5 },
      { textureOffsetY: 5 },
      { textureScale: 2 },
      { textureRotation: 30 },
      { textureTiling: 'repeat' },
      { textureOverlayMode: 'multiply' },
    ],
  },
  outline: {
    base: {
      paths: [outlinePath],
      activePathId: 'o1',
      opacity: 1,
      strokeColor: '#f8f5e5',
      strokeWidth: 4,
      hoverCorner: corner(1, 0, 3),
      strokePattern: 'solid',
      roughness: 0,
    },
    changes: [
      // a corner in the middle of a path moves
      { paths: [{ ...outlinePath, corners: [corner(0, 0, 0), corner(0, 0, 4), corner(0, 0, 2)] }] },
      { paths: [{ ...outlinePath, closed: true }] },
      { paths: [{ ...outlinePath, id: 'o2' }] },
      {
        paths: [outlinePath, { id: 'o2', corners: [corner(3, 3), corner(3, 3, 1)], closed: false }],
      },
      { paths: [] },
      { activePathId: null },
      { opacity: 0.5 },
      { strokeColor: '#000000' },
      { strokeWidth: 6 },
      { hoverCorner: corner(2, 0, 3) },
      { hoverCorner: null },
      { strokePattern: 'dashed' },
      { roughness: 0.5 },
    ],
  },
  image: {
    base: {
      file: 'a.png',
      fit: 'cover',
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      opacity: 1,
      blend: 'normal',
    },
    changes: [
      { file: 'b.png' },
      { fit: 'contain' },
      { scale: 2 },
      { offsetX: 4 },
      { offsetY: 4 },
      { rotation: 10 },
      { opacity: 0.5 },
      { blend: 'multiply' },
    ],
  },
  locations: {
    base: {
      locations: [place],
      showLabels: true,
      labelStyle: 'plain',
      size: 1,
      face: 'condensed',
      ink: '#222222',
      paper: '#fafafa',
    },
    changes: [
      { showLabels: false },
      { labelStyle: 'glow' },
      { size: 2 },
      { face: 'serif' },
      { ink: '#000000' },
      { paper: '#ffffff' },
      { locations: [] },
      { locations: [{ ...place, id: 'p2' }] },
      { locations: [{ ...place, name: 'Other' }] },
      { locations: [{ ...place, note: 'bridge' }] },
      { locations: [{ ...place, hexes: [{ q: 1, r: 0 }] }] },
      { locations: [{ ...place, hexes: [...place.hexes, { q: 1, r: 0 }] }] },
      { locations: [{ ...place, number: 2 }] },
      { locations: [{ ...place, marker: 'dot' }] },
      { locations: [{ ...place, hidden: true }] },
      { locations: [{ ...place, size: 2 }] },
    ],
  },
  cartouche: {
    base: {
      resolvedTitle: 'Marches',
      subtitle: '',
      credit: '',
      frame: 'rule',
      align: 'centre',
      titleSize: 30,
      anchor: 'top-left',
      inset: 24,
      backing: true,
      face: 'condensed',
      hand: 'clean',
      seed: 'c1',
      ink: '#222222',
      titleInk: '#222222',
      titleMuted: false,
      paper: '#fafafa',
    },
    changes: [
      { resolvedTitle: 'Drowned Marches' },
      { subtitle: 'Sub' },
      { credit: 'Credit' },
      { frame: 'none' },
      { align: 'left' },
      { titleSize: 31 },
      { anchor: 'bottom-right' },
      { inset: 25 },
      { backing: false },
      { face: 'serif' },
      { hand: 'scratched' },
      { seed: 'other' },
      { ink: '#000000' },
      { titleInk: '#00000073' },
      { titleMuted: true },
      { paper: '#ffffff' },
    ],
  },
  compass: {
    base: {
      style: 'mark',
      labels: 'cardinal',
      resolvedLabels: ['N', 'E', 'S', 'W'],
      north: 0,
      size: 160,
      points: 0.75,
      anchor: 'top-right',
      inset: 24,
      backing: true,
      ring: true,
      face: 'condensed',
      hand: 'clean',
      seed: 'c1',
      ink: '#222222',
      paper: '#fafafa',
    },
    changes: [
      { style: 'arrow' },
      { labels: 'north-only' },
      { resolvedLabels: ['Throne', 'E', 'S', 'W'] },
      { north: 20 },
      { size: 80 },
      { points: 0.5 },
      { anchor: 'top-left' },
      { inset: 0 },
      { backing: false },
      { ring: false },
      { face: 'serif' },
      { hand: 'scratched' },
      { seed: 'c2' },
      { ink: '#000000' },
      { paper: '#ffffff' },
    ],
  },
};

const typeOf = (id: string) => BUILTIN_LAYER_TYPES.find((t) => t.id === id);

describe('layer invalidation keys', () => {
  it('has a case for every built-in adapter', () => {
    expect(Object.keys(CASES).sort()).toEqual(BUILTIN_LAYER_TYPES.map((t) => t.id).sort());
  });

  for (const [id, { base, changes }] of Object.entries(CASES)) {
    describe(id, () => {
      const key = (over: Record<string, unknown>) =>
        typeOf(id)?.adapter.getInvalidationKey({ ...base, ...over }) as string;

      it('changes with each field its drawing reads', () => {
        const k = key({});
        for (const change of changes) {
          expect(key(change), JSON.stringify(change)).not.toBe(k);
        }
      });

      it('gives two equal-content states built separately the same key', () => {
        const copy = JSON.parse(JSON.stringify(base));
        expect(layerKey(id, copy)).toBe(layerKey(id, { ...base }));
      });
    });
  }

  it('does not depend on the order cells were painted in', () => {
    const a = { cells: { '0,0': { terrainId: 'a' }, '1,0': { terrainId: 'b' } }, opacity: 1 };
    const b = { cells: { '1,0': { terrainId: 'b' }, '0,0': { terrainId: 'a' } }, opacity: 1 };
    expect(layerKey('freeform', a)).toBe(layerKey('freeform', b));
  });

  it('memoises per state object and re-keys a new one', () => {
    const type = typeOf('paper');
    const spy = vi.spyOn(
      type?.adapter as { getInvalidationKey: (s: unknown) => string },
      'getInvalidationKey',
    );
    const state = { color: '#fff', aspect: '16:10' };
    layerKey('paper', state);
    layerKey('paper', state);
    expect(spy).toHaveBeenCalledTimes(1);
    layerKey('paper', { ...state });
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('keys an unknown type as type:? and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(layerKey('mystery', {})).toBe('mystery:?');
    expect(layerKey('mystery', { a: 1 })).toBe('mystery:?');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
