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
