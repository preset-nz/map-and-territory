import { EXPORT_CAMPAIGN_PDF, EXPORT_PDF, EXPORT_PNG, exportBindings } from '@/app/export/bindings';
import { type ExportDeps, exportCampaign, exportFileName, exportMap } from '@/app/export/command';
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
    mapPath: '/maps/ashfall' as string | null,
    documentPath: vi.fn(async () => '/Users/g/Campaigns/doom.campaign' as string | null),
    chooseFile: vi.fn(async () => '/Users/g/Campaigns/Ashfall.png' as string | null),
    render: vi.fn(async () => ({ png: PNG, size: { w: 1, h: 1 }, clamped: false })),
    writePdf: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {}),
    notify: vi.fn(),
    ...over,
  };
  return d;
}

describe('the Export bindings', () => {
  it('are enabled with an active map and disabled without one', () => {
    const run = vi.fn();
    for (const id of [EXPORT_PNG, EXPORT_PDF, EXPORT_CAMPAIGN_PDF]) {
      expect(exportBindings('m1', run)[id].enabled).toBe(true);
      expect(exportBindings(null, run)[id].enabled).toBe(false);
    }
    exportBindings('m1', run)[EXPORT_PNG].run?.();
    expect(run).toHaveBeenLastCalledWith('png');
    exportBindings('m1', run)[EXPORT_PDF].run?.();
    expect(run).toHaveBeenLastCalledWith('pdf');
    exportBindings('m1', run)[EXPORT_CAMPAIGN_PDF].run?.();
    expect(run).toHaveBeenLastCalledWith('campaign');
    expect(run).toHaveBeenCalledTimes(3);
  });
});

describe('exportFileName', () => {
  it('is the map’s name with .png, or Map', () => {
    expect(exportFileName('Ashfall')).toBe('Ashfall.png');
    expect(exportFileName('  ')).toBe('Map.png');
    expect(exportFileName(null)).toBe('Map.png');
    expect(exportFileName('a/b:c')).toBe('a b c.png');
    expect(exportFileName('Ashfall', 'pdf')).toBe('Ashfall.pdf');
  });
});

describe('Export ▸ Map as PNG…', () => {
  it('asks in the campaign’s folder, then writes the PNG with 300 dpi', async () => {
    const d = deps();
    expect(await exportMap('png', d)).toBe('saved');
    expect(d.chooseFile).toHaveBeenCalledWith('Ashfall.png', '/Users/g/Campaigns', 'png');
    const [path, bytes] = d.writeFile.mock.calls[0] as unknown as [string, Uint8Array];
    expect(path).toBe('/Users/g/Campaigns/Ashfall.png');
    expect(new TextDecoder('latin1').decode(bytes)).toContain('pHYs');
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('300 dpi'), 'info');
  });

  it('starts in no folder for an Untitled campaign', async () => {
    const d = deps({ documentPath: vi.fn(async () => null) });
    await exportMap('png', d);
    expect(d.chooseFile).toHaveBeenCalledWith('Ashfall.png', undefined, 'png');
  });

  it('writes nothing, draws nothing and says nothing when the dialog is cancelled', async () => {
    const d = deps({ chooseFile: vi.fn(async () => null) });
    expect(await exportMap('png', d)).toBe('cancelled');
    expect(d.render).not.toHaveBeenCalled();
    expect(d.writeFile).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });

  it('tells the user when the export was clamped', async () => {
    const d = deps({
      render: vi.fn(async () => ({
        png: PNG,
        size: { w: 8192, h: 5000 },
        clamped: true,
      })),
    });
    expect(await exportMap('png', d)).toBe('saved');
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('smaller'), 'error');
  });

  it('reports a render that gives nothing, and a write that fails', async () => {
    const none = deps({ render: vi.fn(async () => null) });
    expect(await exportMap('png', none)).toBe('failed');
    expect(none.writeFile).not.toHaveBeenCalled();
    expect(none.notify).toHaveBeenCalledWith(expect.stringContaining('no map'), 'error');

    const bad = deps({
      writeFile: vi.fn(async () => {
        throw new Error('disk full');
      }),
    });
    expect(await exportMap('png', bad)).toBe('failed');
    expect(bad.notify).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error');
  });
});

