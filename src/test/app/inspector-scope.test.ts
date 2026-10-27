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
