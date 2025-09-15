Status: Draft
Last Updated: 2025-09-03

# Plugin: New Campaign (Project)

## Intent

Create a new Campaign (aka Project) with name and description. Do not create any maps; campaign starts empty. Switch app context to this campaign.

## UI & Contributions

- Toolbar group: `campaign`
  - Button: `New Campaign` (icon: `ri:file-plus`)
  - Command id: `app.campaign.new`
  - Shortcut: `Mod+Shift+N`
  - When: `true` (always visible)

Optional (future): add `Open Campaign`, `Save Campaign` into same group.

## Capabilities

- `storage:project` – write a new project object (campaign) with metadata.
  (No `scene:write` needed for MVP, as no map is created.)

## Flow (Commands-First)

1. User clicks toolbar button or presses `Mod+Shift+N` → executes `app.campaign.new`.
2. Host shows a minimal prompt (name, description). If name omitted, default to `Untitled Campaign`.
3. Host creates a fresh `Project` object `{ id, version, name, description, maps: [], activeMapId: null }`.
4. Host persists via `storage.set(project)` and refreshes UI. Scene Tree shows an empty-state CTA (e.g., "Create Map").

Note: The plugin triggers the command; the host handles stateful operations to avoid over-privileging the plugin.

## Minimal Manifest Sketch

```json
{
  "id": "app.plugins.new-campaign",
  "name": "New Campaign",
  "version": "0.1.0",
  "capabilities": ["storage:project"],
  "contributes": {
    "commands": [
      {
        "id": "app.campaign.new",
        "title": "New Campaign",
        "shortcut": "Mod+Shift+N"
      }
    ],
    "toolbar": [
      {
        "group": "campaign",
        "items": [
          {
            "type": "button",
            "command": "app.campaign.new",
            "icon": "ri:file-plus",
            "label": "New"
          }
        ]
      }
    ]
  },
  "entry": "./index.js"
}
```

## Module Sketch

```ts
export const commands = {
  "app.campaign.new": async (app: AppAPI) => {
    // Delegate to host to collect inputs and create an empty campaign.
    await app.commands.execute("host.prompt.newCampaign");
  },
};

export async function activate(ctx: PluginContext) {
  // No-op; contributions are declarative. Optionally log readiness.
  ctx.log.info("New Campaign plugin activated");
}
```

Note: For MVP, the host implements `host.prompt.newCampaign` to show a simple modal and perform empty campaign creation.

## Acceptance Criteria

- Toolbar shows `campaign` group with a `New` button (icon `ri:file-plus`).
- Triggering the command opens a prompt, creates a new campaign with name/description, no maps.
- Scene Tree shows empty-state CTA to create a map (no canvas render until a map exists).
- Save/Load preserves campaign metadata.

## Dependencies

- ADR-0005: Campaign Creation is Empty by Default.
- ADR-0004: Icons (`ri:file-plus`), shortcut mapping (`Mod+Shift+N`).
- Tasks: M1 (Kernel), M2 (Commands/Toolbar), M5 (Persistence), minimal prompt UI.

## UX Considerations (to align with @ux-product-designer)

- Campaign visibility: MVP shows current campaign name at the top of Scene Tree as a header with inline rename. Multi-campaign navigation deferred.
- Prompt: simple two-field modal; defaults to `Untitled Campaign`, description optional.
- Keep Scene Tree simple: maps listed under the active campaign; no collapsible multi-campaign tree in MVP.
