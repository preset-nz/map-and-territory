import type { PluginManifest, PluginModule } from "@/plugin/types";
import { getAppAPI } from "@/plugin/appapi";

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
  commands: {
    "campaign.new": async () => {
      const app = getAppAPI();
      app.campaign.newCampaign();
    },
  },
};
