"use client";

/**
 * AppToolbar - Creative Tool Horizontal Toolbar
 *
 * Icon-based toolbar for creative hexmap editing tools.
 * Positioned below header, spans full width.
 */

import React, { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useLayoutStore } from "@/stores/layout";
import { executeCommand } from "@/lib/commands";
import { getToolbarContributions } from "@/plugin/loader";

// Creative tool icons
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { resolveIcon } from "@/lib/icon-resolver";
import { resolvePreconditions } from "@/plugin/capabilities";
import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";

// Dynamic toolbar contributions are rendered from the plugin loader

// ============================================================================
// AppToolbar Component
// ============================================================================

export const AppToolbar: React.FC = () => {
  type ToolbarItem = ReturnType<typeof getToolbarContributions>[number];
  const EMPTY: ReadonlyArray<ToolbarItem> = [];
  const isOpen = useLayoutStore((state) => state.isOpen);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

  // Use store state instead of local state
  const propertiesPanelOpen = useLayoutStore(
    (state) => state.propertiesPanelOpen,
  );
  const togglePropertiesPanel = useLayoutStore(
    (state) => state.togglePropertiesPanel,
  );
  const activeTool = useLayoutStore((s) => s.activeTool);
  // Subscribe to active map to trigger re-render when gating might change
  // Subscribe to project and selection so gating recomputes on selection changes,
  // including layer-id and type transitions.
  const project = useProjectStore((s) => s.current);
  const selection = useSelectionStore((s) => s.selection);
  void project;
  void selection;

  // Commands come from plugin loader; no local registration here

  // no static tool buttons in MVP; all tools come from contributions later

  const contributions = useSyncExternalStore(
    // subscribe to toolbar updates
    (cb) => {
      const handler = () => cb();
      if (typeof window !== "undefined") {
        window.addEventListener("plugin:toolbar-updated", handler);
      }
      return () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("plugin:toolbar-updated", handler);
        }
      };
    },
    // getSnapshot
    () => getToolbarContributions(),
    // getServerSnapshot
    () => EMPTY,
  );

  return (
    <div
      className="w-full border-b bg-background"
      data-toolbar-ready={contributions.length > 0 ? "true" : "false"}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Scene Panel Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleSidebar}
              aria-label="Toggle Scene Panel"
            >
              {isOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="flex items-center gap-2">
              <span>Toggle Scene Panel</span>
              <kbd className="px-1 py-0.5 text-xs bg-muted rounded">F1</kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Dynamic toolbar contributions: first group after left divider */}
        <div className="flex items-center gap-1">
          {contributions
            .reduce(
              (acc: Array<{ group: string; items: ToolbarItem[] }>, item) => {
                const g = acc.find((x) => x.group === item.group);
                if (g) {
                  g.items.push(item);
                } else {
                  acc.push({ group: item.group, items: [item] });
                }
                return acc;
              },
              [],
            )
            .sort((a, b) => {
              if (a.group === "campaign" && b.group !== "campaign") return -1;
              if (b.group === "campaign" && a.group !== "campaign") return 1;
              return a.group.localeCompare(b.group);
            })
            .map((group, gi, groups) => {
              const items = group.items.slice().sort((a, b) => {
                const oa = a.order ?? 0;
                const ob = b.order ?? 0;
                if (oa !== ob) return oa - ob;
                return (a.label || a.command).localeCompare(
                  b.label || b.command,
                );
              });
              return (
                <React.Fragment key={`grp:${group.group}`}>
                  {items.map((item, idx) => {
                    const aria = item.label || item.command;
                    const Icon = resolveIcon(item.icon);
                    // Host-evaluated preconditions via capability registry
                    const result = resolvePreconditions(item.enableWhen);
                    const disabled = !result.enabled;
                    const isActiveTool =
                      item.command === "tool.freeform.paint"
                        ? activeTool === "paint"
                        : item.command === "tool.freeform.erase"
                          ? activeTool === "erase"
                          : false;
                    return (
                      <Tooltip
                        key={`${item.pluginId}:${item.group}:${item.command}:${idx}`}
                      >
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActiveTool ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label={aria}
                            disabled={disabled}
                            onClick={() =>
                              executeCommand(item.command).catch(console.error)
                            }
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="flex items-center gap-2">
                            <span>
                              {item.label || item.command}
                              {item.command === "tool.freeform.paint"
                                ? " (2)"
                                : item.command === "tool.freeform.erase"
                                  ? " (4)"
                                  : ""}
                            </span>
                            {disabled ? (
                              <span className="text-muted-foreground">
                                —{" "}
                                {item.disabledReason ||
                                  result.reason ||
                                  "Unavailable"}
                              </span>
                            ) : null}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {gi < groups.length - 1 && (
                    <Separator orientation="vertical" className="h-6" />
                  )}
                </React.Fragment>
              );
            })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Properties Panel Toggle */}
        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={togglePropertiesPanel}
              aria-label="Toggle Properties Panel"
            >
              {propertiesPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="flex items-center gap-2">
              <span>Toggle Properties Panel</span>
              <kbd className="px-1 py-0.5 text-xs bg-muted rounded">F2</kbd>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default AppToolbar;
