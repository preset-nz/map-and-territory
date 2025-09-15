import React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxFieldProps {
  id?: string;
  label?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  id,
  label,
  checked,
  onChange,
  className,
}) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        id={inputId}
        type="checkbox"
        className="h-3 w-3"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label ? (
        <label htmlFor={inputId} className="text-xs">
          {label}
        </label>
      ) : null}
    </div>
  );
};

export default CheckboxField;
