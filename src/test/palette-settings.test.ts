import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/stores/project";
import { resolvePalette } from "@/stores/selectors/palette";
import {
  executeCommand,
  registerCommand,
  unregisterCommand,
} from "@/lib/commands";
import {
  settingsPaletteManifest,
  settingsPaletteModule,
} from "@/plugin/builtin/settings-palette";
import { loadPlugin } from "@/plugin/loader";

describe("T-012 Settings / Palettes", () => {
  beforeEach(() => {
    useProjectStore.setState({ current: null });
    // Register commands (idempotent via loader)
    loadPlugin(settingsPaletteManifest, settingsPaletteModule);
  });

  it("resolves palette by project settingId when no map override", () => {
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    const mapId = useProjectStore.getState().addMap({ name: "A" });
    useProjectStore.getState().selectMap(mapId);
    // set campaign setting to space-opera
    useProjectStore.getState().setCampaignSetting("space-opera");
    const pal = resolvePalette(useProjectStore.getState().current, mapId);
    expect(pal.grid.line).toBeDefined();
  });

  it("supports two maps with different effective settings", async () => {
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    const a = useProjectStore.getState().addMap({ name: "A" });
    const b = useProjectStore.getState().addMap({ name: "B" });
    // campaign setting X
    await executeCommand("app.palette.setCampaignSetting", {
      settingId: "doom-forge",
    });
    // map A override to Y
    await executeCommand("app.palette.setMapSetting", {
      mapId: a,
      settingId: "space-opera",
    });

    const palA = resolvePalette(useProjectStore.getState().current, a);
    const palB = resolvePalette(useProjectStore.getState().current, b);
    expect(palA.grid.line).not.toEqual(palB.grid.line);
  });

  it("clearing map override reverts to campaign setting", async () => {
    const p = useProjectStore.getState().createEmpty({ name: "Test" });
    const a = useProjectStore.getState().addMap({ name: "A" });
    await executeCommand("app.palette.setCampaignSetting", {
      settingId: "doom-forge",
    });
    await executeCommand("app.palette.setMapSetting", {
      mapId: a,
      settingId: "space-opera",
    });
    const before = resolvePalette(useProjectStore.getState().current, a);
    await executeCommand("app.palette.clearMapSetting", { mapId: a });
    const after = resolvePalette(useProjectStore.getState().current, a);
    expect(after.grid.line).not.toEqual(before.grid.line);
  });
});
