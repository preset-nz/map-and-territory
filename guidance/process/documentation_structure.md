# Documentation Structure

This document defines the standard file organization and artifact requirements for feature development. All features follow this structure to maintain consistency and enable effective collaboration.

## Feature Directory Structure

Each feature follows this standardized structure:

```
guidance/feature/{feature_name}/
├── planning/
│   ├── requirements.md              # Product Owner: business needs & user stories
│   ├── solutions_design.md          # Lead Developer: technical architecture
│   ├── tasks.md                     # Production Coordinator: task breakdown
│   ├── correlation_report.md        # Pre‑prod QA (optional): inconsistencies & fixes
│   └── delegation_log.md            # Agent tracking & decisions
├── ux/                              # UX Designer artifacts (Level 2+ features)
│   ├── user-journey.md             # User experience mapping
│   ├── interaction-spec.md         # Detailed interaction specifications
│   ├── design-decisions.md         # Design rationale and systems thinking
│   └── user-flows/
│       └── {flow-name}.mmd         # Mermaid flow diagrams
```

## Artifact Distinctions

### requirements.md (Product Owner)

**Purpose:** Business requirements and user needs (what/why)

- User stories with business value
- Acceptance criteria and success metrics
- Scope boundaries and dependencies
- Business context and assumptions

### solutions_design.md (Lead Developer)

**Purpose:** Technical architecture and implementation guidance

- System integration and component architecture
- Data models and API contracts
- Error handling and testing strategy
- Performance, security, and scalability considerations

### tasks.md (Production Coordinator)

**Purpose:** Implementation task breakdown and dependencies

- Atomic, actionable tasks
- Task dependencies and execution order
- Complexity-appropriate detail level
- Progress tracking with clear status indicators

### correlation_report.md (Pre‑prod QA — optional)

Purpose: Correlate the three artifacts; highlight inconsistencies and required edits. Not a QA plan.

- Level consistency, scope symmetry, AC traceability
- Naming/versioning alignment and interface/contract cross‑check
- Red flags and required edits before implementation/merge

### ux/ Directory (UX Designer)

**Purpose:** User experience specifications and interaction design

- User journey mapping and scenarios
- Detailed interaction specifications for developers
- Design rationale using systems thinking approach
- User flow diagrams linked to interactions

## Global Documentation

### Core References

- **Product Brief**: `guidance/product_brief.md` - Vision, requirements, success criteria
- **Tech Stack**: `guidance/tech_stack.md` - Technology choices and rationales
- **ADRs**: `guidance/adrs/` - Architectural decision records (index: `guidance/adrs/README.md`)

### Process Documentation

- **Complexity Framework**: `guidance/process/complexity_effort_classification.md`
- **Orchestration Workflows**: `guidance/process/orchestration_workflows.md`
- **Agent Delegation**: `guidance/process/agent_delegation_guide.md`
- **Testing Standards**: `guidance/process/testing_standards.md`
- **Implementation Standards**: `guidance/process/implementation_standards.md`

## File Naming Conventions

### Feature Names

- Use kebab-case for feature directory names: `user-authentication`, `data-export`
- Include JIRA ticket prefix if applicable: `PUKE-123-user-authentication`

### Flow Names

- Use descriptive kebab-case for Mermaid files: `login-flow.mmd`, `data-selection-flow.mmd`

### Document Status

- All documents include status and last updated information
- Use consistent status indicators: Draft, Review, Approved, Implemented

## Document Lifecycle

### Planning Phase

1. **Requirements** → Created by @product-owner, approved by human
2. **UX Design** → Created by @ux-product-designer (Level 2+ features)
3. **Solutions Design** → Created by @lead-developer, approved by human
4. **Tasks** → Created by @production-coordinator

### Implementation Phase

1. **Delegation Log** → Updated by core agent for each subagent delegation
2. **Tasks** → Updated by implementation agents with progress status
3. **Test Results** → Documented by quality agents

### Maintenance Phase

- Documents updated when changes affect the feature
- ADRs created for significant architectural changes
- Lessons learned integrated into process documentation
