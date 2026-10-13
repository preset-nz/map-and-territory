// The inspector's schema: a kind's values (the registry schema the view carries) as a facets
// `PropertySchema`, and a field edit as a `value.set`. Generic over kinds, so a new layer kind
// gets its panel from its declaration; the bridge in `@preset.nz/pom` (design pom.md, "The
// facets bridge") replaces this when it is built. Values with a shape (paths, voxels, terrain
// lists) have no field and are left to their tools.
import type { FieldDef, PropertySchema } from '@preset.nz/facets';
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
export function schemaFor(values: readonly ValueInfo[]): PropertySchema {
  const rows = values.map(fieldFor).filter((f): f is FieldDef => f !== null);
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

/** What `value.set` is sent for a panel edit: colours back to rhizome's form. */
export function writeValue(info: ValueInfo | undefined, value: unknown): unknown {
  return info?.kind === 'colour' ? (parseColour(value) ?? value) : value;
}
