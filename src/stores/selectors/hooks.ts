import { useProjectStore } from "@/stores/project";
import { useSelectionStore } from "@/stores/selection";
import { TerrainSettings } from "@/palettes/settings";

/**
 * Returns the resolved active setting id (map → campaign → default)
 * and subscribes to project store changes for reactivity.
 */
export function useActiveSettingId(): string {
  const selection = useSelectionStore((s) => s.selection);
  return useProjectStore((s) => {
    const cur = s.current;
    // Resolve by explicit selection: when campaign is selected, ignore activeMapId
    const activeMapId = selection.kind === "map" ? selection.id : null;
    const map = cur?.maps.find((m) => m.id === activeMapId);
    return map?.settingId || cur?.settingId || "doom-forge";
  });
}

/**
 * Returns the active setting object (or Doom Forge fallback), reactive to store updates.
 */
export function useActiveSetting() {
  const id = useActiveSettingId();
  return (
    TerrainSettings.getAllSettings().find((s) => s.id === id) ||
    TerrainSettings.DOOM_FORGE
  );
}
