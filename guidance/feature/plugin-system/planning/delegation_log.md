Status: In Progress
Last Updated: 2025-09-03

# Delegation Log – New Campaign (NC-01 … NC-08)

Kickoff: 2025-09-03
Decision Authority: Core Orchestrator

Quality Gates (all tickets)

- Follow Implementation Standards and Testing Standards.
- Add/adjust tests as specified in each ticket; run full test suite before handoff.
- Provide short implementation notes and surface any integration risks.

## Assignments

- NC-01 Commands Registry — Owner: @ui-architect — Status: Pending — Depends: M0
- NC-02 Toolbar Slot (campaign group) — Owner: @interaction-agent — Status: Pending — Depends: NC-01
- NC-03 Host Prompt `host.prompt.newCampaign` — Owner: @ui-architect — Status: Pending — Depends: NC-01
- NC-04 Project Service (empty campaign) — Owner: @state-manager — Status: Pending — Depends: M0
- NC-05 Plugin Manifest & Module — Owner: @runtime-architect — Status: Pending — Depends: NC-01, NC-02
- NC-06 Scene Tree Empty State — Owner: @ui-architect — Status: Pending — Depends: NC-04
- NC-07 Persistence: Project Metadata — Owner: @data-engineer — Status: Pending — Depends: NC-04
- NC-08 E2E Test (happy path) — Owner: @quality-agent — Status: Pending — Depends: NC-01..NC-07

## Notes

- Icons & shortcuts per ADR-0004. Campaign empty policy per ADR-0005.
- Host command contract in `planning/host_commands.md`.
- Plugin manifest/module references in `plugins/new-campaign/`.
