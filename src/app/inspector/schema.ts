// The inspector's schema: a kind's values (the registry schema the view carries) as a facets
// `PropertySchema`, and a field edit as a `value.set`. Generic over kinds, so a new layer kind
// gets its panel from its declaration; the bridge in `@preset.nz/pom` (design pom.md, "The
// facets bridge") replaces this when it is built. Values with a shape (paths, voxels, terrain
// lists) have no field and are left to their tools.
import type { DisabledWhen, FieldDef, FileFilter, PropertySchema } from '@preset.nz/facets';
import { cssColour } from '../scene/colour';

export interface ValueInfo {
  key: string;
  kind: string;
  range?: [number, number];
  choices?: string[];
  soft_max?: boolean;
}

/** Keys that read better with a label of their own. */
const LABELS: Record<string, string> = {
  usePaletteColor: 'Palette colour',
  lineWidth: 'Line width',
  strokeColor: 'Stroke colour',
  strokeWidth: 'Stroke width',
  strokePattern: 'Stroke pattern',
  offsetX: 'Offset X',
  offsetY: 'Offset Y',
  renderMode: 'Render mode',
  color: 'Colour',
  colour: 'Colour',
};

export const label = (key: string): string =>
  LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const title = (choice: string): string =>
  choice.replace(/(^|[-: ])(\w)/g, (_, a, c) => a + c.toUpperCase());

/**
 * A reference to a file, drawn as facets' `file` field (a path as written). The registry's
 * schema lists a type's references by key only, so what a field needs lives here, keyed
 * `type.key`. `command` is what a change runs; `null` clears the reference. A reference not
 * listed has no field.
 */
interface FileRef {
  command: string;
  recentKey: string;
  filters: FileFilter[];
  title: string;
  /** The value the field sits after; at the end when absent or not on the kind. */
  after?: string;
}

const FILE_REFS: Record<string, FileRef> = {
  'freeform.texture': {
    command: 'freeform.set-texture',
    recentKey: 'texture',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    title: 'Choose a Texture',
    after: 'renderMode',
  },
};

/** Whether a type's reference is a file field, and the command a change to it runs. */
export function fileRefCommand(type: string, key: string): string | undefined {
  return FILE_REFS[`${type}.${key}`]?.command;
}

/**
 * Values a freeform layer only uses in texture-fill mode are disabled otherwise. This is the
 * panel's, not the kind's: rhizome 0.1.7 has no condition on a value to declare it in Rust.
 * Move it onto the kind when rhizome has one.
 */
function disabledWhen(
  type: string,
  key: string,
  values: readonly ValueInfo[],
): DisabledWhen | undefined {
  const modes = values.find((v) => v.key === 'renderMode');
  if (type !== 'freeform' || !modes?.choices?.includes('texture-fill')) return undefined;
  if (key === 'texture' || /^texture[A-Z]/.test(key)) {
    return { path: 'renderMode', notEquals: 'texture-fill' };
  }
  return undefined;
}

/** The facets field for one value, or null when it has none. */
export function fieldFor(v: ValueInfo): FieldDef | null {
  const base = { id: v.key, path: v.key, label: label(v.key) };
  switch (v.kind) {
    case 'bool':
      return { ...base, kind: 'checkbox' };
    case 'text':
      return { ...base, kind: 'text' };
    case 'colour':
      return { ...base, kind: 'color' };
    case 'choice':
      return {
        ...base,
        kind: 'select',
        options: (v.choices ?? []).map((value) => ({ value, label: title(value) })),
      };
    case 'int':
    case 'float': {
      const integer = v.kind === 'int';
      const [min, max] = v.range ?? [undefined, undefined];
      const step = integer
        ? 1
        : max !== undefined && min !== undefined && max - min <= 1
          ? 0.01
          : 0.1;
      // a soft max is a control's end, not a limit: a number box lets it go past
      const bounded = min !== undefined && max !== undefined && !v.soft_max;
      return bounded && !integer
        ? { ...base, kind: 'slider', min, max, step }
        : { ...base, kind: 'number', min, max: v.soft_max ? undefined : max, step, integer };
    }
    default:
      return null;
  }
}

/** A kind's values as one group of fields, in declaration order. */
export function schemaFor(
  values: readonly ValueInfo[],
  refs: readonly string[] = [],
  type = '',
): PropertySchema {
  const rows: FieldDef[] = [];
  const fileFields = refs.flatMap((key) => {
    const ref = FILE_REFS[`${type}.${key}`];
    if (!ref) return [];
    const field: FieldDef = {
      kind: 'file',
      id: key,
      path: key,
      label: label(key),
      recentKey: ref.recentKey,
      filters: ref.filters,
      title: ref.title,
    };
    return [{ field, after: ref.after }];
  });
  const place = (after: string) => {
    for (const f of fileFields.filter((f) => f.after === after)) rows.push(f.field);
  };
  for (const v of values) {
    const f = fieldFor(v);
    if (f) rows.push(f);
    place(v.key);
  }
  for (const f of fileFields) {
    if (!rows.includes(f.field)) rows.push(f.field);
  }
  for (const f of rows) {
    const when = disabledWhen(type, 'path' in f && f.path ? f.path : '', values);
    if (when) f.disabledWhen = when;
  }
  return { version: 1, groups: [{ id: 'values', rows }] };
}

/** A CSS colour (`#rrggbb` or `#rrggbbaa`) as a rhizome colour, or undefined if it isn't one. */
export function parseColour(css: unknown): [number, number, number, number] | undefined {
  if (typeof css !== 'string') return undefined;
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(css);
  if (!m) return undefined;
  const n = Number.parseInt(m[1]!, 16);
  const a = m[2] ? Number.parseInt(m[2], 16) / 255 : 1;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
}

/** The panel's flat values for a row: colours as CSS, the rest as stored. */
export function readValues(
  values: Record<string, unknown> | undefined,
  info: readonly ValueInfo[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const v of info) {
    const stored = values?.[v.key];
    out[v.key] = v.kind === 'colour' ? cssColour(stored) : stored;
  }
  return out;
}

/** A node's file references as the panel's values: the path as written, or null when unset. */
export function readRefs(
  refs: Record<string, { file?: string }> | undefined,
  keys: readonly string[],
  type: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (FILE_REFS[`${type}.${key}`]) out[key] = refs?.[key]?.file ?? null;
  }
  return out;
}

/** The words of a refused command, from whatever the transport rejected with. */
export function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

/** What `value.set` is sent for a panel edit: colours back to rhizome's form. */
export function writeValue(info: ValueInfo | undefined, value: unknown): unknown {
  return info?.kind === 'colour' ? (parseColour(value) ?? value) : value;
}
