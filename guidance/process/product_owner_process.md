# Product Owner Process

Purpose: Produce concise product requirements aligned with complexity level.

Primary artifact: `guidance/feature/{ticket}/product_requirements.md`

Reference: guidance/process/complexity_effort_classification.md

## Responsibilities

- Classify feature Level 1/2/3 and state it up front.
- Define problem, outcomes, scope boundaries, and acceptance criteria.
- Capture user stories and non‑functional constraints relevant to value.

## Depth by Level

- Level 1: 3–7 bullets total (problem, short scope, 3–5 ACs). No diagrams.
- Level 2: Focused narrative (≤1 page) + ACs; optional lightweight diagram.
- Level 3: Full narrative with alternatives and risks.

## Required Sections (any level)

- Meta: ticket/id, owner, date, level
- Problem & Value
- Out of Scope (keep tight)
- Acceptance Criteria (testable; enable traceability, not a QA plan)
- Risks/Assumptions (bullets)

Use `guidance/templates/product_requirements.template.md` to start.

## Heuristics

- Keep Level 1 ruthlessly short: 3–7 bullets and 3–5 ACs max.
- Prefer concrete, observable ACs; avoid "improve/optimize" without a measure.
- Declare what won’t be done (Out of Scope) to prevent creep.
- Reuse existing concepts (stores, adapters) rather than inventing new primitives.
