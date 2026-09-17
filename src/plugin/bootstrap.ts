import {
  campaignPluginManifest,
  campaignPluginModule,
} from "@/plugin/builtin/campaign";
import { freeformManifest, freeformModule } from "@/plugin/builtin/freeform";
import { hexNoiseManifest, hexNoiseModule } from "@/plugin/builtin/hex-noise";
import {
  hexgridPluginManifest,
  hexgridPluginModule,
} from "@/plugin/builtin/hexgrid";
import { mapPluginManifest, mapPluginModule } from "@/plugin/builtin/map";
import { outlineManifest, outlineModule } from "@/plugin/builtin/outline";
// Built-in plugins
import { paperPluginManifest, paperPluginModule } from "@/plugin/builtin/paper";
import { loadPluginsWithPriority } from "@/plugin/loader";

export async function bootstrapPlugins() {
  await loadPluginsWithPriority([
    // Anchor layers (priority 100)
    { manifest: paperPluginManifest, module: paperPluginModule },
    { manifest: hexgridPluginManifest, module: hexgridPluginModule },
    // Content plugins
    { manifest: campaignPluginManifest, module: campaignPluginModule },
    { manifest: mapPluginManifest, module: mapPluginModule },
    { manifest: hexNoiseManifest, module: hexNoiseModule },
    { manifest: freeformManifest, module: freeformModule },
    { manifest: outlineManifest, module: outlineModule },
  ]);
}

export default bootstrapPlugins;
