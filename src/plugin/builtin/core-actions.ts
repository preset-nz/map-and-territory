import type { PluginManifest, PluginModule } from "@/plugin/types";
import { getAppAPI } from "@/plugin/appapi";

export const coreActionsManifest: PluginManifest = {
  id: "app.plugins.core-actions",
  name: "Core Campaign Actions",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "campaign.new", title: "New Campaign", shortcut: "Mod+Shift+N" },
      { id: "map.new", title: "New Map", shortcut: "Mod+N" },
      { id: "map.delete", title: "Delete Map" },
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
      {
        group: "map",
        items: [
          {
            type: "button",
            command: "map.new",
            icon: "lucide:map",
            label: "New Map",
            order: 1,
          },
        ],
      },
    ],
  },
};

export const coreActionsModule: PluginModule = {
  commands: {
    "campaign.new": async () => {
      const app = getAppAPI();
      app.campaign.newCampaign();
    },
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
