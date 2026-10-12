import { mapPaletteName, type RowSource } from '@/app/scene/frame';

const rows = (mapRef?: string, campaignRef?: string): RowSource => {
  const all = [
    {
      id: 'c',
      type: 'campaign',
      path: '/campaign/campaign',
      refs: campaignRef ? { palette: { node: campaignRef } } : undefined,
    },
    {
      id: 'm',
      type: 'map',
      path: '/maps/map',
      refs: mapRef ? { palette: { node: mapRef } } : undefined,
    },
    { id: 'doom', type: 'palette', path: '/themes/doom-forge', values: { name: 'Doom Forge' } },
    { id: 'space', type: 'palette', path: '/themes/space-opera', values: { name: 'Space Opera' } },
  ];
  return {
    node: (id) => all.find((r) => r.id === id),
    nodeAt: (p) => all.find((r) => r.path === p),
  };
};

describe('the status bar’s palette name', () => {
  it('follows the map, then the campaign, else none', () => {
    expect(mapPaletteName(rows('space', 'doom'), 'm')).toBe('Space Opera');
    expect(mapPaletteName(rows(undefined, 'doom'), 'm')).toBe('Doom Forge');
    expect(mapPaletteName(rows(), 'm')).toBeNull();
  });
});
