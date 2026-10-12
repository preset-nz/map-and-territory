<div align="center">

# Map & Territory

Gritty, analog‑style hexmap editor for TTRPGs. Part of the preset.nz desktop app family; being rebuilt as a native Tauri app.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)

<!-- Screenshot/preview: add an image or GIF here when available -->
<!-- <img src="./docs/preview.png" alt="Map & Territory preview" width="800"/> -->

</div>

## Overview

Map & Territory is a hexmap editor focused on a clean, professional editing experience. The editor itself is polished; the goal is to enable creating maps with an analog, gritty feel over time.

Project context, decisions and roadmap live in the guidance repo: `~/rhizomatic-preset/guidance/projects/map-and-territory/`. Coding conventions: `CLAUDE.md`.

## Current Scope

A native Tauri window with the family menu bar and window restore, built from the family template. The 2025 editor ran on Next.js in a browser and is kept at the tag `v2025-next`; `src/` still holds its renderer, layer adapters, plugins and palettes as material being ported into the new shell. See the guidance repo's `features/roadmap.md`.

## Tech Stack

See the guidance repo's `tech-stack.md` for the target stack.

## Getting Started

Prerequisites

- Node 20+, pnpm and a Rust toolchain (`rust-toolchain.toml` pins it). `just prep` lists what's installed.

```bash
just install
just run     # the app in its Tauri window
just check   # the full gate
```

## Tooling

`just` is the task surface; hooks and CI call the same recipes.

```bash
just install   # pnpm install + lefthook hooks
just run       # the app in its Tauri window
just check     # tsc, Biome, vite build, Vitest, cargo fmt/clippy/test, licences — the gate for pre-push and CI
just build     # the release bundle
just fmt       # Biome writes fixes in place
```

Hooks are lefthook (`lefthook.yml`): Biome and rustfmt on staged files at pre-commit, `just check` at pre-push. Never use `--no-verify`; if a hook is wrong, fix the hook.

## Testing

- Unit: `pnpm test` or `pnpm test:run`
- Coverage: `pnpm test:coverage`

All contributions should keep the test suite green.

## Project Structure

- `src-tauri/`: the Rust shell: menu (`src/menu.rs`, `menu.toml`), window restore, history stub.
- `src/`: the webview. `App.tsx` and `components/ui/` come from the template; the rest is the 2025 editor's code, being ported.

## Credits

Hex grid concepts and formulas are adapted from Amit Patel’s Red Blob Games:

- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html

See `THIRD_PARTY_NOTICES.md` for attribution details.

## License

MIT — see `LICENSE`.
