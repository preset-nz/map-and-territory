import React from "react";

export interface PropertyLabelProps {
  text: string;
  description?: string;
  className?: string;
}

export const PropertyLabel: React.FC<PropertyLabelProps> = ({
  text,
  description,
  className,
}) => {
  return (
    <div className={className}>
      <div className="text-xs text-foreground mb-0.5">{text}</div>
      {description ? (
        <div className="text-[11px] text-muted-foreground">{description}</div>
      ) : null}
    </div>
  );
};

export default PropertyLabel;
