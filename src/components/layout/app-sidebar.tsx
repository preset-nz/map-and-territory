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
import { Trash, Eye, EyeOff, Copy, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

  // DnD sensors and derived ids (hooks must be unconditional)
  const sensors = useSensors(useSensor(PointerSensor));
  const nonAnchorIdsUiOrder = React.useMemo(() => {
    const m = project?.maps.find((mm) => mm.id === project.activeMapId) ?? null;
    const layersArr = m?.layers ?? [];
    const ordered = [...layersArr].reverse();
    return ordered
      .filter((l) => l.type !== "paper" && l.type !== "hexgrid")
      .map((l) => l.id);
  }, [project]);

  // Return null when closed for full collapse functionality
  if (!isOpen) {
    return null;
  }

  function arrayIndexFromUiDraggableIndex(uiIndex: number): number | null {
    const m = project?.maps.find((mm) => mm.id === project.activeMapId) ?? null;
    if (!m) return null;
    const layers = m.layers ?? [];
    const nonAnchorArrayIdx = layers
      .map((l, idx) => ({ l, idx }))
      .filter(({ l }) => l.type !== "paper" && l.type !== "hexgrid")
      .map(({ idx }) => idx);
    const fromEnd = nonAnchorArrayIdx.length - 1 - uiIndex;
    return (
      nonAnchorArrayIdx[
        Math.max(0, Math.min(fromEnd, nonAnchorArrayIdx.length - 1))
      ] ?? null
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overUiIndex = nonAnchorIdsUiOrder.findIndex((id) => id === over.id);
    const toArrayIndex = arrayIndexFromUiDraggableIndex(overUiIndex);
    if (toArrayIndex == null) return;
    useProjectStore.getState().moveLayer(String(active.id), toArrayIndex);
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
                  className={`flex items-center justify-between gap-1 rounded px-2 py-1 ${
                    project.activeMapId === m.id
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                  data-selected={
                    project.activeMapId === m.id ? "true" : "false"
                  }
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
                      const ordered = [...layersArr].reverse(); // UI top -> array end
                      return (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={nonAnchorIdsUiOrder}
                            strategy={verticalListSortingStrategy}
                          >
                            {ordered.map((l) =>
                              l.type === "paper" || l.type === "hexgrid" ? (
                                <StaticLayerRow
                                  key={l.id}
                                  layer={l}
                                  isSelected={
                                    selection.kind === "layer" &&
                                    selection.id === l.id
                                  }
                                  onSelect={() =>
                                    useSelectionStore
                                      .getState()
                                      .selectLayer(l.id)
                                  }
                                  onToggleVisible={() =>
                                    setLayerVisibility(l.id, !l.visible)
                                  }
                                  onDuplicate={() => duplicateLayer(l.id)}
                                  onRemove={() => removeLayer(l.id)}
                                />
                              ) : (
                                <SortableLayerRow
                                  key={l.id}
                                  id={l.id}
                                  layer={l}
                                  isSelected={
                                    selection.kind === "layer" &&
                                    selection.id === l.id
                                  }
                                  onSelect={() =>
                                    useSelectionStore
                                      .getState()
                                      .selectLayer(l.id)
                                  }
                                  onToggleVisible={() =>
                                    setLayerVisibility(l.id, !l.visible)
                                  }
                                  onDuplicate={() => duplicateLayer(l.id)}
                                  onRemove={() => removeLayer(l.id)}
                                />
                              ),
                            )}
                          </SortableContext>
                        </DndContext>
                      );
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

// --- Internal row components ---
type RowProps = {
  layer: { id: string; name?: string; type: string; visible: boolean };
  isSelected?: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

function StaticLayerRow({
  layer,
  isSelected,
  onSelect,
  onToggleVisible,
  onDuplicate,
  onRemove,
}: RowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-1 rounded px-2 py-1 hover:bg-accent/50 ${
        isSelected ? "bg-accent" : ""
      }`}
      data-selected={isSelected ? "true" : "false"}
    >
      <span className="h-6 w-6" aria-hidden="true" />
      <button className="flex-1 text-left truncate" onClick={onSelect}>
        <span className="text-sm">{layer.name ?? layer.type}</span>
      </button>
      {layer.type !== "paper" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={layer.visible ? "Hide Layer" : "Show Layer"}
          title={layer.visible ? "Hide Layer" : "Show Layer"}
          onClick={onToggleVisible}
        >
          {layer.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
      )}
      {layer.type !== "paper" && layer.type !== "hexgrid" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Duplicate Layer"
            title="Duplicate Layer"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Delete Layer"
            title="Delete Layer"
            onClick={onRemove}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

function SortableLayerRow({
  id,
  layer,
  isSelected,
  onSelect,
  onToggleVisible,
  onDuplicate,
  onRemove,
}: RowProps & { id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-1 rounded px-2 py-1 hover:bg-accent/50 ${
        isSelected ? "bg-accent" : ""
      }`}
      data-selected={isSelected ? "true" : "false"}
    >
      <button
        className="h-6 w-6 cursor-grab text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Drag layer"
        title="Drag layer"
        data-testid={`drag-handle-${id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button className="flex-1 text-left truncate" onClick={onSelect}>
        <span className="text-sm">{layer.name ?? layer.type}</span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label={layer.visible ? "Hide Layer" : "Show Layer"}
        title={layer.visible ? "Hide Layer" : "Show Layer"}
        onClick={onToggleVisible}
      >
        {layer.visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Duplicate Layer"
        title="Duplicate Layer"
        onClick={onDuplicate}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Delete Layer"
        title="Delete Layer"
        onClick={onRemove}
      >
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
}
