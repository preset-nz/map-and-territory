import { fieldFor, parseColour, readValues, schemaFor, writeValue } from '@/app/inspector/schema';

describe('the inspector schema', () => {
  it('maps each value kind to a field', () => {
    expect(fieldFor({ key: 'visible', kind: 'bool' })).toMatchObject({ kind: 'checkbox' });
    expect(fieldFor({ key: 'name', kind: 'text' })).toMatchObject({ kind: 'text', label: 'Name' });
    expect(fieldFor({ key: 'strokeColor', kind: 'colour' })).toMatchObject({
      kind: 'color',
      label: 'Stroke colour',
    });
    expect(
      fieldFor({ key: 'orientation', kind: 'choice', choices: ['pointy', 'flat'] }),
    ).toMatchObject({
      kind: 'select',
      options: [
        { value: 'pointy', label: 'Pointy' },
        { value: 'flat', label: 'Flat' },
      ],
    });
  });

  it('draws a bounded float as a slider and an int or soft-max value as a number', () => {
    expect(fieldFor({ key: 'opacity', kind: 'float', range: [0, 1] })).toMatchObject({
      kind: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
    });
    expect(fieldFor({ key: 'size', kind: 'float', range: [8, 120], soft_max: true })).toMatchObject(
      { kind: 'number', min: 8, max: undefined },
    );
    expect(fieldFor({ key: 'seed', kind: 'int', range: [0, 99] })).toMatchObject({
      kind: 'number',
      integer: true,
    });
  });

  it('leaves out shaped values and keeps declaration order', () => {
    const schema = schemaFor([
      { key: 'name', kind: 'text' },
      { key: 'paths', kind: 'shaped' },
      { key: 'visible', kind: 'bool' },
    ]);
    expect(schema.groups[0]!.rows.map((r) => (r as { id: string }).id)).toEqual([
      'name',
      'visible',
    ]);
  });

  it('round-trips a colour between rhizome and CSS', () => {
    expect(parseColour('#ff8000')).toEqual([1, 128 / 255, 0, 1]);
    expect(parseColour('#ff800080')?.[3]).toBeCloseTo(128 / 255);
    expect(parseColour('red')).toBeUndefined();
    const info = [{ key: 'c', kind: 'colour' }];
    expect(readValues({ c: [1, 0, 0, 1] }, info)).toEqual({ c: '#ff0000' });
    expect(writeValue(info[0], '#ff0000')).toEqual([1, 0, 0, 1]);
    expect(writeValue({ key: 'n', kind: 'float' }, 3)).toBe(3);
  });
});
