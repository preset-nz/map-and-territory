import { pickedSwatch } from '@/app/inspector/palette-strip';
import { mapRoles, mapTerrains, type RowSource } from '@/app/scene/frame';

const RED = [1, 0, 0, 1];
const BLUE = [0, 0, 1, 1];

const rows = (terrains?: unknown[]): RowSource => {
  const all = [
    {
      id: 'c',
      type: 'campaign',
      path: '/campaign/campaign',
      refs: terrains ? { palette: { node: 'p' } } : undefined,
    },
    { id: 'm', type: 'map', path: '/maps/map' },
    { id: 'p', type: 'palette', path: '/themes/hostile', values: { name: 'Hostile', terrains } },
  ];
  return {
    node: (id) => all.find((r) => r.id === id),
    nodeAt: (p) => all.find((r) => r.path === p),
  };
};

describe('the palette strip’s terrains', () => {
  it('lists every terrain in palette order, two of one base type included', () => {
    const swatches = mapTerrains(
      rows([
        { id: 'acid', baseType: 'water', traits: ['toxic'], name: 'Acid Pools', colour: RED },
        { id: 'void', baseType: 'water', traits: [], name: 'Void Depths', colour: BLUE },
        { id: 'salt', baseType: 'plains', traits: ['vast'], name: 'Salt Flats', colour: BLUE },
      ]),
      'm',
    );
    expect(swatches.map((s) => s.id)).toEqual(['acid', 'void', 'salt']);
    expect(swatches[0]).toEqual({
      id: 'acid',
      name: 'Acid Pools',
      baseType: 'water',
      traits: ['toxic'],
      fill: '#ff0000',
    });
    expect(swatches[1].fill).toBe('#0000ff');
  });

  it('leaves out a terrain with an unknown base type or no colour', () => {
    const swatches = mapTerrains(
      rows([
        { id: 'city', baseType: 'city', name: 'City', colour: RED },
        { id: 'bare', baseType: 'plains', name: 'Bare' },
        { id: 'ok', baseType: 'hills', name: 'Ok', colour: RED },
      ]),
      'm',
    );
    expect(swatches.map((s) => s.id)).toEqual(['ok']);
  });

  it('gives the fallback’s five when nothing has a palette', () => {
    const swatches = mapTerrains(rows(), 'm');
    expect(swatches.map((s) => s.baseType)).toEqual([
      'water',
      'plains',
      'forest',
      'hills',
      'mountains',
    ]);
    expect(swatches[0].name).toBe('Blood Mires');
  });
});

describe('the swatch the brush marks', () => {
  const swatches = mapTerrains(
    rows([
      { id: 'acid', baseType: 'water', name: 'Acid Pools', colour: RED },
      { id: 'void', baseType: 'water', name: 'Void Depths', colour: BLUE },
    ]),
    'm',
  );

  it('is the one picked, though another shares its base type', () => {
    expect(pickedSwatch(swatches, { baseType: 'water', id: 'void' })).toBe('void');
  });

  it('is the first of the base type when nothing in this palette was picked', () => {
    expect(pickedSwatch(swatches, { baseType: 'water', id: null })).toBe('acid');
    // picked in another palette
    expect(pickedSwatch(swatches, { baseType: 'water', id: 'blood-mires' })).toBe('acid');
    expect(pickedSwatch(swatches, { baseType: 'hills', id: null })).toBeNull();
  });
});

describe('the setting’s other colours', () => {
  it('lists the colours a setting has, in the strip’s order', () => {
    const all = [
      { id: 'c', type: 'campaign', path: '/campaign/campaign', refs: { palette: { node: 'p' } } },
      { id: 'm', type: 'map', path: '/maps/map' },
      {
        id: 'p',
        type: 'palette',
        path: '/themes/p',
        values: { gridLine: RED, background: BLUE, accent: RED },
      },
    ];
    const source: RowSource = {
      node: (id) => all.find((r) => r.id === id),
      nodeAt: (p) => all.find((r) => r.path === p),
    };
    expect(mapRoles(source, 'm').map((r) => r.key)).toEqual(['background', 'gridLine', 'accent']);
  });

  it('gives the fallback’s grid line when nothing has a setting', () => {
    expect(mapRoles(rows(), 'm')).toEqual([
      { key: 'gridLine', label: 'Grid line', fill: '#333333' },
    ]);
  });
});
