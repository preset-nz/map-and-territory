Status: Draft
Last Updated: 2025-09-03

# E2E Spec – New Campaign (Empty by Default)

## Precondition

- App started with plugin kernel enabled.
- New Campaign plugin manifest loaded.
- Host has `host.prompt.newCampaign` command implemented.

## Flow

1. Toolbar renders group `campaign` with button `New` (icon `ri:file-plus`).
2. Click `New` OR press `Mod+Shift+N` → opens modal.
3. Enter `Name = My First Campaign`; `Description = Optional text`; click `Create`.
4. Expect:
   - Active project exists with `{ name: 'My First Campaign', description: 'Optional text', maps: [], activeMapId: null }`.
   - Scene Tree header shows `My First Campaign`.
   - Empty-state CTA visible: `Create Map`.
5. Save project (if implemented) and reload → state persists.

## Assertions

- Toolbar button presence and correct binding to `app.campaign.new`.
- Shortcut triggers the same command.
- Modal labels, default values, and keyboard behavior.
- Project state shape; no maps created.
- UI header text matches project name; empty-state visible.

## Negative Cases

- Cancel from modal → no project changes; no errors.
- Empty name → defaults to `Untitled Campaign`.
