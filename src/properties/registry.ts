export type FieldKind =
  | "select"
  | "color"
  | "text"
  | "textarea"
  | "number"
  | "slider"
  | "checkbox";

export interface BaseField {
  kind: FieldKind;
  id: string;
  label?: string;
  path: string; // simple dot path under target state (e.g., 'aspect')
  // Optional: simple conditional disabling
  disabledWhen?: { path: string; equals?: unknown; notEquals?: unknown };
}

export interface SelectOption {
  value: string;
  label: string;
  swatches?: string[];
}

export interface SelectFieldDef extends BaseField {
  kind: "select";
  options?: SelectOption[];
  // Dynamic options provider for host-app dependent lists (e.g., palette)
  // Note: the function receives the AppAPI via a very light indirection to avoid cycles.
  // The panel calls this with `getAppAPI()`.
  optionsProvider?: (app: unknown) => SelectOption[];
}

export interface ColorFieldDef extends BaseField {
  kind: "color";
  presets?: string[];
}
export interface TextFieldDef extends BaseField {
  kind: "text";
  placeholder?: string;
}
export interface TextareaFieldDef extends BaseField {
  kind: "textarea";
  placeholder?: string;
  rows?: number;
}
export interface NumberFieldDef extends BaseField {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
}
export interface SliderFieldDef extends BaseField {
  kind: "slider";
  min?: number;
  max?: number;
  step?: number;
}
export interface CheckboxFieldDef extends BaseField {
  kind: "checkbox";
}

export type FieldDef =
  | SelectFieldDef
  | ColorFieldDef
  | TextFieldDef
  | TextareaFieldDef
  | NumberFieldDef
  | SliderFieldDef
  | CheckboxFieldDef;

export interface PropertyGroupDef {
  id: string;
  title: string;
  rows: Array<FieldDef | FieldDef[]>;
}

export interface PropertySchema {
  groups: PropertyGroupDef[];
}

const schemas = new Map<string, PropertySchema>();

export function registerPropertySchema(scope: string, schema: PropertySchema) {
  schemas.set(scope, schema);
}

export function unregisterPropertySchema(scope: string) {
  schemas.delete(scope);
}

export function getPropertySchema(scope: string): PropertySchema | undefined {
  return schemas.get(scope);
}
