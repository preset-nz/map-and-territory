import type { PluginManifest, PluginModule } from "@/plugin/types";
import { getAppAPI } from "@/plugin/appapi";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { TerrainSettings } from "@/palettes/settings";

export const campaignPluginManifest: PluginManifest = {
  id: "app.plugins.campaign",
  name: "Campaign Actions",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "campaign.new", title: "New Campaign", shortcut: "Mod+Shift+N" },
    ],
    toolbar: [
      {
        group: "campaign",
        items: [
          {
            type: "button",
            command: "campaign.new",
            icon: "lucide:box",
            label: "New Campaign",
            order: 1,
          },
        ],
      },
    ],
  },
};

export const campaignPluginModule: PluginModule = {
  activate: () => {
    // Properties schema for Campaign selection
    registerPropertySchema("campaign", {
      groups: [
        {
          id: "campaign",
          title: "Campaign",
          rows: [
            { kind: "text", id: "name", label: "Campaign Name", path: "name" },
            {
              kind: "textarea",
              id: "description",
              label: "Campaign Description",
              path: "description",
              rows: 5,
            },
            {
              kind: "select",
              id: "settingId",
              label: "Setting (Palette)",
              path: "settingId",
              options: TerrainSettings.getAllSettings().map((s) => ({
                value: s.id,
                label: s.name,
              })),
            },
          ],
        },
      ],
    });
  },
  deactivate: () => {
    unregisterPropertySchema("campaign");
  },
  commands: {
    "campaign.new": async () => {
      const app = getAppAPI();
      app.campaign.newCampaign();
    },
  },
};
