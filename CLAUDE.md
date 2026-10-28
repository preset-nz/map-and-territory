# Map & Territory — Claude instructions

Hexmap editor for tabletop RPGs: professional editing tools, gritty analog-looking maps. Part of the preset.nz desktop family with Oblique, Strata, Fault and Shard. Adopted 2026-09-17; being rebuilt as a native Tauri 2 app from the family template (`create-preset-app`), with its object model on POM in Rust. The 2025 app is the tag `v2025-next`.

**Stack:** Tauri 2, React 19, TypeScript, Vite 7, Tailwind v4, on `@preset.nz/ux-kit` (look), `@preset.nz/app-kit` (menu, Undo, files, window restore) and rhizome/POM (the document, `@preset.nz/pom`). The shell came from the template in epic 14; the app is `src/app/`. `src/render/` and `src/layers/` are the 2025 worker renderer and layer adapters, kept and fed from the document. The 2025 Zustand stores and plugin runtime were deleted in epic 16 story 10 (tag `v2025-next` has them).

## Where the truth lives

- **Design & plans:** `~/rhizomatic-preset/guidance/projects/map-and-territory/` — NOT in this repo.
  - `README.md` — locked decisions. Read it before implementing anything. They are leans, not law (`~/.claude/CLAUDE.md`, "Locked decisions are leans, not law"): follow them, and when the code or a newer decision argues against one, say so with the reason and ask Georg rather than working around it.
  - `design/architecture.md` — domain, render pipeline, `.campaign` file, plugin stance, native mechanics.
  - `features/roadmap.md` and `features/NN-*/README.md` — epics and stories. Work is story-driven: implement exactly one story's scope against its acceptance criteria.
  - `archive/2025-codex-guidance/` — the original guidance tree, deprecated. History only.
- Cross-project contracts this app conforms to: `~/rhizomatic-preset/guidance/design/native-apps.md`, `plugin-primitive.md`, `facets.md`, `versioned-persistence.md`, `tauri-scaffold.md`.
- This repo holds code and code-near explainers only. Planning docs never land here.

## Workflow

Family rules (one story per commit, `just check`, subagents don't commit) are in `../CLAUDE.md`. `just check` is the gate: tsc, Biome, `vite build`, Vitest, cargo fmt, clippy, cargo test, licences. `just run` opens the app in its Tauri window; `just build` makes the release bundle. `just smoke` runs the window tests in `tests/window/` on app-smoke (`tools/app-smoke`) against a debug bundle; quit `just run` first.

## Hard rules

- **Array order is z-order.** `paper` is index 0, `hexgrid` is last. Never special-case draw order in a backend.
- **Adapters draw, the host clips and transforms.** No screen-space maths inside a layer adapter. Every visual adapter implements `getInvalidationKey`; no state-diffing fallback.
- **No consumer reads store shape directly.** Plugins go through the host API; components go through selector hooks.
- **Plugins declare contributions; the host wires them.** A plugin never reaches into a registry or store. First-party only; capability tokens are authoring discipline, not security. Until epic 04 brings the host API back, the only contribution is a layer kind's drawing adapter, wired in `src/layers/builtin.ts`.
- **Layer state is serialisable JSON.** No handles, canvases or functions in the campaign store. Derived fields are dropped by the adapter's `serialize`.
- **Rust owns the document; TypeScript draws and edits through commands.** The campaign is a rhizome tree on POM in the Tauri-free crate `crates/map-and-territory-model/` (kinds, policy, checks, commands) behind `src-tauri/src/document.rs`. The webview reads it only through `@preset.nz/pom`'s mirror and changes it only by running commands. The renderer never imports Tauri APIs or the package; it gets a `SceneFrame` from `src/app/scene/frame.ts`.
- **A rule is implemented in one place: Rust.** Checks, defaults, derived values (a key number, a map's drawn shape) and whether a command may run live beside the kind. The webview reads stored values from the mirror and derived ones from the projection (rhizome epic 07), and asks Rust whether a command is enabled; it never re-derives one. A rule in two places is a bug: delete one, don't add a test that keeps them in step (Family requirements, 2026-10-29).
- **Native menu owns commands.** They live in `src-tauri/src/menu.rs` (and the built-in items in `src-tauri/menu.toml`); the webview binds them by id. Settings is off until there is a real preference. Held-gesture keys (Space to pan while painting, Shift to constrain) are the only keydown handlers, and they are listed here so the exception does not spread.

## Naming

Product name is Map & Territory, final; it still goes through `PRODUCT_NAME`. Domain term is Campaign, never Project or Scene.
