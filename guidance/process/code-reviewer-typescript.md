# TypeScript/React Code Review Standards

Scope: authoritative checklist and heuristics for reviewing TypeScript + React (Next.js) code in this repository. Use alongside implementation_standards.md and testing_standards.md. Keep this document pragmatic and reference-first.

Related:

- implementation_standards.md (how we build)
- testing_standards.md (how we validate)
- nextjs_typescript_feature_implementation.md (feature workflow)

## Review Focus Areas

### TypeScript Quality

- Type safety: avoid `any`; prefer precise, composable types.
- Interfaces: clean, extensible, backwards-compatible contracts.
- Generics: use constraints and variance appropriately.
- Utility types: leverage built-in helpers to reduce duplication.
- Module organization: clear boundaries; explicit export barrels only where helpful.

### React Best Practices

- Component design: small, focused, composable components.
- Hooks: extract reusable logic; avoid conditional hooks.
- Performance: memoization where measurable; defer work with `useMemo`, `useCallback`, dynamic imports.
- State: prefer local state first; Zustand/TanStack Query where justified.
- Server components: choose server/client boundary intentionally in Next.js.

### Plugin Architecture

- Manifest: structure and validation are correct; minimal surface area.
- Contracts: stable, versioned interfaces; no hidden coupling.
- Isolation: sandboxing boundaries respected; no direct global access.
- ToolContext seam: confirm tools/commands mutate state through `ToolContext` or the plugin runtime helpers—flag any direct `@/stores/**` imports.
- Performance: lazy loading; no blocking on plugin discovery.
- Failure modes: graceful degradation and clear errors.

## Code Review Checklist

### 1) Type Safety and Interfaces

```ts
// ❌ Avoid
function processData(data: any) {
  /* ... */
}

// ✅ Prefer
interface ProcessableData {
  id: string;
  content: Record<string, unknown>;
  metadata?: DataMetadata;
}
function processData(data: ProcessableData) {
  /* ... */
}
```

### 2) Component Performance

```tsx
// ❌ Unnecessary re-renders
function ExpensiveComponent({ data }: { data: Item[] }) {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
}

// ✅ Memoized calculations
function ExpensiveComponent({ data }: { data: Item[] }) {
  const result = React.useMemo(() => expensiveCalculation(data), [data]);
  return <div>{result}</div>;
}
```

### 3) Plugin Integration

```tsx
// ❌ Direct global plugin access
const plugin = (window as any).plugins.get("detection-viewer");

// ✅ Registry-based access via contracts
const viewers = usePluginRegistry().findViewersFor(node);
const Primary = viewers[0]?.component ?? DefaultViewer;
return <Primary node={node} />;
```

## Performance Review

### Bundle size

- Prefer dynamic imports for large or seldom-used code.
- Verify library choices support tree-shaking.
- Optimize assets (images, fonts) and loading strategy.
- Lazy load plugins; prefetch when it improves UX.

### Runtime

- Use virtualization for large lists.
- Clean up resources in effects; avoid leaks.
- Debounce/throttle hot path events.
- Batch state updates; avoid unnecessary renders.

### Web Vitals

- LCP: limit above-the-fold work.
- FID: minimize JS on first load; split per route.
- CLS: reserve layout space; avoid late-loading shifts.
- TTI: reduce hydration work; prefer server components.

## Security Review

### Plugin security

- Validate manifests and constrain capabilities.
- Keep API access least-privileged.
- Sanitize plugin-rendered content (XSS defenses).
- Audit external resource usage and origins.

### Data handling

- Validate and sanitize inputs and responses.
- Handle auth tokens correctly; avoid localStorage unless required.
- Correct CORS and headers for cross-origin interactions.
- Keep secrets in env; avoid accidental exposure.

## Architecture Review

### Module organization (good example)

```text
src/
├─ components/
│  ├─ ui/          # Reusable UI
│  ├─ features/    # Feature components
│  └─ layout/      # Layout
├─ stores/         # Zustand slices
├─ plugin/         # Plugin system
├─ render/         # Render backends/host
└─ types/          # Types and barrels
```

### Decisions

- Put reasoning in ADRs for non-obvious tradeoffs.
- Prefer small, composable interfaces and adapters.

## Success Metrics

- Type safety: minimal `any`, strong inference; compile clean.
- Performance: bundle within targets; no obvious regressions; measured improvements where changed.
- Plugin quality: manifests validated; contracts tested; graceful errors.
- Security: no critical issues; correct permission and sanitization.
- Maintainability: clear structure; good docs; low churn to modify.

## How to Use in PRs

- Start with the checklist; link to specific sections in review comments.
- Request measurable evidence for perf-sensitive changes.
- Ask for tests when behavior is changed or added; reference testing_standards.md.
- If a change spans architecture, reference or add an ADR.
- When reviewing plugins, verify lint enforces the `ToolContext` seam (no `@/stores/**` imports) and point authors to the Interdependencies Refactor guidance when gaps appear.
