import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";

import type { Project as Campaign } from "@/stores/project";

export interface CampaignAPI {
  newCampaign: (params?: { name?: string; description?: string }) => Campaign;
  newMap: (params?: { name?: string; description?: string }) => string; // returns mapId
  deleteMap: (id: string) => void;
  selectCampaign: () => void;
  selectMap: (id: string) => void;
}

export interface AppAPI {
  campaign: CampaignAPI;
}

let singleton: AppAPI | null = null;

export function getAppAPI(): AppAPI {
  if (singleton) return singleton;

  const api: AppAPI = {
    campaign: {
      newCampaign: (params) => {
        const project = useProjectStore.getState().createEmpty({
          name: params?.name ?? "Untitled Campaign",
          description: params?.description ?? "",
        });
        useSelectionStore.getState().selectCampaign();
        return project;
      },
      newMap: (params) => {
        const id = useProjectStore.getState().addMap({
          name: params?.name ?? "Untitled Map",
          description: params?.description ?? "",
        });
        useProjectStore.getState().selectMap(id);
        useSelectionStore.getState().selectMap(id);
        return id;
      },
      deleteMap: (id) => {
        useProjectStore.getState().deleteMap(id);
        // After deletion, fall back to campaign selection
        useSelectionStore.getState().selectCampaign();
      },
      selectCampaign: () => {
        useSelectionStore.getState().selectCampaign();
      },
      selectMap: (id) => {
        useProjectStore.getState().selectMap(id);
        useSelectionStore.getState().selectMap(id);
      },
    },
  };

  singleton = api;
  return api;
}
