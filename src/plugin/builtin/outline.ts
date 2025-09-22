import type { PluginManifest, PluginModule, ToolHandler } from "@/plugin/types";
import { registerLayerType } from "@/layers/registry";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { OutlineType } from "@/layers/adapters/outline";
import type { OutlineState, OutlineCorner } from "@/lib/outline/types";
import { cornersEqual } from "@/lib/outline/types";
import { findNearestCorner, interpolateCorners } from "@/lib/outline/geometry";
import {
  getCurrentCampaign,
  getSelection,
  insertLayerBeforeTopAnchor,
  selectLayer,
  setActiveTool,
} from "@/platform/plugin-runtime/state";
import { registerToolCursor } from "@/plugin/loader";
import type { Layout } from "@/lib/hex";

export const outlineManifest: PluginManifest = {
  id: "app.plugins.outline-layer",
  name: "Hex Outlines",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "layer.outline.add", title: "Add Outline Layer" },
      { id: "tool.outline.draw", title: "Outline Tool" },
    ],
    toolbar: [
      {
        group: "scene",
        items: [
          {
            type: "button",
            command: "layer.outline.add",
            icon: "lucide:bezier-curve",
            label: "Outlines",
            order: 4,
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
            command: "tool.outline.draw",
            icon: "lucide:scribble-loop",
            label: "Outline",
            order: 5,
            enableWhen: ["activeLayerIs:outline", "gridVisible"],
            disabledReason: "Select an Outline layer",
          },
        ],
      },
    ],
  },
};

const TOLERANCE_PX = 14;

function buildLayout(env: Parameters<ToolHandler["onPointerDown"]>[1]): Layout {
  const size = Math.max(4, env.grid?.size ?? 16);
  const orientation = env.grid?.orientation === "flat" ? "flat" : "pointy";
  const origin = { x: env.size.w / 2, y: env.size.h / 2 };
  return { size, orientation, origin };
}

function createPathId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `outline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function appendCorner(
  path: OutlineState["paths"][number],
  corner: OutlineCorner,
  layout: Layout,
) {
  const last = path.corners[path.corners.length - 1] ?? null;
  const steps = interpolateCorners(last, corner, layout);
  for (const step of steps) {
    if (!last || !cornersEqual(step, last)) {
      path.corners.push(step);
    }
  }
}

const outlineTool: ToolHandler = {
  id: "outline",
  onPointerDown(pt, env, ctx) {
    if (ctx.selection.kind !== "layer") return;
    if (!env.grid) return;
    const layout = buildLayout(env);
    const corner = findNearestCorner(pt, layout, TOLERANCE_PX);
    if (!corner) return;

    const layerId = ctx.selection.id;
    if (!layerId) return;

    ctx.applyLayerState(layerId, (draft: OutlineState) => {
      const activeId = draft.activePathId ?? null;
      if (!activeId) {
        const newId = createPathId();
        draft.paths.push({ id: newId, corners: [corner], closed: false });
        draft.activePathId = newId;
        draft.hoverCorner = null;
        return;
      }
      const path = draft.paths.find((p) => p.id === activeId);
      if (!path) {
        draft.paths.push({ id: activeId, corners: [corner], closed: false });
        draft.hoverCorner = null;
        return;
      }
      const last = path.corners[path.corners.length - 1] ?? null;
      if (last && cornersEqual(last, corner)) {
        draft.hoverCorner = null;
        return;
      }
      appendCorner(path, corner, layout);
      const first = path.corners[0];
      if (first && cornersEqual(first, corner) && path.corners.length > 2) {
        path.closed = true;
        draft.activePathId = null;
      }
      draft.hoverCorner = null;
    });
  },
  onPointerMove(pt, env, ctx) {
    if (ctx.selection.kind !== "layer") return;
    if (!env.grid) return;
    const layerId = ctx.selection.id;
    if (!layerId) return;
    const layout = buildLayout(env);
    const corner = findNearestCorner(pt, layout, TOLERANCE_PX);
    ctx.applyLayerState(layerId, (draft: OutlineState) => {
      if (!corner) {
        draft.hoverCorner = null;
        return;
      }
      if (!cornersEqual(draft.hoverCorner ?? null, corner)) {
        draft.hoverCorner = corner;
      }
    });
  },
  onKeyDown(key, ctx) {
    if (ctx.selection.kind !== "layer") return;
    const layerId = ctx.selection.id;
    if (!layerId) return;

    if (key === "Escape") {
      ctx.applyLayerState(layerId, (draft: OutlineState) => {
        draft.activePathId = null;
        draft.hoverCorner = null;
      });
      return;
    }

    if (key === "Enter" || key === "NumpadEnter") {
      ctx.applyLayerState(layerId, (draft: OutlineState) => {
        if (!draft.activePathId) return;
        const index = draft.paths.findIndex((p) => p.id === draft.activePathId);
        if (index === -1) {
          draft.activePathId = null;
          draft.hoverCorner = null;
          return;
        }
        const path = draft.paths[index];
        if (path.corners.length < 2) {
          draft.paths.splice(index, 1);
        }
        draft.activePathId = null;
        draft.hoverCorner = null;
      });
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      ctx.applyLayerState(layerId, (draft: OutlineState) => {
        if (!draft.activePathId) return;
        const path = draft.paths.find((p) => p.id === draft.activePathId);
        if (!path) return;
        path.corners.pop();
        if (path.corners.length === 0) {
          draft.paths = draft.paths.filter((p) => p.id !== draft.activePathId);
          draft.activePathId = null;
          draft.hoverCorner = null;
        }
      });
    }
  },
};

export const outlineModule: PluginModule = {
  activate: () => {
    registerLayerType(OutlineType);
    registerToolCursor("outline", "crosshair");
    registerPropertySchema("layer:outline", {
      groups: [
        {
          id: "outline",
          title: "Outline",
          rows: [
            {
              kind: "slider",
              id: "opacity",
              label: "Opacity",
              path: "opacity",
              min: 0,
              max: 1,
              step: 0.05,
            },
            {
              kind: "color",
              id: "strokeColor",
              label: "Stroke Color",
              path: "strokeColor",
            },
            {
              kind: "slider",
              id: "strokeWidth",
              label: "Stroke Width",
              path: "strokeWidth",
              min: 1,
              max: 12,
              step: 1,
            },
            {
              kind: "select",
              id: "strokePattern",
              label: "Stroke Pattern",
              path: "strokePattern",
              options: [
                { value: "solid", label: "Solid" },
                { value: "dashed", label: "Dashed" },
                { value: "dotted", label: "Dotted" },
              ],
            },
            {
              kind: "slider",
              id: "roughness",
              label: "Roughness",
              path: "roughness",
              min: 0,
              max: 1,
              step: 0.05,
            },
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("layer:outline");
  },
  commands: {
    "layer.outline.add": () => {
      const campaign = getCurrentCampaign();
      const activeMap = campaign?.activeMapId;
      if (!campaign || !activeMap) return;
      const layerId = insertLayerBeforeTopAnchor("outline");
      if (!layerId) return;
      selectLayer(layerId);
      setActiveTool("outline");
    },
    "tool.outline.draw": () => {
      const selection = getSelection();
      if (selection.kind === "layer") {
        setActiveTool("outline");
      }
    },
  },
  tools: [outlineTool],
};
