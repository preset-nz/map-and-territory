import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Tuple2<T> = [T, T];
type Tuple3<T> = [T, T, T];

export interface NumberFieldBaseProps {
  id?: string;
  label?: string;
  readOnly?: boolean;
  className?: string;
}

// INT FIELDS
export interface Int1DProps extends NumberFieldBaseProps {
  value: number;
  onChange?: (value: number) => void;
}

export interface Int2DProps extends NumberFieldBaseProps {
  value: Tuple2<number>;
  onChange?: (value: Tuple2<number>) => void;
}

export interface Int3DProps extends NumberFieldBaseProps {
  value: Tuple3<number>;
  onChange?: (value: Tuple3<number>) => void;
}

export const Int1D: React.FC<Int1DProps> = ({ id, label, value, onChange, readOnly, className }) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <label htmlFor={inputId} className="text-xs text-foreground">{label}</label> : null}
      <Input
        id={inputId}
        type="number"
        inputMode="numeric"
        step={1}
        value={Number.isFinite(value) ? value : 0}
        onChange={readOnly ? undefined : (e) => onChange?.(parseInt(e.target.value || '0', 10))}
        disabled={!!readOnly}
      />
    </div>
  );
};

export const Int2D: React.FC<Int2DProps> = ({ id, label, value, onChange, readOnly, className }) => {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const [x, y] = value;
  const update = (nx: number, ny: number) => onChange?.([nx, ny]);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <div className="text-xs text-foreground">{label}</div> : null}
      <div className="flex gap-2">
        <Input id={`${baseId}-x`} type="number" inputMode="numeric" step={1}
          value={Number.isFinite(x) ? x : 0}
          onChange={readOnly ? undefined : (e) => update(parseInt(e.target.value || '0', 10), y)}
          disabled={!!readOnly} placeholder="X" />
        <Input id={`${baseId}-y`} type="number" inputMode="numeric" step={1}
          value={Number.isFinite(y) ? y : 0}
          onChange={readOnly ? undefined : (e) => update(x, parseInt(e.target.value || '0', 10))}
          disabled={!!readOnly} placeholder="Y" />
      </div>
    </div>
  );
};

export const Int3D: React.FC<Int3DProps> = ({ id, label, value, onChange, readOnly, className }) => {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const [x, y, z] = value;
  const update = (nx: number, ny: number, nz: number) => onChange?.([nx, ny, nz]);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <div className="text-xs text-foreground">{label}</div> : null}
      <div className="flex gap-2">
        <Input id={`${baseId}-x`} type="number" inputMode="numeric" step={1}
          value={Number.isFinite(x) ? x : 0}
          onChange={readOnly ? undefined : (e) => update(parseInt(e.target.value || '0', 10), y, z)}
          disabled={!!readOnly} placeholder="X" />
        <Input id={`${baseId}-y`} type="number" inputMode="numeric" step={1}
          value={Number.isFinite(y) ? y : 0}
          onChange={readOnly ? undefined : (e) => update(x, parseInt(e.target.value || '0', 10), z)}
          disabled={!!readOnly} placeholder="Y" />
        <Input id={`${baseId}-z`} type="number" inputMode="numeric" step={1}
          value={Number.isFinite(z) ? z : 0}
          onChange={readOnly ? undefined : (e) => update(x, y, parseInt(e.target.value || '0', 10))}
          disabled={!!readOnly} placeholder="Z" />
      </div>
    </div>
  );
};

// FLOAT FIELDS
export interface Float1DProps extends NumberFieldBaseProps {
  value: number;
  onChange?: (value: number) => void;
  step?: number; // default 0.01
}

export interface Float2DProps extends NumberFieldBaseProps {
  value: Tuple2<number>;
  onChange?: (value: Tuple2<number>) => void;
  step?: number;
}

export interface Float3DProps extends NumberFieldBaseProps {
  value: Tuple3<number>;
  onChange?: (value: Tuple3<number>) => void;
  step?: number;
}

export const Float1D: React.FC<Float1DProps> = ({ id, label, value, onChange, readOnly, className, step = 0.01 }) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <label htmlFor={inputId} className="text-xs text-foreground">{label}</label> : null}
      <Input
        id={inputId}
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={readOnly ? undefined : (e) => onChange?.(parseFloat(e.target.value || '0'))}
        disabled={!!readOnly}
      />
    </div>
  );
};

export const Float2D: React.FC<Float2DProps> = ({ id, label, value, onChange, readOnly, className, step = 0.01 }) => {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const [x, y] = value;
  const update = (nx: number, ny: number) => onChange?.([nx, ny]);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <div className="text-xs text-foreground">{label}</div> : null}
      <div className="flex gap-2">
        <Input id={`${baseId}-x`} type="number" step={step}
          value={Number.isFinite(x) ? x : 0}
          onChange={readOnly ? undefined : (e) => update(parseFloat(e.target.value || '0'), y)}
          disabled={!!readOnly} placeholder="X" />
        <Input id={`${baseId}-y`} type="number" step={step}
          value={Number.isFinite(y) ? y : 0}
          onChange={readOnly ? undefined : (e) => update(x, parseFloat(e.target.value || '0'))}
          disabled={!!readOnly} placeholder="Y" />
      </div>
    </div>
  );
};

export const Float3D: React.FC<Float3DProps> = ({ id, label, value, onChange, readOnly, className, step = 0.01 }) => {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const [x, y, z] = value;
  const update = (nx: number, ny: number, nz: number) => onChange?.([nx, ny, nz]);
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <div className="text-xs text-foreground">{label}</div> : null}
      <div className="flex gap-2">
        <Input id={`${baseId}-x`} type="number" step={step}
          value={Number.isFinite(x) ? x : 0}
          onChange={readOnly ? undefined : (e) => update(parseFloat(e.target.value || '0'), y, z)}
          disabled={!!readOnly} placeholder="X" />
        <Input id={`${baseId}-y`} type="number" step={step}
          value={Number.isFinite(y) ? y : 0}
          onChange={readOnly ? undefined : (e) => update(x, parseFloat(e.target.value || '0'), z)}
          disabled={!!readOnly} placeholder="Y" />
        <Input id={`${baseId}-z`} type="number" step={step}
          value={Number.isFinite(z) ? z : 0}
          onChange={readOnly ? undefined : (e) => update(x, y, parseFloat(e.target.value || '0'))}
          disabled={!!readOnly} placeholder="Z" />
      </div>
    </div>
  );
};

const NumberFields = { Int1D, Int2D, Int3D, Float1D, Float2D, Float3D };
export default NumberFields;
