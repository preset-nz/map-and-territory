import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN_LAYER_TYPES, registerBuiltinLayers } from '@/layers/builtin';
import { getLayerType } from '@/layers/registry';
import { gridEnv } from '@/render/grid-env';
import type { SceneFrame } from '@/render/types';

// The kind names the document gives layers: the anchors' NodeType names and each LayerKind id.
function documentLayerKinds(): string[] {
  const src = readFileSync(
    resolve(__dirname, '../../../src-tauri/src/object_model/kinds.rs'),
    'utf8',
  );
  const anchors = [...src.matchAll(/NodeType::new\("(paper|hexgrid)"\)/g)].map((m) => m[1]!);
  const layers = [...src.matchAll(/^\s+id: "([a-z-]+)",$/gm)].map((m) => m[1]!);
  return [...new Set([...anchors, ...layers])];
}

describe('built-in layers', () => {
  it('registers a drawing adapter for every layer kind the document has', () => {
    registerBuiltinLayers();
    const kinds = documentLayerKinds();
    expect(kinds).toEqual(
      expect.arrayContaining(['paper', 'hexgrid', 'hex-noise', 'freeform', 'outline']),
    );
    for (const kind of kinds) {
      expect(typeof getLayerType(kind)?.adapter.drawMain, kind).toBe('function');
    }
  });

  it('has no adapter the document cannot make', () => {
    const kinds = documentLayerKinds();
    for (const t of BUILTIN_LAYER_TYPES) expect(kinds).toContain(t.id);
  });
});

describe('gridEnv', () => {
  const frame = (layers: SceneFrame['layers']) => ({ layers }) as unknown as SceneFrame;

  it("reads size and orientation from the hexgrid layer's state", () => {
    const env = gridEnv(
      frame([
        { id: 'g', type: 'hexgrid', visible: true, state: { size: 24, orientation: 'flat' } },
      ]),
    );
    expect(env).toEqual({ size: 24, orientation: 'flat' });
  });

  it('defaults to 16 px pointy and never goes under 4 px', () => {
    expect(gridEnv(frame([{ id: 'g', type: 'hexgrid', visible: true, state: {} }]))).toEqual({
      size: 16,
      orientation: 'pointy',
    });
    expect(
      gridEnv(frame([{ id: 'g', type: 'hexgrid', visible: true, state: { size: 1 } }]))?.size,
    ).toBe(4);
  });

  it('is undefined without a hexgrid layer', () => {
    expect(gridEnv(frame([]))).toBeUndefined();
  });
});
