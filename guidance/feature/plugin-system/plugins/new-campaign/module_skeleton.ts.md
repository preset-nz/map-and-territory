Status: Draft
Last Updated: 2025-09-03

# Module Skeleton – New Campaign Plugin

Reference: `solutions_design.md`, ADR-0005 (empty by default), Plugin API Design.

```ts
// index.ts (plugin entry module)

import type { PluginModule, PluginContext, AppAPI } from "@/plugin"; // Provided by host; see planning docs for contracts

export const commands: PluginModule["commands"] = {
  "app.campaign.new": async (app: AppAPI) => {
    // Delegate to host prompt; host performs creation + activation.
    await app.commands.execute("host.prompt.newCampaign");
  },
};

export async function activate(ctx: PluginContext) {
  ctx.log.info("New Campaign plugin activated");
}

export const deactivate = undefined;

export default { activate, commands } satisfies PluginModule;
```

Notes

- This module avoids direct state mutation; it relies on a host command to keep capabilities minimal.
- Tests can spy on `app.commands.execute` with the expected `host.prompt.newCampaign` id.
