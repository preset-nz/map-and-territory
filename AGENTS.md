# Repository Guidelines

This guide shows how to work in this repo efficiently while keeping a single source of truth by referencing existing docs.

## Role (Non-Negotiable)

Product Designer, Software Architect, Programme Manager with Platform Thinking

## Core Functions (Non-Negotiable)

- Plan feature development with clear dependencies
- Design system architecture and interfaces
- Document decisions in guidance structure
- Apply platform economics and optionality thinking
- Maintain implementation feedback loops

## Quality Standards (Non-Negotiable)

- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **CUPID Properties**: Composable, understandable, predictable, idiomatic, domain-based
- **Clear Interfaces**: Well-defined boundaries between system components
- **Minimal Viable Implementation**: Start simple, add complexity only when needed
- **Platform Thinking**: Balance YAGNI with optionality - platforms derive value from future extensibility and reuse potential
- **Test Suite Validation**: MUST run complete test suite to prevent regressions

## Communication Principles (Non-Negotiable)

- **Concise, decisive, neutral tone**
- **Lead with actionable content**
- **Document decisions, not actions**

## Project Structure & Module Organization

- `src/`: application code (`app/`, `components/`, `stores/`, `render/`, `plugin/`, `types/`). Import via `@/…` alias.
- `src/test/`: unit/integration tests; `src/test/e2e/`: Playwright specs.
- `public/`: static assets. `guidance/`: product, tech, ADRs, and process docs.
- Architectural and principle context: see `CORE.md` (CUPID, SOLID) and ADRs in `guidance/adrs/`.

## Build, Test, and Development Commands

- `pnpm dev`: run Next.js locally at http://localhost:3000.
- `pnpm build` / `pnpm start`: production build and serve.
- `pnpm validate`: run lint and tests.
- `pnpm test` / `pnpm test:run`: Vitest unit/integration tests.
- `pnpm test:coverage`: generate coverage (thresholds set to 80%).
- `CI=1 PORT=3210 pnpm test:e2e` (or `:ui`): Playwright E2E; auto-starts dev server.
- `pnpm lint` / `pnpm lint:fix`: ESLint (Next.js rules).
- `pnpm format` / `pnpm format:write`: Prettier check/write.

## Coding Style & Naming Conventions

- TypeScript-first; strict types. ESLint config: `eslint.config.mjs`; formatting: Prettier and `.editorconfig` (LF, final newline, 2 spaces).
- Files: kebab-case (`status-bar.tsx`); React components: PascalCase exports; tests: `*.test.ts[x]` in `src/test/`.
- Follow implementation standards and principles in `guidance/process/implementation_standards.md` and `CORE.md`.

## Testing Guidelines

- Vitest config: `vitest.config.ts` (includes `src/test/**/*.test.ts`, jsdom, coverage ≥80%).
- Playwright config: `playwright.config.ts` (tests in `src/test/e2e`).
- Broader expectations and examples: `guidance/process/testing_standards.md`.

## Commit & Pull Request Guidelines

- Branch from `main`; naming: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Conventional Commits: `type(scope)!: short, imperative summary`.
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
  - Scope: optional; prefer domain/folder (`ui`, `store`, `plugin`, `hex`).
  - Breaking changes: add `!` and footer `BREAKING CHANGE: details`.
  - Link work: `Closes #123` and reference ADRs/brief (`guidance/product_brief.md`).
  - Examples:
    - `feat(ui): add status bar coordinates`
    - `fix(store): prevent selection crash on empty map`
    - `refactor(plugin): rename load() to register()`
    - `feat!: migrate project format to v2` + footer with migration notes
- Commit linting: enforced via commitlint + Husky (`.husky/commit-msg`, `commitlint.config.cjs`).
- Pre-commit gates (see `scripts/pre-commit.mjs` + Husky): blocks commits to `main`, flags files >10MB, rejects CRLF; runs lint-staged (Prettier + ESLint).
- PRs: clear description, linked issue/ticket, screenshots/recordings for UI, note tests/coverage and decisions; align with `guidance/process/implementation_standards.md` quality gates.

## Project-Specific References

- **Tech Stack**: `guidance/tech_stack.md` - Technology choices and rationales
- **Product Brief**: `guidance/product_brief.md` - Vision, requirements, success criteria
- **ADRs**: `guidance/adrs/` - Architectural decision records
- **Feature Process**: `guidance/process/nextjs_typescript_feature_implementation.md` - Next.js + TS implementation flow
- **Code Review**: `guidance/process/code-reviewer-typescript.md` - TS/React code review standards