describe('Export ▸ PDF…', () => {
  it('asks for a .pdf, then hands Rust the PNG and the map’s path', async () => {
    const d = deps({
      chooseFile: vi.fn(async () => '/Users/g/Campaigns/Ashfall.pdf' as string | null),
    });
    expect(await exportMap('pdf', d)).toBe('saved');
    expect(d.chooseFile).toHaveBeenCalledWith('Ashfall.pdf', '/Users/g/Campaigns', 'pdf');
    expect(d.writeFile).not.toHaveBeenCalled();
    const [path, [{ png, mapPath: map }]] = d.writePdf.mock.calls[0] as unknown as [
      string,
      { png: Uint8Array; mapPath: string }[],
    ];
    expect(path).toBe('/Users/g/Campaigns/Ashfall.pdf');
    // Rust lays this map's page and key out from the document
    expect(map).toBe('/maps/ashfall');
    expect(png.byteLength).toBe(PNG.byteLength);
    expect(d.notify).toHaveBeenCalledWith('Exported PDF.', 'info');
  });

  it('fails without a map path, since Rust has nothing to lay out', async () => {
    const d = deps({ mapPath: null });
    expect(await exportMap('pdf', d)).toBe('failed');
    expect(d.writePdf).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('no map'), 'error');
  });

  it('writes nothing and draws nothing when the dialog is cancelled', async () => {
    const d = deps({ chooseFile: vi.fn(async () => null) });
    expect(await exportMap('pdf', d)).toBe('cancelled');
    expect(d.render).not.toHaveBeenCalled();
    expect(d.writePdf).not.toHaveBeenCalled();
    expect(d.notify).not.toHaveBeenCalled();
  });

  it('reports a failed write and a clamped map', async () => {
    const bad = deps({
      writePdf: vi.fn(async () => {
        throw new Error('disk full');
      }),
    });
    expect(await exportMap('pdf', bad)).toBe('failed');
    expect(bad.notify).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error');
  });
});

describe('Export ▸ Campaign as PDF…', () => {
  const drawn = { png: PNG, size: { w: 1, h: 1 }, clamped: false };
  const campaign = (maps: (typeof drawn & { mapPath: string })[]) => ({
    campaignName: 'Doom of the Fen',
    documentPath: vi.fn(async () => '/Users/g/Campaigns/doom.campaign' as string | null),
    chooseFile: vi.fn(async () => '/Users/g/Campaigns/Doom.pdf' as string | null),
    render: vi.fn(async () => maps),
    writePdf: vi.fn(async () => {}),
    notify: vi.fn(),
  });

  it('hands Rust every map in order, each with its path, as one PDF', async () => {
    const d = campaign([
      { ...drawn, mapPath: '/maps/fen' },
      { ...drawn, mapPath: '/maps/orlo' },
    ]);
    expect(await exportCampaign(d)).toBe('saved');
    expect(d.chooseFile).toHaveBeenCalledWith('Doom of the Fen.pdf', '/Users/g/Campaigns', 'pdf');
    const [path, sheets] = d.writePdf.mock.calls[0] as unknown as [string, { mapPath: string }[]];
    expect(path).toBe('/Users/g/Campaigns/Doom.pdf');
    expect(sheets.map((s) => s.mapPath)).toEqual(['/maps/fen', '/maps/orlo']);
    expect(d.notify).toHaveBeenCalledWith('Exported 2 maps as PDF.', 'info');
  });

  it('writes nothing for a campaign with no map, and names an unnamed one Campaign', async () => {
    const d = { ...campaign([]), campaignName: '  ' };
    expect(await exportCampaign(d)).toBe('failed');
    expect(d.chooseFile).toHaveBeenCalledWith('Campaign.pdf', '/Users/g/Campaigns', 'pdf');
    expect(d.writePdf).not.toHaveBeenCalled();
  });
});
