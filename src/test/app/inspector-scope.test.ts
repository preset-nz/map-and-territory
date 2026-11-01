import type { Channel, Mirror } from '@preset.nz/pom';
import { describe, expect, it, vi } from 'vitest';
import { scopeOf } from '@/app/inspector/inspector';

const values = [{ key: 'renderMode', kind: 'choice', choices: ['paint', 'texture-fill'] }];

function setup(run: (id: string, payload: unknown) => Promise<unknown>) {
  const channel = { run: vi.fn(run) } as unknown as Channel;
  const mirror = {
    node: () => ({
      path: '/maps/map/layers/freeform',
      values: { renderMode: 'texture-fill' },
      refs: { texture: { file: '/img/a.png' } },
    }),
  } as unknown as Mirror;
  const scope = scopeOf('freeform', values, ['texture']);
  return { scope, ctx: { channel, mirror }, channel };
}

describe('the texture field in the inspector scope', () => {
  it('reads the reference as the path written', () => {
    const { scope, ctx } = setup(async () => 'nothing');
    expect(scope.read({ id: 'n' }, ctx)).toMatchObject({ texture: '/img/a.png' });
  });

  it('runs freeform.set-texture with the path, and null to clear', async () => {
    const { scope, ctx, channel } = setup(async () => 'nothing');
    expect(await scope.write?.('texture', '/img/b.png', { id: 'n' }, ctx)).toBeUndefined();
    expect(channel.run).toHaveBeenLastCalledWith('freeform.set-texture', {
      at: '/maps/map/layers/freeform',
      file: '/img/b.png',
    });
    await scope.write?.('texture', null, { id: 'n' }, ctx);
    expect(channel.run).toHaveBeenLastCalledWith('freeform.set-texture', {
      at: '/maps/map/layers/freeform',
      file: null,
    });
  });

  it('hands a refusal back to the field as its message', async () => {
    const { scope, ctx } = setup(async () => {
      throw 'the file isnt a PNG, JPEG or WebP image';
    });
    expect(await scope.write?.('texture', '/img/x.txt', { id: 'n' }, ctx)).toEqual({
      error: 'the file isnt a PNG, JPEG or WebP image',
    });
  });

  it('leaves other values on value.set', async () => {
    const { scope, ctx, channel } = setup(async () => 'nothing');
    await scope.write?.('renderMode', 'paint', { id: 'n' }, ctx);
    expect(channel.run).toHaveBeenCalledWith('value.set', {
      at: '/maps/map/layers/freeform',
      key: 'renderMode',
      value: 'paint',
    });
  });
});

describe('the compass style in the inspector scope', () => {
  const compass = [
    { key: 'style', kind: 'choice', choices: ['mark', 'arrow', 'cross'] },
    { key: 'labels', kind: 'choice', choices: ['cardinal', 'north-only', 'none'] },
  ];

  function compassSetup() {
    const channel = { run: vi.fn(async () => 'nothing') } as unknown as Channel;
    const mirror = { node: () => ({ path: '/maps/map/compass', values: {} }) } as unknown as Mirror;
    return { scope: scopeOf('compass', compass, []), ctx: { channel, mirror }, channel };
  }

  it('runs compass.set-style, so the labels reset in the same step', async () => {
    const { scope, ctx, channel } = compassSetup();
    await scope.write?.('style', 'cross', { id: 'k' }, ctx);
    expect(channel.run).toHaveBeenLastCalledWith('compass.set-style', {
      at: '/maps/map/compass',
      style: 'cross',
    });
  });

  it('leaves the labels on value.set', async () => {
    const { scope, ctx, channel } = compassSetup();
    await scope.write?.('labels', 'none', { id: 'k' }, ctx);
    expect(channel.run).toHaveBeenLastCalledWith('value.set', {
      at: '/maps/map/compass',
      key: 'labels',
      value: 'none',
    });
  });
});

describe('the setting field in the inspector scope', () => {
  const names = ['Doom Forge', 'Sunken Realm'];
  const themes: Record<string, unknown> = {
    t1: { values: { name: 'Doom Forge' } },
    t2: { values: { name: 'Sunken Realm' } },
  };

  function settingSetup(type: 'map' | 'campaign', palette?: { node: string }) {
    const channel = { run: vi.fn(async () => 'nothing') } as unknown as Channel;
    const mirror = {
      node: (id: string) => themes[id] ?? { path: `/${type}`, values: {}, refs: { palette } },
      nodeAt: () => ({ refs: { palette: { node: 't1' } } }),
    } as unknown as Mirror;
    const scope = scopeOf(type, [{ key: 'description', kind: 'text' }], ['palette'], names);
    return { scope, ctx: { channel, mirror }, channel };
  }

  it('reads the name of the theme the reference points at', () => {
    const { scope, ctx } = settingSetup('map', { node: 't2' });
    expect(scope.read({ id: 'm' }, ctx)).toMatchObject({ palette: 'Sunken Realm' });
  });

  it('reads a map without a reference as following the campaign', () => {
    const { scope, ctx } = settingSetup('map');
    expect(scope.read({ id: 'm' }, ctx)).toMatchObject({ palette: '__follow__' });
  });

  it("offers the catalogue's names, a map's led by the follow entry naming the campaign's", () => {
    const { scope, ctx } = settingSetup('map');
    const field = scope.schema.groups[0]?.rows.find((r) => 'id' in r && r.id === 'palette') as {
      label: string;
      optionsProvider: (c: unknown) => { value: string; label: string }[];
    };
    expect(field.label).toBe('Setting');
    expect(field.optionsProvider(ctx).map((o) => o.label)).toEqual([
      "Campaign's (Doom Forge)",
      'Doom Forge',
      'Sunken Realm',
    ]);
    const campaign = settingSetup('campaign').scope.schema.groups[0]?.rows.find(
      (r) => 'id' in r && r.id === 'palette',
    ) as typeof field;
    expect(campaign.optionsProvider(ctx).map((o) => o.label)).toEqual(names);
  });

  it('places the field after Description', () => {
    const { scope } = settingSetup('campaign');
    expect(scope.schema.groups[0]?.rows.map((r) => (r as { id: string }).id)).toEqual([
      'description',
      'palette',
    ]);
  });

  it('runs palette.use with the name, and with no preset to follow', async () => {
    const { scope, ctx, channel } = settingSetup('map', { node: 't1' });
    await scope.write?.('palette', 'Sunken Realm', { id: 'm' }, ctx);
    expect(channel.run).toHaveBeenLastCalledWith('palette.use', {
      at: '/map',
      preset: 'Sunken Realm',
    });
    await scope.write?.('palette', '__follow__', { id: 'm' }, ctx);
    expect(channel.run).toHaveBeenLastCalledWith('palette.use', { at: '/map' });
  });
});
