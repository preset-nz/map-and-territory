import type { PluginManifest, PluginModule } from "@/plugin/types";
import {
  setCampaignSetting,
  setMapSetting,
} from "@/platform/plugin-runtime/state";

export const settingsPaletteManifest: PluginManifest = {
  id: "app.plugins.settings.palette",
  name: "Settings: Palette Commands",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "app.palette.setCampaignSetting", title: "Set Campaign Setting" },
      {
        id: "app.palette.clearCampaignSetting",
        title: "Clear Campaign Setting",
      },
      { id: "app.palette.setMapSetting", title: "Set Map Setting" },
      { id: "app.palette.clearMapSetting", title: "Clear Map Setting" },
    ],
  },
};

export const settingsPaletteModule: PluginModule = {
  commands: {
    "app.palette.setCampaignSetting": async (payload?: unknown) => {
      const id = (payload as { settingId?: string } | undefined)?.settingId;
      setCampaignSetting(id);
    },
    "app.palette.clearCampaignSetting": async () => {
      setCampaignSetting(undefined);
    },
    "app.palette.setMapSetting": async (payload?: unknown) => {
      const { mapId, settingId } =
        (payload as { mapId?: string; settingId?: string }) ?? {};
      if (!mapId) return;
      setMapSetting(mapId, settingId);
    },
    "app.palette.clearMapSetting": async (payload?: unknown) => {
      const { mapId } = (payload as { mapId?: string }) ?? {};
      if (!mapId) return;
      setMapSetting(mapId, undefined);
    },
  },
};
