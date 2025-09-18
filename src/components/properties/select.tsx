import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/properties/registry";

export interface SelectFieldProps {
  id?: string;
  label?: string;
  value: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  className,
}) => {
  const generatedId = React.useId();
  const buttonId = id ?? generatedId;
  const current = options.find((o) => o.value === value) ?? options[0];
  const renderSwatches = (swatches?: string[]) => {
    if (!swatches?.length) return null;
    const limited = swatches.slice(0, 5);
    return (
      <span className="flex items-center gap-1" aria-hidden="true">
        {limited.map((color, idx) => (
          <span
            key={`${color}-${idx}`}
            className="h-3 w-3 rounded-sm border border-border"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    );
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <label htmlFor={buttonId} className="text-xs text-foreground">
          {label}
        </label>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={buttonId}
            variant="outline"
            className="justify-between h-9 px-3 text-sm"
          >
            <span className="flex items-center gap-2">
              {renderSwatches(current?.swatches)}
              <span>{current?.label ?? value}</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange?.(opt.value)}
              aria-label={opt.label}
            >
              <span className="flex items-center gap-2">
                {renderSwatches(opt.swatches)}
                <span>{opt.label}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SelectField;
