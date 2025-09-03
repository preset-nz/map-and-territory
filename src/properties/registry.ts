export type FieldKind = 'select' | 'color' | 'text' | 'textarea' | 'number';

export interface BaseField {
  kind: FieldKind;
  id: string;
  label?: string;
  path: string; // simple dot path under target state (e.g., 'aspect')
}

export interface SelectFieldDef extends BaseField {
  kind: 'select';
  options: Array<{ value: string; label: string }>;
}

export interface ColorFieldDef extends BaseField { kind: 'color'; }
export interface TextFieldDef extends BaseField { kind: 'text'; placeholder?: string }
export interface TextareaFieldDef extends BaseField { kind: 'textarea'; placeholder?: string; rows?: number }
export interface NumberFieldDef extends BaseField { kind: 'number'; min?: number; max?: number; step?: number }

export type FieldDef = SelectFieldDef | ColorFieldDef | TextFieldDef | TextareaFieldDef | NumberFieldDef;

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

export function getPropertySchema(scope: string): PropertySchema | undefined {
  return schemas.get(scope);
}
