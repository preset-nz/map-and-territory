import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ScaleBarPlacement } from "@/types/scale";

interface ScaleBarProps {
  placement: ScaleBarPlacement;
  unitLabel: string;
  unitShortLabel: string;
  unitsPerHex: number;
  hexSize: number;
  orientation: "pointy" | "flat";
  paperWidth: number;
}

const MIN_BAR_WIDTH = 80;
const MAX_BAR_WIDTH = 240;

function formatMeasurement(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toString();
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, "");
  if (abs >= 1) return value.toFixed(2).replace(/\.0+$/, "");
  if (abs >= 0.1) return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return value.toPrecision(2).replace(/\.0+e/, "e");
}

function computeNiceUnits(target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 1;
  const steps = [1, 2, 2.5, 5];
  const candidates = new Set<number>();
  const exponent = Math.floor(Math.log10(target));
  for (let offset = -2; offset <= 2; offset += 1) {
    const base = Math.pow(10, exponent + offset);
    for (const step of steps) {
      candidates.add(step * base);
    }
  }
  const sorted = Array.from(candidates)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  let best = sorted[0] ?? target;
  let smallestDiff = Number.POSITIVE_INFINITY;
  for (const candidate of sorted) {
    if (candidate <= target && Math.abs(candidate - target) < smallestDiff) {
      best = candidate;
      smallestDiff = Math.abs(candidate - target);
    }
  }
  if (best <= 0) best = target;
  return best;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({
  placement,
  unitLabel,
  unitShortLabel,
  unitsPerHex,
  hexSize,
  orientation,
  paperWidth,
}) => {
  const metrics = useMemo(() => {
    const safeHex = Math.max(1, Number.isFinite(hexSize) ? hexSize : 1);
    const pxPerHex =
      orientation === "flat" ? safeHex * 2 : Math.sqrt(3) * safeHex;
    if (!Number.isFinite(unitsPerHex) || unitsPerHex <= 0 || pxPerHex <= 0)
      return null;
    const pxPerUnit = pxPerHex / unitsPerHex;
    if (!Number.isFinite(pxPerUnit) || pxPerUnit <= 0) return null;
    const usableWidth = Math.max(0, paperWidth - 32);
    if (usableWidth < MIN_BAR_WIDTH) return null;
    const maxWidth = Math.min(MAX_BAR_WIDTH, usableWidth);
    const targetUnits = maxWidth / pxPerUnit;
    const niceUnits = computeNiceUnits(targetUnits);
    const barPx = Math.min(maxWidth, niceUnits * pxPerUnit);
    const segmentCount = niceUnits >= 5 ? 5 : niceUnits >= 2 ? 4 : 2;
    return {
      barPx,
      niceUnits,
      segmentCount,
      pxPerUnit,
    };
  }, [hexSize, orientation, paperWidth, unitsPerHex]);

  if (!metrics || metrics.barPx <= 0) return null;

  const { barPx, niceUnits, segmentCount } = metrics;

  const colorScheme =
    placement === "overlay"
      ? {
          container: "bg-black/65 border-white/15 text-white backdrop-blur-sm",
          border: "rgba(255,255,255,0.4)",
          primary: "rgba(255,255,255,0.9)",
          secondary: "rgba(255,255,255,0.15)",
          caption: "text-white/70",
          label: "text-white/60",
        }
      : {
          container: "bg-muted border-border text-foreground",
          border: "rgba(0,0,0,0.25)",
          primary: "rgba(0,0,0,0.6)",
          secondary: "rgba(0,0,0,0.1)",
          caption: "text-muted-foreground",
          label: "text-muted-foreground/70",
        };

  return (
    <div className="pointer-events-none select-none text-[11px] leading-tight">
      <div
        className={cn(
          "rounded-md px-3 py-2 shadow-sm border flex flex-col gap-1 w-max",
          colorScheme.container,
        )}
      >
        <div className="flex items-end gap-2">
          <div
            className="flex h-[8px] overflow-hidden rounded-sm border"
            style={{
              width: `${barPx}px`,
              borderColor: colorScheme.border,
            }}
          >
            {Array.from({ length: segmentCount }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor:
                    idx % 2 === 0 ? colorScheme.primary : colorScheme.secondary,
                }}
              />
            ))}
          </div>
          <div className="font-medium whitespace-nowrap">
            {formatMeasurement(niceUnits)} {unitShortLabel}
          </div>
        </div>
        <div
          className={cn(
            "text-[10px] uppercase tracking-[0.08em]",
            colorScheme.caption,
          )}
        >
          1 hex ≈ {formatMeasurement(unitsPerHex)} {unitShortLabel}
        </div>
        <div className={cn("text-[10px]", colorScheme.label)}>{unitLabel}</div>
      </div>
    </div>
  );
};

export default ScaleBar;
