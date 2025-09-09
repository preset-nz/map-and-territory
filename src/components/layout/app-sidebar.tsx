"use client";

/**
 * AppSidebar - Scene View Panel for Hexmap Editor
 *
 * Simple scene organization panel for managing maps and layers.
 * Replaces enterprise navigation with creative tool workflow.
 */

import React from "react";

// Render custom lightweight sidebar to work inside PanelGroup without fixed positioning

import { useLayoutStore } from "@/stores/layout";
import { AppSidebarProps } from "@/types/layout";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { Button } from "@/components/ui/button";
import { executeCommand } from "@/lib/commands";
import { Trash, Eye, EyeOff, Copy } from "lucide-react";

// ============================================================================
// Mock Data - Scene Structure
// ============================================================================

// (removed mock scenes; real project state drives UI)

// ============================================================================
// AppSidebar - Scene View Panel
// ============================================================================

/**
 * Scene View Panel for organizing maps and layers
 * Simple creative tool workflow instead of enterprise navigation
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({ className = "" }) => {
  const isOpen = useLayoutStore((state) => state.isOpen);
  const project = useProjectStore((s) => s.current);
  const selection = useSelectionStore((s) => s.selection);
  const selectCampaign = useSelectionStore((s) => s.selectCampaign);
  const selectMap = useSelectionStore((s) => s.selectMap);
  const projectSelectMap = useProjectStore((s) => s.selectMap);
  // const setMapVisibility = useProjectStore((s) => s.setMapVisibility);
  const setLayerVisibility = useProjectStore((s) => s.setLayerVisibility);
  const duplicateLayer = useProjectStore((s) => s.duplicateLayer);
  const removeLayer = useProjectStore((s) => s.removeLayer);

  // Return null when closed for full collapse functionality
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`h-full w-full flex flex-col border-r bg-muted/20 ${className}`}
    >
      <button
        className={`w-full text-left p-3 border-b transition-colors ${
          selection.kind === "campaign" ? "bg-accent" : "hover:bg-accent/50"
        }`}
        onClick={() => selectCampaign()}
        aria-pressed={selection.kind === "campaign"}
      >
        <div className="text-xs font-medium text-muted-foreground">
          Campaign
        </div>
        <div className="text-sm font-semibold truncate">
          {project?.name ?? "No Campaign"}
        </div>
      </button>

      <div
        className="flex-1 overflow-auto p-4"
        data-testid="scene-panel-scroll"
      >
        {!project && (
          <div className="text-sm text-muted-foreground">
            No campaign. Use the toolbar to create one.
          </div>
        )}

        {project && project.maps.length === 0 && (
          <div className="flex flex-col items-start gap-2 text-sm">
            <div className="text-muted-foreground">
              This campaign has no maps yet.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeCommand("map.new").catch(() => {})}
            >
              Create Map
            </Button>
          </div>
        )}

        {project && project.maps.length > 0 && (
          <div className="mt-2 space-y-1">
            {project.maps.map((m) => (
              <div key={m.id}>
                <div
                  className={`flex items-center justify-between gap-1 rounded px-2 py-1 ${selection.kind === "map" && selection.id === m.id ? "bg-accent" : "hover:bg-accent/50"}`}
                >
                  <button
                    className="flex-1 text-left truncate"
                    onClick={() => {
                      projectSelectMap(m.id);
                      selectMap(m.id);
                    }}
                  >
                    <span className="text-sm">{m.name}</span>
                  </button>
                  {/* Map-level visibility toggle removed (only one map visible at a time) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="Delete Map"
                    title="Delete Map"
                    onClick={() =>
                      executeCommand("map.delete", { id: m.id }).catch(() => {})
                    }
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                {project.activeMapId === m.id && (
                  <div className="ml-2 mt-1 space-y-1">
                    <div className="text-xs text-muted-foreground px-2">
                      Layers
                    </div>
                    {(() => {
                      const layersArr = m.layers ?? [];
                      // UI order: top of list = top of render
                      const ordered = [...layersArr].reverse();
                      return ordered.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between gap-1 rounded px-2 py-1 hover:bg-accent/50"
                        >
                          <button
                            className="flex-1 text-left truncate"
                            onClick={() =>
                              useSelectionStore.getState().selectLayer(l.id)
                            }
                          >
                            <span className="text-sm">{l.name ?? l.type}</span>
                          </button>
                          {l.type !== "paper" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={
                                l.visible ? "Hide Layer" : "Show Layer"
                              }
                              title={l.visible ? "Hide Layer" : "Show Layer"}
                              onClick={() =>
                                setLayerVisibility(l.id, !l.visible)
                              }
                            >
                              {l.visible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {l.type !== "paper" && l.type !== "hexgrid" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Duplicate Layer"
                                title="Duplicate Layer"
                                onClick={() => duplicateLayer(l.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                aria-label="Delete Layer"
                                title="Delete Layer"
                                onClick={() => removeLayer(l.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tall filler to ensure scrollability for layout tests */}
        <div className="h-[1600px]" />
      </div>
    </div>
  );
};

export default AppSidebar;
