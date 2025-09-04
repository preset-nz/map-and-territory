# Pre‑prod QA Process (Correlation & Iteration)

Purpose: Correlate the three feature artifacts (requirements, design, tasks) to surface inconsistencies early and trigger a fast corrective loop. This role does not author a QA plan.

Reference: guidance/process/complexity_effort_classification.md

## Responsibilities

- Validate alignment across documents: same feature scope, same complexity level, consistent acceptance criteria.
- Trace acceptance criteria → design sections → tasks; flag missing links or contradictions.
- Check for over/under‑scoping relative to level (guard against ceremony creep for Level 1).
- Raise issues and request targeted edits; capture optional findings in `correlation_report.md`.

## Correlation Checklist (all levels)

- Level consistency: all three docs declare the same level and the depth matches it.
- Scope symmetry: items listed as In‑Scope appear in design and in tasks.
- AC traceability: each AC is implemented (design) and executable (task/test hook).
- Naming/versioning: ticket id and feature name match across files and branches.
- Interfaces: contracts in design correspond to tasks touching the right files/modules.
- Risk/assumption closure: assumptions in requirements/design have tasks to validate or remove them.

## Red Flags (trigger iteration)

- Requirements list 10+ ACs for a Level 1 feature.
- Design proposes new subsystems without matching scope/level or ADR.
- Tasks don’t reference acceptance criteria or lack validation hooks.
- Ambiguous terms (“improve”, “optimize”) without measurable outcomes.

## Output

- Preferred: inline comments/edits on the three docs and a short summary in the PR.
- Optional: `guidance/feature/{ticket}/correlation_report.md` using the template.
