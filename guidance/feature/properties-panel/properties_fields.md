# Properties Panel Field Library

This document defines the reusable field components for the Properties Panel. All fields support read/write and read-only modes. Keep the surface minimal and composable; avoid hidden behaviors.

## Design Principles

- Clear interfaces: each field has a value, optional label, `readOnly`, and `onChange` for write mode.
- No sliders (per scope). Numeric inputs are plain input fields.
- Accessibility: fields use `<label>` and `id` where appropriate.
- Composition: 2D/3D numeric fields are built from 1D primitives.

## Components

- `PropertyLabel`
  - Props: `text: string`, `description?: string`
  - Purpose: display-only label block; no interactivity.

- `SelectField<T extends string|number>`
  - Props: `value: T`, `options: { value: T; label: string }[]`, `onChange?: (v:T) => void`, `placeholder?: string`, `readOnly?: boolean`, `label?: string`
  - Read-only: rendered disabled; no `onChange` calls.

- `ColorField`
  - Props: `value: string (hex)`, `onChange?: (hex:string) => void`, `readOnly?: boolean`, `label?: string`
  - Notes: shows native color input plus hex text input.

- `Int1D | Int2D | Int3D`
  - Props: `value: number | [number,number] | [number,number,number]`, `onChange?: (...) => void`, `readOnly?: boolean`, `label?: string`
  - Behavior: integer parsing, step=1.

- `Float1D | Float2D | Float3D`
  - Props: same shape as ints, plus `step?: number` (default 0.01)

## Read/Write vs. Read-Only

- All fields accept `readOnly?: boolean`.
- Read-only fields render disabled and do not call `onChange`.

## Import Surface

Import from the properties barrel as needed (or direct paths):

```ts
import { PropertyLabel } from "@/components/properties/label";
import { SelectField } from "@/components/properties/select";
import { ColorField } from "@/components/properties/color";
import {
  Int1D,
  Int2D,
  Int3D,
  Float1D,
  Float2D,
  Float3D,
} from "@/components/properties/number";
```

## Future Additions

- VectorN with configurable dimension and type; presets wrap it for 1D/2D/3D.
- Validation/error states and helper text.
- Preset pickers and advanced color inputs as needed.
