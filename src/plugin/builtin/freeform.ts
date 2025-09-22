import type { PluginManifest, PluginModule, ToolHandler } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { FreeformType } from "@/layers/adapters/freeform-hex";
import { AppAPI } from "@/appapi";
import {
  getCurrentCampaign,
  getSelection,
  insertLayerAbove,
  insertLayerBeforeTopAnchor,
  applyLayerState,
  selectLayer,
  setActiveTool,
} from "@/platform/plugin-runtime/state";
import { registerToolCursor } from "@/plugin/loader";
import { floodFill } from "@/lib/flood-fill";
import type { Axial } from "@/lib/hex";
import { debugEnabled } from "@/lib/debug";

export const freeformManifest: PluginManifest = {
  id: "app.plugins.freeform-layer",
  name: "Freeform Layer",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "layer.freeform.add", title: "Add Freeform Layer" },
      { id: "tool.freeform.paint", title: "Paint Tool" },
      { id: "tool.freeform.erase", title: "Erase Tool" },
      { id: "tool.freeform.fill", title: "Flood Fill Tool" },
    ],
    toolbar: [
      {
        group: "scene",
        items: [
          {
            type: "button",
            command: "layer.freeform.add",
            icon: "lucide:layers",
            label: "Freeform",
            order: 3,
            enableWhen: ["hasActiveMap"],
            disabledReason: "Select a map to add a layer",
          },
        ],
      },
      {
        group: "tools",
        items: [
          {
            type: "button",
            command: "tool.freeform.paint",
            icon: "lucide:paintbrush",
            label: "Paint",
            order: 1,
            enableWhen: ["activeLayerIs:freeform", "gridVisible"],
            disabledReason: "Select a Freeform layer",
          },
          {
            type: "button",
            command: "tool.freeform.erase",
            icon: "lucide:eraser",
            label: "Erase",
            order: 2,
            enableWhen: ["activeLayerIs:freeform", "gridVisible"],
            disabledReason: "Select a Freeform layer",
          },
          {
            type: "button",
            command: "tool.freeform.fill",
            icon: "lucide:bucket",
            label: "Fill",
            order: 3,
            enableWhen: ["activeLayerIs:freeform", "gridVisible"],
            disabledReason: "Select a Freeform layer",
          },
        ],
      },
    ],
  },
};

