# Complexity and Effort Classification Framework

This document defines the 3-level complexity classification system that governs all feature development processes within the project. All process documents reference this framework and expand with process-specific clarifications.

## Effort Proportionality Principle

**Core Principle**: The effort invested in requirements, design, documentation, and implementation must be directly proportional to the feature's importance and complexity. All levels follow the same process and produce the same artifacts, but vary in depth and detail.

## Classification Levels

### Level 1: Simple Changes

**Scope**: Minimal impact changes requiring basic analysis and implementation
**Effort**: Concise, focused documentation and implementation
**Time Investment**: Low - streamlined approach with essential coverage

**Examples**:

- Bug fixes and error corrections
- Minor UI tweaks and adjustments
- Single-function additions
- Configuration updates and parameter changes
- Small template modifications
- Basic utility function additions

**Characteristics**:

- **Limited Scope**: Changes confined to 1-3 files typically
- **Low Risk**: Minimal impact on existing functionality
- **Straightforward Implementation**: Clear path forward with few unknowns
- **Essential Dependencies**: Natural sequential dependencies acceptable

### Level 2: Medium Features

**Scope**: Moderate complexity features requiring focused analysis and planning
**Effort**: Moderate detail with key decisions explained
**Time Investment**: Medium - balanced approach with targeted depth

**Examples**:

- New service methods and API endpoints
- Template additions with logic
- Configuration enhancements with validation
- Small integrations with external services
- Component modifications with business logic
- Database schema additions

**Characteristics**:

- **Moderate Scope**: Changes spanning 3-10 files typically
- **Moderate Risk**: Some impact on related components
- **Key Decisions Required**: Several design choices need documentation
- **Reasonable Independence**: Key dependencies identified, others minimized

### Level 3: Complex Features

**Scope**: High complexity features requiring comprehensive analysis and planning
**Effort**: Comprehensive documentation with full rationale
**Time Investment** High - thorough approach with complete coverage

**Examples**:

- New tool additions to the suite
- Major architecture changes and refactoring
- External API integrations with authentication
- Security implementations and cryptographic features
- New CLI command implementations
- Cross-cutting concerns (logging, monitoring, error handling)

**Characteristics**:

- **Broad Scope**: Changes spanning 10+ files typically
- **High Risk**: Significant impact on architecture and multiple components
- **Complex Dependencies**: Multiple external systems or architectural layers involved
- **Full INVEST Compliance**: Maximum independence and comprehensive planning required

## Universal Quality Standards

Regardless of complexity level, all features must meet these baseline requirements:

### Code Quality (All Levels)

- **Clean Code**: Clear, modular, and maintainable implementation
- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **CUPID Properties**: Composable, understandable, predictable, idiomatic, domain-based
- **Security Best Practices**: No exposed secrets, secure by default
- **Existing Conventions**: Follow established patterns and code style

### Testing Requirements (All Levels)

- **Focused Testing**: Write minimal tests needed to ensure quality
- **Happy Path + Edge Cases**: Test normal usage and realistic error scenarios
- **Behavior Driven Development**: Test what the tool does, not how it does it
- **Living Documentation**: Tests serve as executable specifications

### Documentation Standards (All Levels)

- **Proportional Documentation**: Effort matches complexity level
- **Decision Records**: Document key architectural and design choices
- **User-Focused**: Documentation serves actual user needs
- **Maintainable**: Documentation can be kept current with reasonable effort

## Process Application Guidelines

### Requirements Process

- **Level 1**: Brief introduction, 1-3 user stories, basic acceptance criteria
- **Level 2**: Clear introduction, 3-7 user stories, focused acceptance criteria
- **Level 3**: Comprehensive introduction, hierarchical requirements with detailed acceptance criteria

### Design Process

- **Level 1**: Brief coverage of standard design sections (overview, architecture, components)
- **Level 2**: Moderate detail with key technical decisions explained
- **Level 3**: Comprehensive coverage with full rationale, diagrams, and technical depth

### Implementation Planning

- **Level 1**: Minimal task breakdown (2-5 tasks) with essential sequencing
- **Level 2**: Moderate task planning (5-15 tasks) with key dependencies identified
- **Level 3**: Comprehensive task planning (15+ tasks) with full INVEST compliance

### Task Execution

- **Level 1**: Streamlined execution with basic validation
- **Level 2**: Balanced execution with moderate testing strategies
- **Level 3**: Comprehensive execution with full test coverage and validation

## Classification Decision Matrix

When determining complexity level, consider these factors:

| Factor                    | Level 1          | Level 2            | Level 3               |
| ------------------------- | ---------------- | ------------------ | --------------------- |
| **Files Modified**        | 1-3              | 3-10               | 10+                   |
| **Systems Affected**      | Single component | Related components | Multiple systems      |
| **External Dependencies** | None/minimal     | 1-2 integrations   | Multiple integrations |
| **Risk Level**            | Low              | Moderate           | High                  |
| **User Impact**           | Minimal          | Moderate           | Significant           |
| **Time Investment**       | Hours-Days       | Days-Week          | Week-Weeks            |

## Usage Guidelines

### For Process Documents

When referencing this framework in process documents:

1. Link to this document for the core framework
2. Expand with process-specific details and examples
3. Maintain consistency with the three levels
4. Apply the effort proportionality principle

### For Command Documents

When creating command-specific guidance:

1. Reference appropriate complexity levels for the command's typical use cases
2. Provide complexity-specific examples relevant to the command
3. Adjust instruction detail based on typical complexity

### For Implementation

When implementing features:

1. Classify the feature early in the requirements process
2. Apply appropriate effort levels throughout the development process
3. Adjust classification if scope changes significantly during development
4. Document the classification decision for future reference

## Framework Evolution

This classification framework should evolve based on:

- Experience with feature development across different complexity levels
- Feedback from development teams on classification accuracy
- Changes in project scope, technology stack, or organizational needs
- Lessons learned from successful and unsuccessful feature implementations

When updating this framework, ensure all referencing documents are updated to maintain consistency across the development process.
