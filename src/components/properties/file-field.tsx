"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { PropertyLabel } from "./label";

export interface FileFieldProps {
  label: string;
  fileName?: string;
  disabled?: boolean;
  accept?: string;
  helperText?: string;
  onPick(file: File): void;
  onClear?(): void;
}

export const FileField: React.FC<FileFieldProps> = ({
  label,
  fileName,
  disabled = false,
  accept,
  helperText,
  onPick,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <PropertyLabel text={label} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {fileName ? "Replace" : "Upload"}
        </Button>
        <span className="text-xs text-muted-foreground truncate">
          {fileName || "No file selected"}
        </span>
        {fileName && onClear ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onClear?.()}
            disabled={disabled}
          >
            Clear
          </Button>
        ) : null}
      </div>
      {helperText ? (
        <div className="text-[11px] text-muted-foreground mt-1">
          {helperText}
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onPick(file);
            // Reset input so selecting same file again triggers change
            event.target.value = "";
          }
        }}
      />
    </div>
  );
};

export default FileField;
