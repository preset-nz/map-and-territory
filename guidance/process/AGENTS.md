# Process Guidance

Stacking note: this AGENTS.md complements `/guidance/AGENTS.md`. Prefer these sources:

- Standards: `implementation_standards.md`
- Testing: `testing_standards.md`
- Next.js + TS How‑To: `nextjs_typescript_feature_implementation.md`
- Sizing: `complexity_effort_classification.md`
- Docs structure: `documentation_structure.md`
- Code review: `code-reviewer-typescript.md`

MECE intent

- Each document owns one topic and links to the others. If a change seems to fit two places, pick the canonical source and add a link from the other.

Platform‑First MVP

- Agents prioritize defining seams (typed contracts/registries) and delivering one concrete use. Growth is additive, with tests acting as living contracts. See `implementation_standards.md#platform-first-mvp-policy`.
