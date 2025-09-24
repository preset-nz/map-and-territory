import React from "react";
import { useCampaignStore } from "@/stores/campaign";
import { listScaleUnits } from "@/scale/profiles";
import {
  normalizeScaleConfig,
  resolveScaleConfig,
  resolveSettingId,
} from "@/scale/resolution";
import type { ResolvedScaleConfig } from "@/types/scale";

export function useActiveScaleConfig(): ResolvedScaleConfig {
  const campaign = useCampaignStore((state) => state.current);

  return React.useMemo(() => {
    if (!campaign) {
      return resolveScaleConfig(undefined, resolveSettingId());
    }
    const activeMapId = campaign.activeMapId ?? null;
    const activeMap = campaign.maps.find((m) => m.id === activeMapId) ?? null;
    const settingId = resolveSettingId(
      activeMap?.settingId,
      campaign.settingId,
    );
    return resolveScaleConfig(activeMap?.scale, settingId);
  }, [campaign]);
}

export function getScaleUnitOptions(settingId: string): Array<{
  value: string;
  label: string;
  shortLabel: string;
  description?: string;
}> {
  return listScaleUnits(settingId).map((unit) => ({
    value: unit.id,
    label: unit.label,
    shortLabel: unit.shortLabel,
    description: unit.description,
  }));
}

export function normalizeMapScaleForSetting(
  scale: Parameters<typeof normalizeScaleConfig>[0],
  mapSettingId?: string | null,
  campaignSettingId?: string | null,
) {
  const settingId = resolveSettingId(mapSettingId, campaignSettingId);
  return normalizeScaleConfig(scale, settingId);
}
