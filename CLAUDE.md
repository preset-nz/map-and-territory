# Map & Territory — Claude instructions

Hexmap editor for tabletop RPGs: professional editing tools, gritty analog-looking maps. Part of the preset.nz desktop family with Oblique, Strata, Fault and Shard. Adopted 2026-09-17; being re-platformed from Next.js to a native Tauri 2 app on Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + Zustand.

## Where the truth lives

- **Design & plans:** `~/rhizomatic-preset/guidance/projects/map-and-territory/` — NOT in this repo.
  - `README.md` — locked decisions. Read it before implementing anything; do not re-litigate locked decisions in code.
  - `design/architecture.md` — domain, render pipeline, `.campaign` file, plugin stance, native mechanics.
  - `features/roadmap.md` and `features/NN-*/README.md` — epics and stories. Work is story-driven: implement exactly one story's scope against its acceptance criteria.
  - `archive/2025-codex-guidance/` — the original guidance tree, deprecated. History only.
- Cross-project contracts this app conforms to: `~/rhizomatic-preset/guidance/design/native-apps.md`, `plugin-primitive.md`, `facets.md`, `versioned-persistence.md`, `tauri-scaffold.md`.
- This repo holds code and code-near explainers only. Planning docs never land here.

## Workflow

- One story = one unit of work = one commit. Don't bundle stories.
- When a story or epic ships: update its guidance doc's frontmatter — `status: shipped`, `updated: <today>` — in the same session as the code commit.
- Run `just check` before finishing any task. Never use `--no-verify`; if a hook is wrong, fix the hook. (Until epic 01 story 3 lands, `pnpm validate` is the gate.)
- Justfile verbs are the standard surface: `prep, install, run, check, build, fmt`. Call `just <verb>`, not raw pnpm or cargo.
- Subagents implement; the orchestrating session reviews and commits. If you are a subagent: do not commit.

## Hard rules

- **Array order is z-order.** `paper` is index 0, `hexgrid` is last. Never special-case draw order in a backend.
- **Adapters draw, the host clips and transforms.** No screen-space maths inside a layer adapter. Every visual adapter implements `getInvalidationKey`; no state-diffing fallback.
- **No consumer reads store shape directly.** Plugins go through the host API; components go through selector hooks.
- **Plugins declare contributions; the host wires them.** A plugin never reaches into a registry or store. First-party only; capability tokens are authoring discipline, not security.
- **Layer state is serialisable JSON.** No handles, canvases or functions in the campaign store. Derived fields are dropped by the adapter's `serialize`.
- **Deterministic randomness.** Seeded RNG and noise only; same seed, same map.
- **Rust does files and OS, TypeScript does everything else.** The renderer never imports Tauri APIs.
- **Native menu owns commands** once the Tauri shell lands. Held-gesture keys (Space to pan while painting, Shift to constrain) are the only keydown handlers, and they are listed here so the exception does not spread.

## Naming

Product name is Map & Territory, final. It still lives in exactly two places: `src/branding.ts` (`PRODUCT_NAME`) and `src-tauri/tauri.conf.json`. Never hardcode it in user-facing strings. Domain term is Campaign, never Project or Scene.

## Language

NZ English in user-facing strings (`colour`, `organisation`); identifiers, CSS properties and platform spellings stay standard (`color`).
