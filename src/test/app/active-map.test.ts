import { nextActiveMap } from '@/app/scene/active-map';

describe('the active map', () => {
  it('is the first map until something chooses another', () => {
    expect(nextActiveMap(null, [], [])).toBeNull();
    expect(nextActiveMap(null, [], ['a'])).toBe('a');
  });

  it('becomes a map that has just been added', () => {
    expect(nextActiveMap('a', ['a'], ['a', 'b'])).toBe('b');
  });

  it('stays while it exists, and falls back to the first when it goes', () => {
    expect(nextActiveMap('b', ['a', 'b'], ['b', 'a'])).toBe('b');
    expect(nextActiveMap('b', ['a', 'b'], ['a'])).toBe('a');
    expect(nextActiveMap('b', ['b'], [])).toBeNull();
  });

  it('does not jump on a wholesale change, such as opening another campaign', () => {
    expect(nextActiveMap('a', ['a'], ['x', 'y'])).toBe('x');
  });
});
