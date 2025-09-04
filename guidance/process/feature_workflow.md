# Feature Workflow (Roles → Artifacts)

This workflow coordinates four roles to produce three core artifacts per feature, with depth proportional to complexity (see guidance/process/complexity_effort_classification.md).

## Roles and Outputs

- Product Owner → `product_requirements.md`
- Lead Developer → `solutions_design.md`
- Production Coordinator → `tasks.md`
- Pre‑prod QA → correlates the three artifacts; optional `correlation_report.md` for findings (no test plan)

## Folder Convention

- Base: `guidance/feature/{ticket_or_feature_name}/` (preferred). If an existing feature already uses `planning/`, place these files there instead.
- Examples:
  - `guidance/feature/layer-naming/product_requirements.md`
  - `guidance/feature/layer-naming/solutions_design.md`
  - `guidance/feature/layer-naming/tasks.md`
  - `guidance/feature/layer-naming/quality_plan.md`

## Minimal, Proportional Effort

- Classify feature Level 1/2/3 first (Complexity & Effort Framework).
- All four artifacts exist at every level, but shrink/grow in detail:
  - Level 1: micro‑docs (≤1 page each; bullets only)
  - Level 2: focused docs (2–5 pages total across all)
  - Level 3: comprehensive docs (as needed)

## Hand‑Off Order and Gates

1. Product Owner drafts `product_requirements.md` with level and acceptance criteria.
2. Lead Dev proposes `solutions_design.md` and lists decisions/assumptions.
3. Production Coordinator breaks down into `tasks.md` with dependencies/owners.
4. Pre‑prod QA runs correlation review across the three docs; posts findings in `correlation_report.md` (optional) and triggers iteration if inconsistencies exist.

Merge to `main` only when the first three exist, reference the same level, and Pre‑prod QA reports no blocking inconsistencies.

## Templates

Use the templates in `guidance/templates/*.template.md` to bootstrap each file.

## Commit & PR Hygiene

- Use Conventional Commits to satisfy commitlint and avoid retries:
  - Examples: `docs(process): add role processes`, `feat(ui): add layer name field`, `test(e2e): assert numbering`.
- Don’t commit to `main`; pre-commit blocks it. Work on a feature branch like `feat/layer-naming`.
- Keep commits scoped: one logical change per commit; guidance vs feature in separate commits.
- Ensure staged files pass format/lint hooks; Prettier and ESLint run on staged files.
