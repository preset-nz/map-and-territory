# Implementation Standards

Scope: repository-wide implementation rules and quality gates. Excludes testing details (see `guidance/process/testing_standards.md`) and Next.js how‑to flow (see `guidance/process/nextjs_typescript_feature_implementation.md`).

This document defines the technical standards and best practices that apply to all implementation work. These standards ensure consistency, maintainability, and quality across all features.

Phase Context: during the active Forward‑Ever phase we do not introduce feature flags or back‑compat scaffolding for core seams; migrate all consumers within the ticket (see `guidance/process/forward_ever_phase.md`).

## Universal Code Quality Standards

All code must meet these baseline requirements regardless of complexity:

### Clean Code Principles

- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **CUPID Properties**: Composable, understandable, predictable, idiomatic, domain-based
- **Clear Interfaces**: Well-defined boundaries between system components
- **Platform‑First MVP**: Ship the smallest slice that establishes durable seams (typed contracts, registries) so future features accelerate. Start simple, but design for additive growth.

### Security Standards

- **No Exposed Secrets**: Never commit secrets, keys, or credentials to repository
- **Secure by Default**: Implement security best practices as the default approach
- **Input Validation**: Validate all user inputs and external data
- **Error Handling**: Fail securely and provide appropriate error messages

### Code Style

- **Existing Conventions**: Follow established patterns and code style in the codebase
- **Consistent Naming**: Use clear, descriptive names for variables, functions, and components
- **Documentation**: Include JSDoc comments for public APIs and complex logic
- **Type Safety**: Use TypeScript strictly with comprehensive type definitions

## Technology-Specific Standards

### TypeScript Standards

- **Strict Configuration**: Use strict TypeScript configuration with proper typing
- **Comprehensive Interfaces**: Define clear interfaces for all data structures
- **Type Safety**: Leverage TypeScript's type system to prevent runtime errors
- **ES2022+ Features**: Use modern JavaScript/TypeScript syntax and features

### React Development

- **Modern Patterns**: Use functional components with hooks
- **Server Components**: Leverage React Server Components where appropriate
- **Suspense**: Implement proper loading states with React Suspense
- **State Management**: Choose appropriate state management based on complexity
  - Local state for simple components
  - Context for moderate shared state
  - Zustand/Redux Toolkit for complex application state

### Next.js Implementation

- For patterns and step‑by‑step guidance, use `guidance/process/nextjs_typescript_feature_implementation.md`.
- Keep pages and layouts lean; push data work to Server Components; minimize client bundles.

## Platform‑First MVP Policy

Purpose: emphasize platform economics without overbuilding. Each feature should ship a minimal vertical slice while establishing explicit seams that compound future speed.

### Three Rules

- **Define the Seam**: Introduce a public contract first (types, interfaces, registries) with narrow scope.
- **Implement the Minimum**: Support the first concrete use case end‑to‑end; leave additional cases as typed, additive space.
- **Lock with Tests**: Add unit/integration (and E2E if applicable) that act as living contracts for the seam.

### Expansion Triggers

- Add more cases/tokens only when the next 1–2 planned features need them.
- Broaden semantics or grammar only behind an ADR when contracts materially change.

### PR Checklist (must answer “yes”)

- Is there a clear seam (typed contract/registry) instead of ad‑hoc conditionals?
- Is only the minimum necessary capability implemented now?
- Do tests assert the contract (not implementation details)?
- Is growth additive (no breaking changes to callers/plugins)?

### Examples

- Toolbar capabilities: define `CapabilityToken` union + `enableWhen` and implement `hasActiveMap` now; add `selectionIs:*`, `hasActiveLayer`, `canAddLayer:*` later.
- Persistence: versioned JSON schema with a `version` field; implement v1, add migrations later.
- Rendering: adapter interface with `getInvalidationKey`; implement for first layer, require for new layers later.

## Architecture Standards

### Component Architecture

- **Single Responsibility**: Each component should have one clear purpose
- **Composition over Inheritance**: Favor component composition patterns
- **Prop Interface Design**: Design clear, minimal prop interfaces
- **Error Boundaries**: Implement proper error boundaries for robust UX

### Plugin Architecture

- **Manifest-Driven**: All plugins must include proper manifest files
- **Proper Isolation**: Ensure plugin code doesn't interfere with core functionality
- **Security Boundaries**: Maintain security isolation between plugins and core
- **API Contracts**: Define clear API contracts for plugin interactions
- **ToolContext Write Seam**: Tools and plugin commands mutate campaign state exclusively via the `ToolContext` helpers (`applyLayerState`, `applyCellsDelta` when introduced) or the platform runtime wrappers under `@/platform/plugin-runtime`. Direct imports from `@/stores/**` are disallowed and blocked by lint (see ADR-0002 and Interdependencies Refactor Phase 5).

### Data Management

- **Immutable Patterns**: Use immutable data patterns where appropriate
- **API Integration**: Implement proper error handling for external API calls
- **Caching Strategy**: Implement appropriate caching for performance optimization
- **Data Validation**: Validate data at system boundaries

## Performance Standards

### Bundle Optimization

- **Code Splitting**: Implement proper code splitting for optimal bundle sizes
- **Tree Shaking**: Ensure unused code is properly removed
- **Dynamic Imports**: Use dynamic imports for non-critical functionality
- **Asset Optimization**: Optimize images, fonts, and other static assets

### Runtime Performance

- **Virtual Scrolling**: Implement virtual scrolling for large datasets
- **Lazy Loading**: Load content and components only when needed
- **Memoization**: Use React.memo and useMemo appropriately
- **Core Web Vitals**: Maintain good Core Web Vitals scores

### Memory Management

- **Event Listener Cleanup**: Properly clean up event listeners and subscriptions
- **Memory Leaks**: Avoid common memory leak patterns
- **Resource Management**: Properly manage and dispose of resources

## Testing Implementation

See `guidance/process/testing_standards.md` for the complete testing philosophy, structure, coverage thresholds, and tooling. This document intentionally avoids duplicating testing requirements.

## Documentation Requirements

### Code Documentation

- **Public API Documentation**: Document all public APIs with JSDoc
- **Complex Logic**: Explain complex algorithms and business logic
- **Decision Rationale**: Document why specific approaches were chosen
- **Examples**: Provide usage examples for complex components or functions

### Implementation Notes

- **Progress Tracking**: Document key decisions and architectural discoveries
- **Performance Impact**: Note bundle size and runtime performance implications
- **Plugin Compatibility**: Document plugin system integration considerations
- **Accessibility**: Document accessibility features and WCAG compliance

## Quality Validation

### Pre-Commit Validation

- **Linting**: Code must pass ESLint validation
- **Type Checking**: TypeScript compilation must succeed without errors
- **Test Suite**: All tests must pass before committing
- **Formatting**: Code must be formatted according to Prettier rules
- **Git Workflow**: Follow `AGENTS.md` for branch naming, local gates, and PR protocol (no commits to `main`)

### Review Standards

- **Code Review**: All code changes require review by appropriate code reviewer agent
- **Architecture Review**: Significant changes require architectural review
- **Security Review**: Security-sensitive changes require security review
- **Performance Review**: Performance-critical changes require performance validation

## Success Criteria

Implementation is successful when:

- **Code Quality**: All quality standards are met consistently
- **Test Coverage**: Critical functionality is properly tested
- **Performance**: Performance requirements are met and validated
- **Security**: Security standards are implemented and verified
- **Maintainability**: Code is readable, modular, and maintainable
- **Plugin Compatibility**: Plugin system integration works correctly
- **Documentation**: Implementation is properly documented for future maintenance
