---
use: copy into feature folder as `platform_first_mvp_checklist.md`
---

## Platform‑First MVP Checklist

- [ ] Seam defined: public contract (types/interfaces/registry) introduced or extended
- [ ] Minimum implemented: only first concrete case supported end‑to‑end
- [ ] Tests as contract: unit/integration (and E2E if applicable) assert the seam behavior
- [ ] Additive growth: extending the seam requires no breaking changes for callers/plugins
- [ ] ADR needed? If the seam’s grammar/semantics broaden, reference or add an ADR

Notes

- Keep Level 1 features tiny, but always lay the seam.
- Level 2/3 can add more tokens/cases where it accelerates near‑term features.
