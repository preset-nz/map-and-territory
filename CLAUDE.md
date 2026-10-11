# Map & Territory — Claude instructions

Hexmap editor for tabletop RPGs: professional editing tools, gritty analog-looking maps. Part of the preset.nz desktop family with Oblique, Strata, Fault and Shard. Adopted 2026-09-17; being rebuilt as a native Tauri 2 app from the family template (`create-preset-app`), with its object model on POM in Rust. Next.js was removed 2026-10-12; the 2025 app is the tag `v2025-next`, and `src/` is port material until the shell lands (roadmap epics 13 to 16).

## Where the truth lives

- **Design & plans:** `~/rhizomatic-preset/guidance/projects/map-and-territory/` — NOT in this repo.
  - `README.md` — locked decisions. Read it before implementing anything; do not re-litigate locked decisions in code.
  - `design/architecture.md` — domain, render pipeline, `.campaign` file, plugin stance, native mechanics.
  - `features/roadmap.md` and `features/NN-*/README.md` — epics and stories. Work is story-driven: implement exactly one story's scope against its acceptance criteria.
  - `archive/2025-codex-guidance/` — the original guidance tree, deprecated. History only.
- Cross-project contracts this app conforms to: `~/rhizomatic-preset/guidance/design/native-apps.md`, `plugin-primitive.md`, `facets.md`, `versioned-persistence.md`, `tauri-scaffold.md`.
- This repo holds code and code-near explainers only. Planning docs never land here.

## Workflow

Family rules (one story per commit, `just check`, subagents don't commit) are in `../CLAUDE.md`. `just check` is the gate; `just run` and `just build` have nothing to run until epic 14.

## Hard rules

- **Array order is z-order.** `paper` is index 0, `hexgrid` is last. Never special-case draw order in a backend.
- **Adapters draw, the host clips and transforms.** No screen-space maths inside a layer adapter. Every visual adapter implements `getInvalidationKey`; no state-diffing fallback.
- **No consumer reads store shape directly.** Plugins go through the host API; components go through selector hooks.
- **Plugins declare contributions; the host wires them.** A plugin never reaches into a registry or store. First-party only; capability tokens are authoring discipline, not security.
- **Layer state is serialisable JSON.** No handles, canvases or functions in the campaign store. Derived fields are dropped by the adapter's `serialize`.
- **Rust does files and OS, TypeScript does everything else.** The renderer never imports Tauri APIs.
- **Native menu owns commands** once the Tauri shell lands. Held-gesture keys (Space to pan while painting, Shift to constrain) are the only keydown handlers, and they are listed here so the exception does not spread.

## Naming

Product name is Map & Territory, final; it still goes through `PRODUCT_NAME`. Domain term is Campaign, never Project or Scene.
