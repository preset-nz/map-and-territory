import {
  fieldFor,
  fileRefCommand,
  messageOf,
  parseColour,
  readRefs,
  readValues,
  schemaFor,
  valueCommand,
  writeValue,
} from '@/app/inspector/schema';

describe('the inspector schema', () => {
  it('maps each value kind to a field', () => {
    expect(fieldFor({ key: 'visible', kind: 'bool' })).toMatchObject({ kind: 'checkbox' });
    expect(fieldFor({ key: 'name', kind: 'text' })).toMatchObject({ kind: 'text', label: 'Name' });
    expect(
      fieldFor({
        key: 'strokeColor',
        kind: 'colour',
        label: 'Stroke colour',
        description: 'The colour of the line.',
      }),
    ).toMatchObject({ kind: 'color', label: 'Stroke colour', help: 'The colour of the line.' });
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

  it("gives the title's override field the source as its placeholder, and only that field", () => {
    const rows = schemaFor(
      [
        { key: 'name', kind: 'text' },
        { key: 'title', kind: 'text' },
        { key: 'subtitle', kind: 'text' },
        {
          key: 'face',
          kind: 'choice',
          choices: ['condensed', 'serif'],
          choice_labels: { condensed: 'Condensed', serif: 'Serif' },
        },
      ],
      [],
      'cartouche',
    ).groups[0]?.rows as { id: string; placeholder?: string; options?: unknown }[];
    expect(rows.map((r) => [r.id, r.placeholder])).toEqual([
      ['name', undefined],
      ['title', "The map's name"],
      ['subtitle', undefined],
      ['face', undefined],
    ]);
    expect(rows[3]?.options).toEqual([
      { value: 'condensed', label: 'Condensed' },
      { value: 'serif', label: 'Serif' },
    ]);
    // another kind's `title` has none
    const other = schemaFor([{ key: 'title', kind: 'text' }], [], 'map').groups[0]?.rows[0];
    expect((other as { placeholder?: string }).placeholder).toBeUndefined();
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

  describe('the paper texture', () => {
    const values = [
      { key: 'aspect', kind: 'choice', choices: ['square', '4:3', '16:10'] },
      { key: 'color', kind: 'colour' },
      {
        key: 'textureBlend',
        kind: 'choice',
        choices: ['normal', 'multiply'],
        label: 'Mix with paper',
        choice_labels: { normal: 'Image only', multiply: 'Multiply' },
      },
      {
        key: 'textureFit',
        kind: 'choice',
        choices: ['cover', 'contain', 'repeat'],
        label: 'Texture fit',
        choice_labels: { cover: 'Cover', contain: 'Fit', repeat: 'Repeat' },
      },
      { key: 'textureScale', kind: 'float', range: [0.05, 8], label: 'Texture scale' },
    ];
    const rows = schemaFor(values, ['texture'], 'paper').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;

    it('is a file field after the colour, running paper.set-texture', () => {
      expect(byId('texture')).toMatchObject({
        kind: 'file',
        label: 'Texture',
        recentKey: 'texture',
        title: 'Choose a Paper Texture',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      expect(rows.map((r) => (r as { id: string }).id).slice(1, 3)).toEqual(['color', 'texture']);
      expect(fileRefCommand('paper', 'texture')).toBe('paper.set-texture');
    });

    it('disables the texture values while no texture is set, with the kind’s words', () => {
      const off = { path: 'texture', equals: null };
      for (const id of ['textureBlend', 'textureFit', 'textureScale']) {
        expect(byId(id).disabledWhen).toEqual(off);
      }
      expect(byId('texture').disabledWhen).toBeUndefined();
      expect(byId('color').disabledWhen).toBeUndefined();
      expect(byId('textureBlend')).toMatchObject({
        label: 'Mix with paper',
        options: [
          { value: 'normal', label: 'Image only' },
          { value: 'multiply', label: 'Multiply' },
        ],
      });
      expect(byId('textureFit')).toMatchObject({
        options: [
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Fit' },
          { value: 'repeat', label: 'Repeat' },
        ],
      });
      expect(byId('textureScale').label).toBe('Texture scale');
    });
  });

  describe('the freeform texture', () => {
    const values = [
      { key: 'renderMode', kind: 'choice', choices: ['paint', 'texture-fill'] },
      { key: 'textureFillInvert', kind: 'bool' },
      { key: 'textureScale', kind: 'float', range: [0.05, 8] },
      { key: 'opacity', kind: 'float', range: [0, 1] },
    ];
    const rows = schemaFor(values, ['texture', 'palette'], 'freeform').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as {
        kind: string;
        label: string;
        recentKey?: string;
        filters?: unknown;
        title?: string;
        disabledWhen?: unknown;
      };

    it('is a file field with its recent key, filters and title, after the render mode', () => {
      expect(byId('texture')).toMatchObject({
        kind: 'file',
        label: 'Texture',
        recentKey: 'texture',
        title: 'Choose a Texture',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      const ids = rows.map((r) => (r as { id: string }).id);
      expect(ids.slice(0, 2)).toEqual(['renderMode', 'texture']);
      // a reference without a file field (the palette) draws nothing
      expect(ids).not.toContain('palette');
    });

    it('is enabled only in texture-fill mode, like the texture values', () => {
      const off = { path: 'renderMode', notEquals: 'texture-fill' };
      expect(byId('texture').disabledWhen).toEqual(off);
      expect(byId('textureFillInvert').disabledWhen).toEqual(off);
      expect(byId('textureScale').disabledWhen).toEqual(off);
      expect(byId('renderMode').disabledWhen).toBeUndefined();
      expect(byId('opacity').disabledWhen).toBeUndefined();
    });

    it('gives other kinds no file field and no enablement', () => {
      expect(schemaFor(values, ['texture'], 'outline').groups[0]?.rows).toHaveLength(4);
      expect(byId('textureScale')).toBeDefined();
    });

    it('reads the path as written, or null when unset', () => {
      expect(readRefs({ texture: { file: 'maps/a.png' } }, ['texture'], 'freeform')).toEqual({
        texture: 'maps/a.png',
      });
      expect(readRefs(undefined, ['texture', 'palette'], 'freeform')).toEqual({ texture: null });
    });

    it('finds the words of a refusal', () => {
      expect(messageOf('not an image')).toBe('not an image');
      expect(messageOf(new Error('too big'))).toBe('too big');
      expect(messageOf({ message: 'unreadable' })).toBe('unreadable');
    });
  });

  it('gives the image layer an image field and greys its placing until one is set', () => {
    const values = [
      { key: 'name', kind: 'text' },
      { key: 'blend', kind: 'choice', choices: ['normal', 'multiply'] },
      { key: 'fit', kind: 'choice', choices: ['cover', 'contain', 'repeat'] },
      { key: 'scale', kind: 'float', range: [0.05, 8] as [number, number] },
    ];
    const rows = schemaFor(values, ['file'], 'image').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    expect(rows.map((r) => (r as { id: string }).id)).toEqual([
      'name',
      'blend',
      'file',
      'fit',
      'scale',
    ]);
    expect(byId('file')).toMatchObject({
      kind: 'file',
      recentKey: 'image',
      title: 'Choose an Image',
    });
    expect(fileRefCommand('image', 'file')).toBe('image.set-file');
    expect(byId('fit').disabledWhen).toEqual({ path: 'file', equals: null });
    expect(byId('blend').disabledWhen).toBeUndefined();
  });

  it("greys the grid's line colour while the palette colour is on", () => {
    const values = [
      { key: 'color', kind: 'colour' },
      { key: 'usePaletteColor', kind: 'bool' },
    ];
    const rows = schemaFor(values, [], 'hexgrid').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    expect(byId('color').disabledWhen).toEqual({ path: 'usePaletteColor', equals: true });
    expect(byId('usePaletteColor').disabledWhen).toBeUndefined();
  });

  it("greys the grid's line width while Hairline is on", () => {
    const values = [
      { key: 'lineWidth', kind: 'float' },
      { key: 'hairline', kind: 'bool' },
    ];
    const rows = schemaFor(values, [], 'hexgrid').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    expect(byId('lineWidth').disabledWhen).toEqual({ path: 'hairline', equals: true });
    expect(byId('hairline').disabledWhen).toBeUndefined();
  });

  it("greys the grid's dash and gap lengths while the line is solid", () => {
    const values = [
      { key: 'lineStyle', kind: 'choice', choices: ['solid', 'dashed', 'dotted', 'dash-dot'] },
      { key: 'dashLength', kind: 'float' },
      { key: 'gapLength', kind: 'float' },
    ];
    const rows = schemaFor(values, [], 'hexgrid').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    const solid = { path: 'lineStyle', equals: 'solid' };
    expect(byId('dashLength').disabledWhen).toEqual(solid);
    expect(byId('gapLength').disabledWhen).toEqual(solid);
    expect(byId('lineStyle').disabledWhen).toBeUndefined();
  });

  it("greys the grid's width noise fields unless the line is solid, and on a hairline", () => {
    const values = [
      { key: 'lineStyle', kind: 'choice', choices: ['solid', 'dashed', 'dotted', 'dash-dot'] },
      { key: 'widthNoise', kind: 'float' },
      { key: 'noiseScale', kind: 'float' },
      { key: 'joinCorners', kind: 'bool' },
    ];
    const rows = schemaFor(values, [], 'hexgrid').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    const moot = [
      { path: 'lineStyle', notEquals: 'solid' },
      { path: 'hairline', equals: true },
    ];
    expect(byId('widthNoise').disabledWhen).toEqual(moot);
    expect(byId('noiseScale').disabledWhen).toEqual(moot);
    expect(byId('joinCorners').disabledWhen).toEqual(moot);
    expect(byId('lineStyle').disabledWhen).toBeUndefined();
  });

  it("runs the compass's style through compass.set-style, and every other value as value.set", () => {
    expect(valueCommand('compass', 'style')).toBe('compass.set-style');
    expect(valueCommand('compass', 'labels')).toBeUndefined();
    expect(valueCommand('cartouche', 'style')).toBeUndefined();
  });

  it("greys a compass's words it won't print, and shows each word's letter as its placeholder", () => {
    const values = ['style', 'labels', 'labelN', 'labelE', 'labelS', 'labelW'].map((key) => ({
      key,
      kind: key.startsWith('label') && key !== 'labels' ? 'text' : 'choice',
    }));
    const rows = schemaFor(values, [], 'compass').groups[0]?.rows ?? [];
    const byId = (id: string) =>
      rows.find((r) => (r as { id: string }).id === id) as never as Record<string, unknown>;
    expect(byId('labelN').disabledWhen).toEqual({ path: 'labels', equals: 'none' });
    expect(byId('labelN').placeholder).toBe('N');
    for (const id of ['labelE', 'labelS', 'labelW']) {
      expect(byId(id).disabledWhen).toEqual([
        { path: 'labels', notEquals: 'cardinal' },
        { path: 'style', equals: 'mark' },
        { path: 'style', equals: 'arrow' },
      ]);
    }
    expect(byId('labelW').placeholder).toBe('W');
    expect(byId('style').disabledWhen).toBeUndefined();
  });
});
