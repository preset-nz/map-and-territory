"use client";

/**
 * StatusBar - Information-rich footer component for the hexmap editor
 *
 * Displays current active tool, zoom level, mouse coordinates,
 * document save status, and selection information.
 *
 * Features:
 * - Fixed height 24px positioned at bottom of layout
 * - Real-time status information display
 * - Integration with layout and tool stores
 */

import React from "react";
import { Separator } from "@/components/ui/separator";
import { useActiveSetting, useActiveSettingId } from "@/stores/selectors/hooks";

import { useLayoutStore } from "@/stores/layout";
import { useSelectionStore } from "@/stores/selection";
import { useCampaignStore } from "@/stores/campaign";

// ============================================================================
// StatusBar Component
// ============================================================================

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className = "" }) => {
  const activeTool = useLayoutStore((state) => state.activeTool);
  const mousePosition = useLayoutStore((state) => state.mousePosition);
  const selectionCount = useLayoutStore((state) => state.selectionCount);
  const settingId = useActiveSettingId();
  const setting = useActiveSetting();
  const selection = useSelectionStore((s) => s.selection);
  const dirty = useCampaignStore((s) => s.dirty);
  const hasCampaign = useCampaignStore((s) => !!s.current);

  // Mock zoom level - in real app this would come from a viewport store
  const zoomLevel = 100;

  /**
   * Format tool name for display
   */
  const formatToolName = (tool: string): string => {
    const toolNames: Record<string, string> = {
      select: "Select",
      paint: "Hex Paint",
      draw: "Draw",
      erase: "Erase",
      text: "Text",
      zoom: "Zoom",
      grid: "Grid",
    };
    return toolNames[tool] || tool.charAt(0).toUpperCase() + tool.slice(1);
  };

  /**
   * Format selection count for display
   */
  const formatSelectionInfo = (): string => {
    if (selectionCount === 0) {
      return "No selection";
    }
    if (selectionCount === 1) {
      return "1 selected";
    }
    return `${selectionCount} selected`;
  };

  return (
    <div
      data-testid="status-bar"
      className={`h-6 border-t bg-muted/30 text-xs flex items-center px-3 gap-4 ${className}`}
    >
      {/* Active Tool */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Tool:</span>
        <span>{formatToolName(activeTool)}</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Selection Breadcrumb (generic, avoid duplicating names used in tests) */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Selection:</span>
        <span>
          {selection.kind === "campaign" && "Campaign"}
          {selection.kind === "map" && "Map"}
          {selection.kind === "layer" && "Layer"}
          {selection.kind === "none" && "—"}
        </span>
      </div>

      {/* Zoom Level */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Zoom:</span>
        <span>{zoomLevel}%</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Mouse Coordinates */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Position:</span>
        <span>
          X: {mousePosition.x}, Y: {mousePosition.y}
        </span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Active Setting */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Setting:</span>
        <span>{setting?.name ?? settingId}</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Hex Coordinates */}
      <div className="flex items-center gap-1">
        <span className="font-medium">Hex:</span>
        <span>
          {mousePosition.hex
            ? `${mousePosition.hex.q}, ${mousePosition.hex.r}`
            : "—"}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Selection Info */}
      <div className="flex items-center gap-1">
        <span>{formatSelectionInfo()}</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Document Status */}
      <div className="flex items-center gap-1" aria-live="polite">
        {hasCampaign ? (
          dirty ? (
            <>
              <span
                className="text-amber-500"
                title="Unsaved changes"
                data-testid="unsaved-indicator"
              >
                ●
              </span>
              <span>Unsaved</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">●</span>
              <span>Saved</span>
            </>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
