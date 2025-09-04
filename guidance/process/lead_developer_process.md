# Lead Developer Process

Purpose: Translate requirements into a practical solution design with minimal ceremony.

Primary artifact: `guidance/feature/{ticket}/solutions_design.md`

Reference: guidance/process/complexity_effort_classification.md

## Responsibilities

- Confirm complexity level and dependencies.
- Propose architecture, interfaces, and data flows.
- Record key decisions and ADR links where applicable.

## Depth by Level

- Level 1: One‑pager max: approach, API surface, affected files, risks.
- Level 2: Focused design: diagrams if helpful, test points, rollback plan.
- Level 3: Comprehensive: choices, tradeoffs, sequencing, migration.

## Required Sections (any level)

- Overview & Assumptions
- Interfaces & Contracts (types, props, store methods)
- Data/State Changes (schema, defaults, migration notes)
- Testing Strategy (unit/integration/E2E probes)
- Impact/Risks (perf, DX, UX)

Use `guidance/templates/solutions_design.template.md` to start.

## Heuristics

- Choose the smallest viable interface; extend later behind existing seams.
- Put invariants in the store/adapter (single source of truth), not just the UI.
- Link to relevant ADRs; open a new ADR only for architectural changes.
- Sketch tests before coding to anchor contracts and avoid scope drift.
