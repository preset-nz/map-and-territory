<div align="center">

# Map & Territory

Gritty, analog‑style hexmap editor for TTRPGs — built with Next.js.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)

<!-- Screenshot/preview: add an image or GIF here when available -->
<!-- <img src="./docs/preview.png" alt="Map & Territory preview" width="800"/> -->

</div>

## Overview

Map & Territory is a hexmap editor focused on a clean, professional editing experience. The editor itself is polished; the goal is to enable creating maps with an analog, gritty feel over time.

Project context, goals, and design philosophy: `guidance/product_brief.md`.

## Current Scope

- Editor app scaffold in Next.js with a polished UI foundation.
- Foundational hex grid primitives used by the editor.
- Unit and E2E testing setup (Vitest, Playwright).
- Guidance and ADRs to steer architecture and product direction.

Status: early learning project; see `guidance/tickets.md` and `guidance/todos.md` for active work and roadmap.

## Tech Stack

See `guidance/tech_stack.md` for details and rationale.

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

## Git Hooks

This repo uses Husky + lint-staged to run commit-time checks:
- Block commits directly to `main`.
- Prevent committing large files (>10MB) or CRLF line endings.
- Format and lint staged files (Prettier + ESLint).

Setup (one-time):
```bash
pnpm add -D husky lint-staged
pnpm run prepare   # initializes Husky hooks
```

Husky runs `.husky/pre-commit`, which delegates to `scripts/pre-commit.sh` and then runs lint-staged. This hook uses a bash shebang and does not rely on deprecated `husky.sh` shims.

Prefer Husky?
- Keep the existing `.githooks` for now. If you want Husky later:
  1) Install: `pnpm add -D husky` (and optionally `lint-staged`)
  2) Init: `pnpm husky` (or `npx husky init`)
  3) Create `.husky/pre-commit` that delegates to our script:
     ```sh
     #!/usr/bin/env sh
     . "$(dirname "$0")/_/husky.sh"
     .githooks/pre-commit
     ```
  This reuses the same checks without duplicating logic.

Editor settings
- Project ships with `.editorconfig` for LF line endings, UTF‑8, final newline, and 2‑space indentation.

## Testing

- Unit: `pnpm test` or `pnpm test:run`
- Coverage: `pnpm test:coverage`
- E2E: `pnpm test:e2e` (or `pnpm test:e2e:ui`)

All contributions should keep the test suite green.

## Project Structure

- `src/`: Application source.
- `public/`: Static assets.
- `guidance/`: Product brief, ADRs, features, and process docs.

## Credits

Hex grid concepts and formulas are adapted from Amit Patel’s Red Blob Games:
- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html

See `THIRD_PARTY_NOTICES.md` for attribution details.

## License

MIT — see `LICENSE`.
