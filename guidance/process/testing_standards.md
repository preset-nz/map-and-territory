# Testing Standards

Scope: source of truth for how we test (philosophy, structure, coverage, tooling). Excludes general coding rules and Next.js implementation patterns.

This document defines the testing approach and quality standards that apply to all feature development, scaled appropriately by complexity level.

## Core Testing Philosophy

**Economic Testing Strategy**: Write minimal tests needed to ensure quality, focusing on critical user paths rather than comprehensive coverage metrics.

## Universal Testing Requirements

Regardless of complexity level, all features must meet these baseline testing requirements:

### Test Suite Validation

- **Complete Test Suite**: Always run full test suite via @test-automation-vitest
- **Focused Coverage**: Target critical user paths, not comprehensive coverage metrics
- **Performance Spot Checks**: Single key performance bottleneck validation
- **Accessibility Testing**: WCAG compliance with React Testing Library

### Testing Principles

- **Type Safety**: Test component interfaces and prop validation
- **Critical Path Testing**: Focus on essential user workflows over exhaustive scenarios
- **User Behavior Testing**: Focus on user interactions, not implementation details
- **Error Boundaries**: Test error handling and graceful fallbacks
- **Economic Test Design**: Write tests that matter for business logic, avoid testing framework internals

## Testing Standards by Complexity

### Level 1 (Simple Features)

- **Happy Path + Edge Cases**: Test normal usage and realistic error scenarios
- **Basic Validation**: Ensure feature works as intended without breaking existing functionality
- **Streamlined Testing**: Minimal test coverage focused on core functionality

### Level 2 (Medium Features)

- **Behavior Driven Development**: Test what the tool does, not how it does it
- **Integration Testing**: Verify feature integrates properly with existing system
- **User Journey Testing**: Test complete user workflows through the feature

### Level 3 (Complex Features)

- **Comprehensive Coverage**: Full test coverage of complex interactions and edge cases
- **Performance Testing**: Validate performance requirements and bottlenecks
- **Cross-Feature Integration**: Test impact on existing features and plugin compatibility
- **Accessibility Compliance**: Full WCAG compliance validation

## Technology-Specific Testing

### TypeScript Testing

- **Interface Validation**: Test TypeScript interfaces and type contracts
- **Component Prop Testing**: Validate React component prop requirements
- **Type Safety Verification**: Ensure TypeScript compilation and type checking

### React Testing Library

- **User-Centric Testing**: Use React Testing Library queries that mirror user interactions
- **Accessibility Testing**: Leverage testing library's accessibility-focused approach
- **Component Behavior Testing**: Test component behavior from user perspective

### Vitest Integration

- **BDD Approach**: Use describe/it structure with behavior-focused test names
- **Test Isolation**: Ensure tests run independently and don't affect each other
- **Performance Monitoring**: Use Vitest's performance testing capabilities where relevant

### Playwright E2E

- Specs live under `src/test/e2e`.
- Local run: `CI=1 PORT=3211 pnpm test:e2e` (dev server auto-starts) This prevent's AI from getting stuck if there are errors.
- CI run: `CI=1 PORT=3211 pnpm test:e2e` (sets a fixed port and disables server reuse via `CI=1`).

## Plugin Testing Requirements

### Plugin Compatibility

- **Integration Tests**: Verify plugin system integration for all plugin-related features
- **Isolation Testing**: Ensure plugin features don't interfere with core functionality
- **Security Testing**: Validate plugin security boundaries and isolation

### Plugin Development

- **Manifest Validation**: Test plugin manifest parsing and validation
- **API Contract Testing**: Verify plugin API contracts and interfaces
- **Error Handling**: Test plugin error scenarios and graceful degradation

## Test Organization

### Test Structure

```
tests/
├── unit/                    # Unit tests for individual components/functions
├── integration/             # Integration tests for feature workflows
├── accessibility/           # Accessibility compliance tests
└── performance/            # Performance and load testing
```

### Test Naming Conventions

- **Describe Blocks**: Use feature/component names: `describe('UserAuthentication', ...)`
- **Test Cases**: Use behavior descriptions: `it('should display error when login fails', ...)`
- **File Names**: Match component names: `UserAuthentication.test.ts`

## Quality Gates

### Pre-Implementation

- **Test Strategy**: Define testing approach in solutions_design.md
- **Test Planning**: Include test file paths and key test scenarios

### During Implementation

- **Test-Driven Development**: Write tests alongside implementation
- **Continuous Validation**: Run tests during development to catch regressions

### Post-Implementation

- **Full Test Suite**: Complete test suite must pass before feature completion
- **Coverage Validation**: Verify critical paths are covered
- **Performance Validation**: Confirm performance requirements are met

## Testing Documentation

### Required Documentation

- **Test Strategy**: Document testing approach in solutions_design.md
- **Test Results**: Include test results in implementation documentation
- **Coverage Reports**: Document test coverage and any gaps

### Test Maintenance

- **Living Documentation**: Tests serve as executable specifications
- **Test Updates**: Update tests when requirements change
- **Test Cleanup**: Remove obsolete tests and update outdated ones

## Success Criteria

Testing is successful when:

- **All Tests Pass**: Full test suite passes without failures
- **Critical Paths Covered**: Essential user workflows are thoroughly tested
- **Performance Validated**: Performance requirements are met and verified
- **Accessibility Confirmed**: WCAG compliance is validated through testing
- **Plugin Compatibility**: Plugin system integration is verified where applicable
