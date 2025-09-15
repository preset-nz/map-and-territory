---
title: Platform MVP Foundations (Icons, Shortcuts, Evaluator, Undo/Redo, IDs, Campaign Naming)
status: Accepted
date: 2025-09-03
deciders: Core Orchestrator, UI Lead, State Architect
---

## Context

Early choices remove friction and align subagents. These are lightweight, reversible defaults to accelerate the first plugins (Scene Buttons, New Campaign) and core UI.

## Decisions

1. Icon System

- Use Radix Icons (via shadcn/ui) with ids `ri:<name>` (e.g., `ri:file-plus`, `ri:save`), scalable and accessible.

2. Keyboard Shortcuts

- Use a minimal in-house mapper for `Mod+Key` patterns for MVP; no dependency. Future: consider `tinykeys` if needed.

3. Expression Evaluator (for `when`/`disabled`)

- MVP: tiny boolean evaluator with whitelisted identifiers: `sceneExists`, `isDirty`, `hasSelection`, `activeTool`, `activeMapExists`.
- Operators: `&&`, `||`, `!`, `()`. No arbitrary code.

4. Undo/Redo

- MVP: action journal with inverse patches per action; scope to scene/layer edits and tool operations. Future: migrate to structural patching if complexity rises.

5. ID Scheme

- UUID v7 for `MapId`, `LayerId`, `ProjectId` for sortability and uniqueness.

6. Campaign Naming vs Domain Model

- UI uses term "Campaign". Domain type remains `Project` to avoid churn. We expose a `campaign` alias in UI only. `Project` holds maps; maps are sometimes called "scenes" in UI.

## Rationale

- Keeps MVP lean, testable, and reversible without blocking progress.
- Aligns with existing shadcn/ui stack and no extra deps.
- Preserves optionality for more powerful evaluators and undo engines later.

## Consequences

- Icon ids and shortcut strings are standardized early for toolbar/commands.
- Evaluator scope limits complex visibility logic for now.
- Tests target UUID v7 properties and journal behavior for edits.

## Follow-ups

- If expression needs grow, introduce a safer expression library or precompiled predicates.
- If undo complexity increases, consider immer patches or command pattern with mementos.
