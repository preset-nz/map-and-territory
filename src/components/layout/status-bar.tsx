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
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">●</span>
        <span>Saved</span>
      </div>
    </div>
  );
};

export default StatusBar;
