# Forward‑Ever Phase Policy (Sep 2025)

Status: Active

Purpose: accelerate foundational changes without accumulating tech debt. During this phase, we prioritize decisive migrations over compatibility shims.

## Rules

- No feature flags for core platform seams (AppAPI, stores, renderer). Ship the new path directly.
- No backward‑compat scaffolding. Update all first‑party consumers in the same change.
- Remove deprecated APIs immediately as part of the PR; avoid dual paths.
- Migration-in-scope: when contracts change, migrate built‑in plugins and tools in the same ticket.
- Tests migrate with code; green suite required before merge.

## PR Checklist Addendum

- All consumers updated (search shows no legacy usage).
- No `feature.*` flags introduced for the seam.
- Docs updated (tickets + solutions design) to reflect the breaking change and migration.

Review with ADR owners if an exception is needed; exceptions require an ADR note with sunset date.
