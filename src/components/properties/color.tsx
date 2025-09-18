import React from "react";
import { cn } from "@/lib/utils";

export interface ColorFieldProps {
  id?: string;
  label?: string;
  value: string; // e.g. #RRGGBB or #RRGGBBAA
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  presets?: string[]; // optional preset colors
}

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_PRESETS = [
  "#ffffff",
  "#f8f5e7",
  "#efe7d3",
  "#f5f5f5",
  "#e5e7eb",
  "#cccccc",
  "#000000",
];

export const ColorField: React.FC<ColorFieldProps> = ({
  id,
  label,
  value,
  onChange,
  readOnly,
  className,
  presets = DEFAULT_PRESETS,
}) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const swatchStyle: React.CSSProperties = { backgroundColor: value };
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <label htmlFor={inputId} className="text-xs text-foreground">
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={inputId}
              variant="outline"
              className="h-9 w-9 p-0 rounded-md border"
              aria-label={label ? `${label} preset` : "Color preset"}
              disabled={!!readOnly}
            >
              <div className="h-7 w-7 rounded" style={swatchStyle} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="grid grid-cols-7 gap-1 p-2 min-w-[0]"
          >
            {presets.map((c) => (
              <DropdownMenuItem
                key={c}
                onClick={() => onChange?.(c)}
                className="p-0"
                aria-label={c}
              >
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: c }}
                  aria-hidden="true"
                />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          type="text"
          value={value}
          onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
          disabled={!!readOnly}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={label ? `${label} hex` : "Color hex"}
        />
      </div>
    </div>
  );
};

export default ColorField;
