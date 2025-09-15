# Next.js + TypeScript Feature Implementation Guide

Scope: source of truth for implementing features in this repo using Next.js App Router + TypeScript. Excludes repo‑wide standards and detailed testing rules.

Combines our senior Next.js and senior TypeScript practices into a single, repo‑specific process for implementing features. Use this alongside `guidance/process/implementation_standards.md` and `guidance/process/testing_standards.md`.

Current Phase Policy: see `guidance/process/forward_ever_phase.md` (no flags/back‑compat; migrate consumers in‑ticket).

## Scope & Inputs

- Start with the problem statement in `guidance/product_brief.md` and related tickets.
- Check tech choices and patterns in `guidance/tech_stack.md` and relevant ADRs in `guidance/adrs/`.
- Classify effort using `guidance/process/complexity_effort_classification.md`.

## Pre‑Implementation Checklist

- Identify impacted areas under `src/` (e.g., `app/`, `components/`, `stores/`, `plugin/`).
- Platform‑First MVP: define the seam first — add/adjust types in `src/types/…` (or `@/plugin/types`) and introduce registries/contracts that future features can extend.
- Decide Server vs Client component boundaries; prefer Server Components for data/IO.
- Plan tests and fixtures up front (see Testing section).

## Implementation Flow

1. Types & Contracts (Platform‑First): add/update types in `src/types/` and public API surfaces under `@/…`; create minimal registries/seams with one concrete use.
2. Next.js App Router:

- Prefer Server Components for data fetching; wrap with a small Client component only for interactivity.
- Use route/layout composition and `loading.tsx`/`error.tsx` where appropriate.

3. Components & State:

- Functional React components, hooks in `src/hooks/`. Client state via Zustand in `src/stores/`.

4. Plugins:

- Keep plugin code in `src/plugin/` (or `src/plugin/builtin/`). Avoid leaking internals; use exported types/APIs.
- Mutate campaign state through `ToolContext` helpers (e.g., `ctx.applyLayerState`) or the platform runtime wrappers—importing `@/stores/**` from plugins is forbidden and linted.
- Read state via `ctx.getActiveLayerState` or the exposed AppAPI selectors.

Example: seam-first tool mutation

```ts
const paintTool: ToolHandler = {
  id: "paint",
  onPointerDown(_pt, _env, ctx) {
    if (ctx.selection.kind !== "layer") return;
    ctx.applyLayerState(ctx.selection.id!, (draft) => {
      draft.lastEditedAt = Date.now();
    });
  },
};
```

5. Performance:

- Code‑split via route boundaries and `dynamic(() => import('…'))` for heavy client components.
- Minimize client bundles; prefer RSC + small client islands.

Example: Server + Client split

```tsx
// app/example/page.tsx (Server)
export default async function ExamplePage() {
  const data = await getData();
  return <ExampleClient initial={data} />;
}

// components/example-client.tsx (Client)
("use client");
export function ExampleClient({ initial }: { initial: Data }) {
  // interactive logic here
  return <div>{initial.title}</div>;
}
```

## File Organization

- Follow existing structure: `src/app`, `src/components`, `src/stores`, `src/plugin`, `src/types`.
- Tests live in `src/test/` with `*.test.ts[x]`; Playwright specs in `src/test/e2e`.

## Coding Checklist

- Adhere to repo standards in `guidance/process/implementation_standards.md` (lint, types, docs, quality gates).
- Use TypeScript strict; formatting via Prettier; lint via ESLint (see `.editorconfig`, `eslint.config.mjs`).

## Testing

- Unit/Integration: Vitest (`vitest.config.ts`) with jsdom. Coverage ≥80% enforced; tests double as living contracts for seams.
- RTL for component behavior; avoid testing implementation details.
- E2E: Playwright specs under `src/test/e2e`; run `pnpm test:e2e` (dev server auto‑starts per `playwright.config.ts`).
- Process and examples: `guidance/process/testing_standards.md`.

## Performance & Quality

- Monitor bundle impact; prefer server work, memoize client components prudently.
- Use Suspense/loading states for progressive rendering.
- Validate with the quality gates in `guidance/process/implementation_standards.md`.

## PR Checklist

- Conventional Commits (enforced): see `AGENTS.md` and `commitlint.config.cjs`.
- Include rationale and links (brief/ADRs). Update or add ADRs in `guidance/adrs/` when changing architecture.
- Ensure lint, types, unit, coverage, and E2E pass locally before pushing.
- Add screenshots for UI changes.
