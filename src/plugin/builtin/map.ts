import type { PluginManifest, PluginModule } from "@/plugin/types";
import { getAppAPI } from "@/plugin/appapi";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { TerrainSettings } from "@/palettes/settings";

export const mapPluginManifest: PluginManifest = {
  id: "app.plugins.map",
  name: "Map Actions",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "map.new", title: "New Map", shortcut: "Mod+N" },
      { id: "map.delete", title: "Delete Map" },
    ],
    toolbar: [
      {
        group: "map",
        items: [
          {
            type: "button",
            command: "map.new",
            icon: "lucide:map",
            label: "New Map",
            order: 1,
            enableWhen: ["hasCampaign"],
            disabledReason: "Create a campaign first",
          },
        ],
      },
    ],
  },
};

export const mapPluginModule: PluginModule = {
  activate: () => {
    // Properties schema for Map selection
    registerPropertySchema("map", {
      groups: [
        {
          id: "map",
          title: "Map",
          rows: [
            { kind: "text", id: "name", label: "Map Title", path: "name" },
            {
              kind: "textarea",
              id: "description",
              label: "Map Description",
              path: "description",
              rows: 4,
            },
          ],
        },
        {
          id: "advanced",
          title: "Advanced",
          rows: [
            {
              kind: "checkbox",
              id: "overrideEnabled",
              label: "Per‑map override",
              path: "overrideEnabled",
            },
            {
              kind: "select",
              id: "settingId",
              label: "Map Setting (when override on)",
              path: "settingId",
              disabledWhen: { path: "overrideEnabled", equals: false },
              optionsProvider: () => {
                const settings = TerrainSettings.getAllSettings();
                return [
                  { value: "", label: "— Select Setting —" },
                  ...settings.map((setting) => ({
                    value: setting.id,
                    label: setting.name,
                    swatches: [
                      setting.palette.colors.primary,
                      setting.palette.colors.secondary,
                      setting.palette.colors.accent,
                      setting.palette.colors.background,
                      setting.palette.gridLine,
                    ],
                  })),
                ];
              },
            },
          ],
        },
        {
          id: "scale",
          title: "Scale Bar",
          rows: [
            {
              kind: "checkbox",
              id: "scale.enabled",
              label: "Show scale bar",
              path: "scale.enabled",
            },
            [
              {
                kind: "select",
                id: "scale.placement",
                label: "Placement",
                path: "scale.placement",
                options: [
                  { value: "overlay", label: "On map" },
                  { value: "below", label: "Below map" },
                ],
              },
              {
                kind: "checkbox",
                id: "scale.useSettingUnits",
                label: "Use setting units",
                path: "scale.useSettingUnits",
              },
            ],
            {
              kind: "select",
              id: "scale.customUnitId",
              label: "Unit",
              path: "scale.customUnitId",
              disabledWhen: { path: "scale.useSettingUnits", equals: true },
              optionsProvider: (app) => {
                const api = app as typeof import("@/appapi").AppAPI;
                const units = api.scale?.unitOptions?.();
                if (!units || units.length === 0) {
                  return [{ value: "", label: "—" }];
                }
                return units.map((unit) => ({
                  value: unit.id,
                  label: unit.label,
                }));
              },
            },
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("map");
  },
  commands: {
    "map.new": async () => {
      const app = getAppAPI();
      app.campaign.newMap();
    },
    "map.delete": async (payload?: unknown) => {
      const id = (payload as { id?: string } | undefined)?.id;
      if (!id) return;
      if (typeof window !== "undefined") {
        const ok = window.confirm("Delete this map? This cannot be undone.");
        if (!ok) return;
      }
      const app = getAppAPI();
      app.campaign.deleteMap(id);
      app.campaign.selectCampaign();
    },
  },
};
