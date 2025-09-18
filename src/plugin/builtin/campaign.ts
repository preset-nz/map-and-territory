import type { PluginManifest, PluginModule } from "@/plugin/types";
import { getAppAPI } from "@/plugin/appapi";
import {
  registerPropertySchema,
  unregisterPropertySchema,
} from "@/properties/registry";
import { TerrainSettings } from "@/palettes/settings";
import {
  getCurrentCampaign,
  isCampaignDirty,
  markCampaignDirty,
} from "@/platform/plugin-runtime/state";
import {
  CAMPAIGN_MIME_V1,
  loadIntoStoreV1,
  saveActiveCampaignV1,
} from "@/platform/plugin-runtime/persistence";

export const campaignPluginManifest: PluginManifest = {
  id: "app.plugins.campaign",
  name: "Campaign Actions",
  version: "0.1.0",
  apiVersion: "1.0",
  contributes: {
    commands: [
      { id: "campaign.new", title: "New Campaign", shortcut: "Mod+Shift+N" },
      { id: "campaign.save", title: "Save Campaign", shortcut: "Mod+S" },
      { id: "campaign.load", title: "Load Campaign", shortcut: "Mod+O" },
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
          {
            type: "button",
            command: "campaign.save",
            icon: "lucide:save",
            label: "Save",
            order: 2,
            enableWhen: ["hasCampaign"],
            disabledReason: "Create a campaign first",
          },
          {
            type: "button",
            command: "campaign.load",
            icon: "lucide:folder-open",
            label: "Load",
            order: 3,
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
                swatches: [
                  s.palette.colors.primary,
                  s.palette.colors.secondary,
                  s.palette.colors.accent,
                  s.palette.colors.background,
                  s.palette.gridLine,
                ],
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
      const { getDialogApi } = await import(
        "@/components/providers/dialog-global"
      );
      const d = getDialogApi();
      const hasCampaign = !!getCurrentCampaign();
      const isDirty = isCampaignDirty();
      if (d && hasCampaign && isDirty) {
        const ok = await d.confirm({
          title: "New Campaign",
          description:
            "You have unsaved changes. Creating a new campaign will discard them. Continue?",
          confirmText: "Create",
        });
        if (!ok) return;
      }
      app.campaign.newCampaign();
      // New campaign starts clean
      markCampaignDirty(false);
    },
    "campaign.save": async () => {
      const { getDialogApi } = await import(
        "@/components/providers/dialog-global"
      );
      const d = getDialogApi();
      let filename = "campaign.json";
      if (d) {
        const v = await d.prompt({
          title: "Save Campaign",
          description: "Enter a file name to download the campaign JSON.",
          defaultValue: filename,
          placeholder: "campaign.json",
          validate: (name) =>
            !name || !name.trim() ? "File name required" : null,
          confirmText: "Save",
        });
        if (v === null) return; // user cancelled
        filename = v.trim();
      }
      if (!filename.toLowerCase().endsWith(".json")) filename += ".json";
      const file = saveActiveCampaignV1();
      if (!file) return;
      const blob = new Blob([JSON.stringify(file, null, 2)], {
        type: CAMPAIGN_MIME_V1,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // mark store clean post-save
      markCampaignDirty(false);
    },
    "campaign.load": async () => {
      const { getDialogApi } = await import(
        "@/components/providers/dialog-global"
      );
      const d = getDialogApi();
      const hasCampaign = !!getCurrentCampaign();
      const isDirty = isCampaignDirty();
      if (d && hasCampaign) {
        const ok = await d.confirm({
          title: "Load Campaign",
          description: isDirty
            ? "You have unsaved changes. Loading will discard them. Continue?"
            : "Loading will replace the current campaign in memory. Continue?",
          confirmText: "Load",
        });
        if (!ok) return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          loadIntoStoreV1(json);
          if (d) await d.alert({ title: "Loaded", description: file.name });
        } catch (err) {
          console.error(err);
          if (d)
            await d.alert({
              title: "Load Failed",
              description: String(err instanceof Error ? err.message : err),
            });
        }
      };
      input.click();
    },
  },
};
