import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface PropertyGroupProps {
  title: string;
  description?: string;
  collapsible?: boolean; // if false, acts as a static group box
  defaultCollapsed?: boolean; // initial collapsed state when uncontrolled
  collapsed?: boolean; // controlled state
  onCollapsedChange?: (collapsed: boolean) => void;
  actions?: React.ReactNode; // optional right-aligned actions in header
  className?: string;
  children: React.ReactNode;
}

/**
 * PropertyGroup – Group box with optional collapse behavior, inspired by Qt's QGroupBox.
 * - Uncontrolled by default; accepts controlled props when needed.
 * - Header toggles expansion when `collapsible` is true.
 */
export const PropertyGroup: React.FC<PropertyGroupProps> = ({
  title,
  description,
  collapsible = true,
  defaultCollapsed = false,
  collapsed,
  onCollapsedChange,
  actions,
  className,
  children,
}) => {
  const isControlled = typeof collapsed === "boolean";
  const [internalCollapsed, setInternalCollapsed] =
    React.useState<boolean>(defaultCollapsed);
  const isCollapsed = isControlled ? (collapsed as boolean) : internalCollapsed;

  const panelId = React.useId();

  const setCollapsed = (next: boolean) => {
    if (!isControlled) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  const toggle = () => setCollapsed(!isCollapsed);

  const headerClasses = cn(
    "flex min-w-0 items-center gap-2 text-sm text-foreground/90 outline-none",
    collapsible ? "cursor-pointer" : "cursor-default",
  );

  const icon = collapsible ? (
    isCollapsed ? (
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    ) : (
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    )
  ) : (
    <span className="h-4 w-4" aria-hidden />
  );

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background/60 shadow-xs",
        className,
      )}
      data-collapsible={collapsible ? "true" : "false"}
      data-collapsed={isCollapsed ? "true" : "false"}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {collapsible ? (
          <button
            type="button"
            className={headerClasses}
            aria-expanded={!isCollapsed}
            aria-controls={panelId}
            onClick={toggle}
          >
            {icon}
            <span className="truncate font-medium">{title}</span>
          </button>
        ) : (
          <div className={headerClasses} role="heading" aria-level={3}>
            {icon}
            <span className="truncate font-medium">{title}</span>
          </div>
        )}
        {actions ? (
          <div className="flex items-center gap-2 text-sm">{actions}</div>
        ) : null}
      </div>

      {description ? (
        <div className="px-3 -mt-1 pb-2 text-[11px] text-muted-foreground">
          {description}
        </div>
      ) : null}

      <div
        id={panelId}
        hidden={collapsible ? isCollapsed : false}
        className="px-3 pb-3"
      >
        {children}
      </div>
    </div>
  );
};

export default PropertyGroup;
