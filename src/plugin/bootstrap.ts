import { loadPluginsWithPriority } from "@/plugin/loader";

// Built-in plugins
import { paperPluginManifest, paperPluginModule } from "@/plugin/builtin/paper";
import {
  hexgridPluginManifest,
  hexgridPluginModule,
} from "@/plugin/builtin/hexgrid";
import {
  campaignPluginManifest,
  campaignPluginModule,
} from "@/plugin/builtin/campaign";
import { mapPluginManifest, mapPluginModule } from "@/plugin/builtin/map";
import { hexNoiseManifest, hexNoiseModule } from "@/plugin/builtin/hex-noise";
import {
  settingsPaletteManifest,
  settingsPaletteModule,
} from "@/plugin/builtin/settings-palette";
import { freeformManifest, freeformModule } from "@/plugin/builtin/freeform";

export async function bootstrapPlugins() {
  await loadPluginsWithPriority([
    // Anchor layers (priority 100)
    { manifest: paperPluginManifest, module: paperPluginModule },
    { manifest: hexgridPluginManifest, module: hexgridPluginModule },
    // Content plugins
    { manifest: campaignPluginManifest, module: campaignPluginModule },
    { manifest: mapPluginManifest, module: mapPluginModule },
    { manifest: hexNoiseManifest, module: hexNoiseModule },
    { manifest: settingsPaletteManifest, module: settingsPaletteModule },
    { manifest: freeformManifest, module: freeformModule },
  ]);
}

export default bootstrapPlugins;
