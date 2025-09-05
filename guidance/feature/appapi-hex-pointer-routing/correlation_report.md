---
ticket: T-004
feature: AppAPI.hex + Pointer Routing
reviewer: Pre‑prod QA (Correlation)
date: 2025-09-05
level: 2
---

## Summary

Alignment across `product_requirements.md`, `solutions_design.md`, and `tasks.md` is strong. The three artifacts declare Level 2, share scope, and trace acceptance criteria to design interfaces and concrete tasks. No red‑flag contradictions found. Minor iteration requests are noted below.

## Checklist Results

- Level consistency: All three set `level: 2` and depth matches.
- Scope symmetry: In‑scope items (AppAPI.hex surface, pointer→hex, Status Bar, tests, migration, docs) appear in design and tasks.
- AC traceability: Each AC has a corresponding design contract and task(s) to implement/validate.
- Naming/versioning: `ticket: T-004`, feature name consistent across files.
- Interfaces: Public `AppAPI.hex` methods and layout/types in design are referenced by tasks; store/UI updates are explicit.
- Risk/assumption closure: Precision and layout derivation risks have validation tasks (fixtures, integration tests) to close them.

## Traceability (AC → Design → Tasks)

- API surface (`fromPoint`, `toPoint`, `round`, `distance`, `neighbors`, `diagonals`, `ring`, `range`, `line`, conversions)
  - Design: Interfaces & Contracts section defines signatures and types.
  - Tasks: “Implement conversions and kernels … with fixtures”.

- Pointer events provide `{q,r}` when hexgrid visible; `null` otherwise
  - Design: UI/Event Contracts; Data/State Changes (required `hex` field on mousePosition).
  - Tasks: “Integrate pointer→hex in Canvas Viewport …”; “Update layout store … `hex: {q,r}|null`”.

- Status Bar renders `Hex: q,r` or `—`
  - Design: UI/Event Contracts references Status Bar consumption.
  - Tasks: “Update Status Bar to show `Hex: q,r` or `—`”.

- Migrate plugins/tools to `AppAPI.hex`; remove legacy helpers
  - Design: Forward‑Ever note; migration intent.
  - Tasks: Migration targets list; repo‑wide removal gate.

- Tests: geometry fixtures; integration for both orientations
  - Design: Testing Strategy details unit + integration coverage.
  - Tasks: Validation Hooks and coverage gate (≥90% for hex lib).

- Docs updated with attribution and ADR links
  - Design: Attribution note; ADR references.
  - Tasks: Documentation task and gate.

## Red Flags

None observed for Level 2. Scope and ceremonies match the level. No hidden new subsystems. Tasks include validation hooks.

## Iteration Requests (Applied)

- Acceptance Criteria updated: Added explicit line that the store shape includes `mousePosition.hex` as a required field (`{q,r}|null`).
- Precision policy documented: Testing Strategy now defines `EPS = 1e-6` and includes boundary fixtures; tie-break behavior is documented.

## Decision

Ready to start development. Preconditions met: consistent level, complete traceability, gates defined. Proceed to M1→M2 with ADR‑0007 as the guiding contract and run the full test suite during implementation.
