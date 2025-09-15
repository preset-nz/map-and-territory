Status: Draft
Last Updated: 2025-09-03

# Host Commands – Pattern & Contracts (MVP)

Host commands are reserved ids implemented by the host application, not by plugins. Plugins may `execute` these to request UI or privileged flows while remaining minimally privileged.

## Conventions

- Namespace: `host.*` (e.g., `host.prompt.newCampaign`)
- Sync vs Async: Always return a Promise; resolve to a value or `null` when cancelled.
- Capability: Executable by any plugin that can call `app.commands.execute` (available by default). Host validates side effects internally.

## Contract: `host.prompt.newCampaign`

- Purpose: Collect campaign metadata and create an empty project.
- Signature: `() => Promise<void>`
  - The host is responsible for: showing prompt, constructing `{ id, version, name, description, maps: [], activeMapId: null }`, setting active project, and persisting.
- UI Spec (MVP):
  - Modal with two fields: `Name` (text, default: `Untitled Campaign`), `Description` (textarea, optional).
  - Buttons: `Create` (primary), `Cancel`.
  - Keyboard: `Enter` = Create, `Esc` = Cancel.
  - Validation: Trim inputs; empty description allowed.

## Future Host Commands (Placeholders)

- `host.prompt.saveCampaignAs` – choose filename and persist.
- `host.prompt.openCampaign` – choose file and load.
- `host.prompt.newMap` – collect map name; respect ADR-0003 defaults (when implemented).

## Testing Pattern

- Provide a mock host command registry in tests that registers `host.*` handlers.
- For E2E: simulate user input on modal; assert project created and UI updated.
