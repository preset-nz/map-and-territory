import { describe, expect, it } from 'vitest';
import { layerComposite } from '@/render/composite';

describe('layerComposite', () => {
  it('draws directly at opacity 1 and normal', () => {
    expect(layerComposite({})).toBeNull();
    expect(layerComposite({ opacity: 1, blend: 'normal' })).toBeNull();
  });
  it('composites for opacity or blend', () => {
    expect(layerComposite({ opacity: 0.5 })).toEqual({ opacity: 0.5, operation: 'source-over' });
    expect(layerComposite({ blend: 'multiply' })).toEqual({ opacity: 1, operation: 'multiply' });
  });
  it('clamps and ignores unknown modes', () => {
    expect(layerComposite({ opacity: 3, blend: 'copy' })).toBeNull();
    expect(layerComposite({ opacity: -1 })?.opacity).toBe(0);
  });
});
