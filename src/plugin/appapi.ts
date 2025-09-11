import { useCampaignStore } from "@/stores/campaign";
import { useSelectionStore } from "@/stores/selection";

import type { Campaign } from "@/stores/campaign";

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
        const campaign = useCampaignStore.getState().createEmpty({
          name: params?.name,
          description: params?.description ?? "",
        });
        useSelectionStore.getState().selectCampaign();
        return campaign;
      },
      newMap: (params) => {
        const id = useCampaignStore.getState().addMap({
          name: params?.name,
          description: params?.description ?? "",
        });
        useCampaignStore.getState().selectMap(id);
        useSelectionStore.getState().selectMap(id);
        return id;
      },
      deleteMap: (id) => {
        useCampaignStore.getState().deleteMap(id);
        // After deletion, fall back to campaign selection
        useSelectionStore.getState().selectCampaign();
      },
      selectCampaign: () => {
        useSelectionStore.getState().selectCampaign();
      },
      selectMap: (id) => {
        useCampaignStore.getState().selectMap(id);
        useSelectionStore.getState().selectMap(id);
      },
    },
  };

  singleton = api;
  return api;
}