export const freeformModule: PluginModule = {
  activate: () => {
    registerLayerType(FreeformType);
    // Declare CSS cursors for tools
    registerToolCursor("paint", "crosshair");
    registerToolCursor("erase", "cell");
    registerToolCursor("fill", "crosshair");
    // Register Freeform properties schema
    registerPropertySchema("layer:freeform", {
      groups: [
        {
          id: "freeform",
          title: "Freeform",
          rows: [
            {
              kind: "slider",
              id: "opacity",
              label: "Opacity",
              path: "opacity",
              min: 0,
              max: 1,
              step: 0.01,
            },
            {
              kind: "select",
              id: "renderMode",
              label: "Render Mode",
              path: "renderMode",
              options: [
                { value: "paint", label: "Paint" },
                {
                  value: "texture-fill",
                  label: "Texture Fill (beta)",
                },
              ],
            },
            {
              kind: "file",
              id: "textureFill",
              label: "Texture Asset",
              path: "textureFill",
              accept: "image/png,image/jpeg,image/webp,image/svg+xml",
              helperText: "PNG, JPG, WebP, or SVG. Scales to fit the paper.",
              disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
              cascade: [{ path: "renderMode", value: "texture-fill" }],
              clearCascade: [
                { path: "renderMode", value: "paint" },
                { path: "textureFillInvert", value: false },
                { path: "textureOffsetX", value: 0 },
                { path: "textureOffsetY", value: 0 },
                { path: "textureScale", value: 1 },
                { path: "textureRotation", value: 0 },
                { path: "textureTiling", value: "stretch" },
              ],
            },
            {
              kind: "checkbox",
              id: "textureFillInvert",
              label: "Invert Mask",
              path: "textureFillInvert",
              disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
            },
            [
              {
                kind: "number",
                id: "textureOffsetX",
                label: "Offset X (px)",
                path: "textureOffsetX",
                min: -1024,
                max: 1024,
                step: 1,
                disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
              },
              {
                kind: "number",
                id: "textureOffsetY",
                label: "Offset Y (px)",
                path: "textureOffsetY",
                min: -1024,
                max: 1024,
                step: 1,
                disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
              },
            ],
            {
              kind: "slider",
              id: "textureScale",
              label: "Scale",
              path: "textureScale",
              min: 0.1,
              max: 4,
              step: 0.05,
              disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
            },
            {
              kind: "slider",
              id: "textureRotation",
              label: "Rotation (°)",
              path: "textureRotation",
              min: 0,
              max: 360,
              step: 1,
              disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
            },
            {
              kind: "select",
              id: "textureTiling",
              label: "Tiling Mode",
              path: "textureTiling",
              options: [
                { value: "stretch", label: "Stretch" },
                { value: "fit", label: "Fit" },
                { value: "repeat", label: "Repeat" },
              ],
              disabledWhen: { path: "renderMode", notEquals: "texture-fill" },
            },
            [
              {
                kind: "select",
                id: "fillMode",
                label: "Fill Mode",
                path: "fillMode",
                options: [
                  { value: "auto", label: "Auto (Smart Detection)" },
                  { value: "same-value", label: "Fill Same" },
                  { value: "empty-only", label: "Fill Empty" },
                ],
              },
            ],
            [
              {
                kind: "select",
                id: "brushTerrainId",
                label: "Brush Terrain",
                path: "brushTerrainId",
                options: [{ value: "", label: "— Select Terrain —" }],
                optionsProvider: (app: unknown) => {
                  try {
                    type AppApi = typeof AppAPI;
                    const api = app as AppApi;
                    const entries = api.palette.list();
                    return [
                      { value: "", label: "— Select Terrain —" },
                      ...entries.map((e) => ({
                        value: e.id,
                        label: e.themedName,
                      })),
                    ];
                  } catch {
                    return [{ value: "", label: "— Select Terrain —" }];
                  }
                },
              },
              {
                kind: "color",
                id: "brushColor",
                label: "Brush Color (Override)",
                path: "brushColor",
              },
            ],
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("layer:freeform");
  },
  tools: [
    (function makePaintTool(): ToolHandler {
      let lastKey: string | null = null;
      return {
        id: "paint",
        onPointerDown(pt, env, ctx) {
          lastKey = null;
          // Only operate on freeform layer selection
          if (ctx.selection.kind !== "layer") return;
          // Compute axial from point using env.grid
          const grid = env.grid;
          if (!grid) return;
          const layout = {
            orientation: grid.orientation === "flat" ? "flat" : "pointy",
            size: Math.max(4, Number(grid.size || 16)),
            origin: { x: env.size.w / 2, y: env.size.h / 2 },
          } as const;
          const h = (ctx.app as typeof AppAPI).hex.fromPoint(pt, layout);
          const key = `${h.q},${h.r}`;
          if (lastKey === key) return;
          lastKey = key;
          const st = (ctx.getActiveLayerState<Record<string, unknown>>() ??
            {}) as Record<string, unknown>;
          const brushColor =
            (st["brushColor"] as string | undefined) ?? undefined;
          const brushTerrainId =
            (st["brushTerrainId"] as string | undefined) ?? undefined;
          if (!brushColor && !brushTerrainId) return;
          ctx.applyLayerState(ctx.selection.id!, (draft) => {
            const cells = {
              ...(draft["cells"] as Record<string, unknown> | undefined),
            };
            cells[key] = {
              terrainId: brushTerrainId,
              color: brushColor,
            } as unknown as Record<string, unknown>;
            draft["cells"] = cells;
          });
        },
        onPointerMove(pt, env, ctx) {
          if (!lastKey) return this.onPointerDown?.(pt, env, ctx);
          return this.onPointerDown?.(pt, env, ctx);
        },
        onPointerUp() {
          lastKey = null;
        },
      };
    })(),
    (function makeEraseTool(): ToolHandler {
      let lastKey: string | null = null;
      return {
        id: "erase",
        onPointerDown(pt, env, ctx) {
          lastKey = null;
          if (ctx.selection.kind !== "layer") return;
          const grid = env.grid;
          if (!grid) return;
          const layout = {
            orientation: grid.orientation === "flat" ? "flat" : "pointy",
            size: Math.max(4, Number(grid.size || 16)),
            origin: { x: env.size.w / 2, y: env.size.h / 2 },
          } as const;
          const h = (ctx.app as typeof AppAPI).hex.fromPoint(pt, layout);
          const key = `${h.q},${h.r}`;
          if (lastKey === key) return;
          lastKey = key;
          const st = (ctx.getActiveLayerState<Record<string, unknown>>() ??
            {}) as Record<string, unknown>;
          const existing =
            (st["cells"] as Record<string, unknown> | undefined) || {};
          if (Object.prototype.hasOwnProperty.call(existing, key)) {
            ctx.applyLayerState(ctx.selection.id!, (draft) => {
              const cells = {
                ...(draft["cells"] as Record<string, unknown> | undefined),
              };
              delete cells[key];
              draft["cells"] = cells;
            });
          }
        },
        onPointerMove(pt, env, ctx) {
          if (!lastKey) return this.onPointerDown?.(pt, env, ctx);
          return this.onPointerDown?.(pt, env, ctx);
        },
        onPointerUp() {
          lastKey = null;
        },
      };
    })(),
    (function makeFloodFillTool(): ToolHandler {
      return {
        id: "fill",
        onPointerDown(pt, env, ctx) {
          // Only operate on freeform layer selection
          if (ctx.selection.kind !== "layer") return;

          // Compute axial from point using env.grid
          const grid = env.grid;
          if (!grid) return;

          const layout = {
            orientation: grid.orientation === "flat" ? "flat" : "pointy",
            size: Math.max(4, Number(grid.size || 16)),
            origin: { x: env.size.w / 2, y: env.size.h / 2 },
          } as const;

          const h = (ctx.app as typeof AppAPI).hex.fromPoint(pt, layout);
          const origin: Axial = { q: h.q, r: h.r };

          // Get current layer state
          const layerState = (ctx.getActiveLayerState<
            Record<string, unknown>
          >() ?? {}) as Record<string, unknown>;
          const cells =
            (layerState["cells"] as Record<string, unknown> | undefined) || {};

          // Get brush configuration from layer properties
          const brushColor =
            (layerState["brushColor"] as string | undefined) ?? undefined;
          const brushTerrainId =
            (layerState["brushTerrainId"] as string | undefined) ?? undefined;

          if (!brushColor && !brushTerrainId) {
            console.warn("Flood fill: No brush color or terrain selected");
            return;
          }

          // Create lookup function for current cell values
          const getCellValue = (axial: Axial): string | undefined => {
            const key = `${axial.q},${axial.r}`;
            const cell = cells[key] as { terrainId?: string } | undefined;
            return cell?.terrainId;
          };

          // Get fill mode from layer properties with smart auto-detection
          const configuredFillMode =
            (layerState["fillMode"] as string | undefined) ?? "auto";

          let fillMode: "empty-only" | "same-value";

          if (configuredFillMode === "auto") {
            // Smart mode detection: if clicked cell is empty, use empty-only; if filled, use same-value
            const originValue = getCellValue(origin);
            fillMode = originValue === undefined ? "empty-only" : "same-value";
          } else {
            fillMode = configuredFillMode as "empty-only" | "same-value";
          }

          // Run flood fill algorithm
          const fillResult = floodFill({
            origin,
            mode: fillMode,
            maxCells: 1000, // Performance guardrail
            getCellValue,
          });

          if (fillResult.cells.length === 0) {
            return; // Nothing to fill
          }

          // Apply results using batch API for atomic update
          if (ctx.applyCellsDelta) {
            const delta = {
              set: {} as Record<string, { terrainId?: string; color?: string }>,
            };

            // Convert flood fill results to cell delta
            fillResult.cells.forEach((axial) => {
              const key = `${axial.q},${axial.r}`;
              delta.set[key] = {
                terrainId: brushTerrainId,
                color: brushColor,
              };
            });

            const result = ctx.applyCellsDelta(ctx.selection.id!, delta);

            if (result.success) {
              if (debugEnabled()) {
                console.log(
                  `Flood fill: Applied ${fillResult.cells.length} cells in ${result.metrics?.executionTimeMs}ms`,
                );
                if (fillResult.truncated) {
                  console.warn(
                    `Flood fill: Operation truncated - ${fillResult.truncationReason}`,
                  );
                }
              }
            } else {
              console.error(
                "Flood fill: Batch operation failed:",
                result.error,
              );
            }
          } else {
            // Fallback to individual updates if batch API not available
            console.warn("Flood fill: Batch API not available, using fallback");
            fillResult.cells.forEach((axial) => {
              const key = `${axial.q},${axial.r}`;
              ctx.applyLayerState(ctx.selection.id!, (draft) => {
                const cells = {
                  ...(draft["cells"] as Record<string, unknown> | undefined),
                };
                cells[key] = {
                  terrainId: brushTerrainId,
                  color: brushColor,
                } as unknown as Record<string, unknown>;
                draft["cells"] = cells;
              });
            });
          }
        },
      };
    })(),
  ],
  commands: {
    "layer.freeform.add": () => {
      const campaign = getCurrentCampaign();
      const activeMapId = campaign?.activeMapId ?? null;
      if (!campaign || !activeMapId) return;
      const map = campaign.maps.find((m) => m.id === activeMapId);
      if (!map) return;
      const sel = getSelection();
      const insertAboveSel = () =>
        sel.kind === "layer" ? insertLayerAbove(sel.id, "freeform") : null;
      let id: string | null = null;
      if (sel.kind === "layer") {
        id = insertAboveSel() || insertLayerBeforeTopAnchor("freeform");
      } else if (sel.kind === "map") {
        id = insertLayerBeforeTopAnchor("freeform");
      } else {
        id = insertLayerBeforeTopAnchor("freeform");
      }
      if (!id) return;
      try {
        const entries = AppAPI.palette.list();
        const first = entries[0];
        if (first) {
          applyLayerState(id, (draft) => {
            draft["brushTerrainId"] = first.id;
            draft["brushColor"] = first.color;
            draft["fillMode"] = "auto"; // Default to auto (smart detection)
          });
        }
      } catch {}
      selectLayer(id);
    },
    "tool.freeform.paint": () => {
      setActiveTool("paint");
    },
    "tool.freeform.erase": () => {
      setActiveTool("erase");
    },
    "tool.freeform.fill": () => {
      setActiveTool("fill");
    },
  },
};
