<div align="center">

# Map & Territory

Gritty, analog‑style hexmap editor for TTRPGs. Part of the preset.nz desktop app family; re-platforming from Next.js to Tauri.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)

<!-- Screenshot/preview: add an image or GIF here when available -->
<!-- <img src="./docs/preview.png" alt="Map & Territory preview" width="800"/> -->

</div>

## Overview

Map & Territory is a hexmap editor focused on a clean, professional editing experience. The editor itself is polished; the goal is to enable creating maps with an analog, gritty feel over time.

Project context, decisions and roadmap live in the guidance repo: `~/rhizomatic-preset/guidance/projects/map-and-territory/`. Coding conventions: `CLAUDE.md`.

## Current Scope

- Editor app scaffold in Next.js with a polished UI foundation.
- Foundational hex grid primitives used by the editor.
- Unit and integration tests with Vitest.
- Guidance and ADRs to steer architecture and product direction.

Status: re-platforming to a native Tauri app (adopted 2026-09-17). See the guidance repo's `features/roadmap.md`.

## Tech Stack

See the guidance repo's `tech-stack.md` for the target stack.

## Getting Started

Prerequisites

- Node 20+ recommended; pnpm installed.

Install and run

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000 and start hacking. Edit `app/page.tsx` to see live updates.

Production build

```bash
pnpm build
pnpm start
```

## Tooling

`just` is the task surface; hooks and CI call the same recipes.

```bash
just install   # pnpm install + lefthook hooks
just run       # dev server
just check     # tsc, Biome, Vitest — the gate for pre-push and CI
just fmt       # Biome writes fixes in place
```

Hooks are lefthook (`lefthook.yml`): Biome on staged files at pre-commit, `just check` at pre-push. Never use `--no-verify`; if a hook is wrong, fix the hook.

## Testing

- Unit: `pnpm test` or `pnpm test:run`
- Coverage: `pnpm test:coverage`

All contributions should keep the test suite green.

## Project Structure

- `src/`: Application source.
- `public/`: Static assets.

## Credits

Hex grid concepts and formulas are adapted from Amit Patel’s Red Blob Games:

- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html

See `THIRD_PARTY_NOTICES.md` for attribution details.

## License

MIT — see `LICENSE`.
