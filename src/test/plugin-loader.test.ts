import { describe, it, expect, beforeEach } from 'vitest';
import { loadPlugin, unloadPlugin, getToolbarContributions } from '@/plugin/loader';
import type { PluginManifest, PluginModule } from '@/plugin/types';
import { executeCommand, hasCommand } from '@/lib/commands';

describe('Plugin Loader (stub)', () => {
  beforeEach(async () => {
    // unload any previously loaded plugins by id if needed in future
  });

  it('registers commands and toolbar contributions', async () => {
    const manifest: PluginManifest = {
      id: 'test.plugin',
      name: 'Test Plugin',
      version: '0.0.1',
      contributes: {
        commands: [{ id: 'test.hello', title: 'Hello' }],
        toolbar: [{ group: 'test', items: [{ type: 'button', command: 'test.hello', label: 'Hello' }] }],
      },
    };

    const pluginModule: PluginModule = {
      commands: {
        // Return void to match command contract (no value expected)
        'test.hello': () => {},
      },
    };

    await loadPlugin(manifest, pluginModule);
    expect(hasCommand('test.hello')).toBe(true);
    const toolbar = getToolbarContributions();
    expect(toolbar.find((t) => t.command === 'test.hello')).toBeTruthy();

    const res = await executeCommand('test.hello');
    expect(res).toBe(undefined); // handler returns void; ensure no throw and no value

    await unloadPlugin('test.plugin');
  });
});
