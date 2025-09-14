import type {
  PluginManifest,
  PluginModule,
  SceneAdapter,
} from "@/plugin/types";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { registerLayerType } from "@/layers/registry";
import { PaperType } from "@/layers/adapters/paper";

export const paperPluginManifest: PluginManifest = {
  id: "core.paper",
  name: "Paper Layer",
  version: "1.0.0",
  apiVersion: "1.0",
  priority: 100,
};

export const paperPluginModule: PluginModule = {
  activate: async () => {
    registerLayerType(PaperType);
    registerPropertySchema("layer:paper", {
      groups: [
        {
          id: "paper",
          title: "Paper",
          rows: [
            {
              kind: "select",
              id: "aspect",
              label: "Aspect Ratio",
              path: "aspect",
              options: [
                { value: "square", label: "Square (1:1)" },
                { value: "4:3", label: "4:3" },
                { value: "16:10", label: "16:10" },
              ],
            },
            { kind: "color", id: "color", label: "Color", path: "color" },
          ],
        },
      ],
    });
  },
  deactivate: async () => {
    try {
      unregisterPropertySchema("layer:paper");
    } catch {}
  },
  scene: {
    computePaperRect({ canvasSize, paper }) {
      const canvasW = canvasSize.w;
      const canvasH = canvasSize.h;
      const aspect = paper.aspect;
      const paddingX = Math.max(12, canvasW * 0.05);
      const paddingY = 12;
      const availW = Math.max(0, canvasW - paddingX * 2);
      const availH = Math.max(0, canvasH - paddingY * 2);
      const [aw, ah] =
        aspect === "square" ? [1, 1] : aspect === "4:3" ? [4, 3] : [16, 10];
      let paperW = availW;
      let paperH = (paperW * ah) / aw;
      if (paperH > availH) {
        paperH = availH;
        paperW = (paperH * aw) / ah;
      }
      const paperX = paddingX + Math.max(0, (availW - paperW) / 2);
      const paperY = paddingY;
      return { x: paperX, y: paperY, w: paperW, h: paperH } as const;
    },
    postRender(ctx, frame, env) {
      const dpr = frame.pixelRatio || 1;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3 / dpr; // ~3px in CSS pixels
      ctx.strokeRect(
        env.paperRect.x + ctx.lineWidth / 2,
        env.paperRect.y + ctx.lineWidth / 2,
        env.paperRect.w - ctx.lineWidth,
        env.paperRect.h - ctx.lineWidth,
      );
      ctx.restore();
    },
  } satisfies SceneAdapter,
};
