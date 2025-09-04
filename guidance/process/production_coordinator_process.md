# Production Coordinator Process

Purpose: Plan execution with just enough structure to keep flow moving.

Primary artifact: `guidance/feature/{ticket}/tasks.md`

Reference: guidance/process/complexity_effort_classification.md

## Responsibilities

- Break feature into verifiable tasks and small PRs.
- Map dependencies and critical path; align with tooling (pnpm, tests, lint).
- Ensure tasks reference acceptance criteria and test points.

## Depth by Level

- Level 1: 2–5 tasks; single PR acceptable; checklist OK.
- Level 2: 5–15 tasks; multiple PRs; staged merges; E2E probe.
- Level 3: Full plan with milestones, risk burndown, and rollbacks.

## Required Sections (any level)

- Milestones (if any) and gates
- Task list with owners, estimates, dependencies
- Test/Validation hooks per task
- Rollback/feature flag (when relevant)

Use `guidance/templates/tasks.template.md` to start.

## Heuristics

- Keep PRs small and independently shippable; one behavior per PR when possible.
- Attach validation to each task (unit/integration/E2E) to avoid late QA surprises.
- Sequence by risk: land the invariant‑holding changes first (e.g., store logic), then UI.
- Respect the level: don’t generate 30 tasks for a Level 1 change.
