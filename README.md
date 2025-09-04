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

Map & Territory is a hexmap editor aimed at producing atmospheric, hand‑made looking maps for tabletop RPGs (think Mörk Borg / Death in Space vibes) while providing a clean, professional editing experience.

Project context, goals, and design philosophy live in `guidance/product_brief.md`.

## Features

- Hex grid core: axial/cube coordinates, layout (pointy/flat), neighbors, rounding.
- Layered editing model for terrain, features, annotations, and effects.
- Multi‑document projects for campaigns and related maps.
- Plugin‑friendly architecture with a simple public API surface.
- Export targets: PNG/SVG (planned), JSON project format.
- Keyboard‑first workflow; panels and toolbars for power users.

Status: early learning project; see `guidance/tickets.md` and `guidance/todos.md` for active work and roadmap.

## Tech Stack

- Next.js 15, React 19, TypeScript
- pnpm, ESLint, Prettier
- Vitest (+ jsdom) for unit tests; Playwright for E2E
- Tailwind CSS (via PostCSS)

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

- `src/lib/hex/`: Hex grid primitives (axial/cube math, layouts, neighbors).
- `public/`: Static assets.
- `guidance/`: Product brief, ADRs, features, and process docs.

## Credits

Hex grid concepts and formulas are adapted from Amit Patel’s Red Blob Games:
- https://www.redblobgames.com/grids/hexagons/
- https://www.redblobgames.com/grids/hexagons/implementation.html

See `THIRD_PARTY_NOTICES.md` for attribution details.

## License

MIT — see `LICENSE`.
