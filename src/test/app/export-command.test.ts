import { EXPORT_PNG, exportBindings } from '@/app/export/bindings';
import { type ExportDeps, exportFileName, exportMapAsPng } from '@/app/export/command';
import { crc32 } from '@/app/export/png';

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const chunk = (type: string, data: number[]) => {
  const body = [...type].map((c) => c.charCodeAt(0)).concat(data);
  return [...u32(data.length), ...body, ...u32(crc32(new Uint8Array(body)))];
};
const PNG = new Uint8Array([
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  ...chunk('IHDR', [...u32(1), ...u32(1), 8, 6, 0, 0, 0]),
  ...chunk('IEND', []),
]).buffer;

function deps(over: Partial<ExportDeps> = {}) {
  const d = {
    mapName: 'Ashfall',
    documentPath: vi.fn(async () => '/Users/g/Campaigns/doom.campaign' as string | null),
    chooseFile: vi.fn(async () => '/Users/g/Campaigns/Ashfall.png' as string | null),
    render: vi.fn(async () => ({ png: PNG, size: { w: 1, h: 1 }, clamped: false })),
    writeFile: vi.fn(async () => {}),
    notify: vi.fn(),
    ...over,
  };
  return d;
}

describe('the Export bindings', () => {
  it('are enabled with an active map and disabled without one', () => {
    const run = vi.fn();
    expect(exportBindings('m1', run)[EXPORT_PNG].enabled).toBe(true);
    expect(exportBindings(null, run)[EXPORT_PNG].enabled).toBe(false);
    exportBindings('m1', run)[EXPORT_PNG].run?.();
    expect(run).toHaveBeenCalledOnce();
  });
});

describe('exportFileName', () => {
  it('is the map’s name with .png, or Map', () => {
    expect(exportFileName('Ashfall')).toBe('Ashfall.png');
    expect(exportFileName('  ')).toBe('Map.png');
    expect(exportFileName(null)).toBe('Map.png');
    expect(exportFileName('a/b:c')).toBe('a b c.png');
  });
});

describe('Export ▸ Map as PNG…', () => {
  it('asks in the campaign’s folder, then writes the PNG with 300 dpi', async () => {
    const d = deps();
    expect(await exportMapAsPng(d)).toBe('saved');
    expect(d.chooseFile).toHaveBeenCalledWith('Ashfall.png', '/Users/g/Campaigns');
    const [path, bytes] = d.writeFile.mock.calls[0] as unknown as [string, Uint8Array];
    expect(path).toBe('/Users/g/Campaigns/Ashfall.png');
    expect(new TextDecoder('latin1').decode(bytes)).toContain('pHYs');
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('300 dpi'), 'info');
  });

  it('starts in no folder for an Untitled campaign', async () => {
    const d = deps({ documentPath: vi.fn(async () => null) });
    await exportMapAsPng(d);
    expect(d.chooseFile).toHaveBeenCalledWith('Ashfall.png', undefined);
  });

  it('writes nothing, draws nothing and says nothing when the dialog is cancelled', async () => {
    const d = deps({ chooseFile: vi.fn(async () => null) });
    expect(await exportMapAsPng(d)).toBe('cancelled');
    expect(d.render).not.toHaveBeenCalled();
    expect(d.writeFile).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });

  it('tells the user when the export was clamped', async () => {
    const d = deps({
      render: vi.fn(async () => ({ png: PNG, size: { w: 8192, h: 5000 }, clamped: true })),
    });
    expect(await exportMapAsPng(d)).toBe('saved');
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('smaller'), 'error');
  });

  it('reports a render that gives nothing, and a write that fails', async () => {
    const none = deps({ render: vi.fn(async () => null) });
    expect(await exportMapAsPng(none)).toBe('failed');
    expect(none.writeFile).not.toHaveBeenCalled();
    expect(none.notify).toHaveBeenCalledWith(expect.stringContaining('no map'), 'error');

    const bad = deps({
      writeFile: vi.fn(async () => {
        throw new Error('disk full');
      }),
    });
    expect(await exportMapAsPng(bad)).toBe('failed');
    expect(bad.notify).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error');
  });
});
