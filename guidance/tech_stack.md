# Technology Stack 2025 - Core Platform

## Runtime Environment

**Node.js 22 LTS** - Latest LTS with enhanced V8 optimizations and superior ESM support

**TypeScript 5.6+** - Enhanced type inference, performance optimizations, and improved developer experience

**Target: ES2022** - Optimal performance while maintaining 95%+ browser coverage (Chrome 109+, Firefox 102+, Safari 16+)

## Frontend Framework

**React 19** - Server Components, enhanced concurrent features, and improved developer experience

**Next.js 15** - App Router with Turbopack providing 10x faster development and native ESM support

## State Management

**Zustand v5** - Lightweight, TypeScript-first client state with minimal boilerplate

**TanStack Query v6** - Industry standard server state management with React 19 compatibility and enhanced garbage collection

## Styling & Components

**Tailwind CSS v4** - Rust-based compilation for 10x speed improvement, CSS-first configuration approach

**shadcn/ui v2** - Radix UI v2 primitives with React 19 support and enhanced accessibility patterns

**react-grid-layout v2** - Mature drag-and-drop layout system with improved performance

## Development Experience

**Turbopack** (Next.js 15) - Native TypeScript support, 10x faster than Webpack, enhanced HMR

**pnpm v9** - 2x faster than npm with Node.js 22, superior dependency management

**Biome v2** - Unified linting and formatting with 100x faster performance than ESLint + Prettier

**Vitest v2** - Faster test execution with enhanced ESM support

## Data & Validation

**Valibot v2** - 90% smaller bundle than Zod with superior TypeScript integration and modular architecture

**@hey-api/openapi-ts** - Enhanced OpenAPI type generation with better TypeScript inference

**Dexie v4** - IndexedDB wrapper for browser storage with improved TypeScript support

## Performance

**@tanstack/react-virtual v3** - Enhanced virtual scrolling with improved overscan handling

**Native ES Modules** - Import Maps for plugin architecture without bundler complexity

**Web Workers** - Plugin sandboxing and parallel processing without external dependencies

## Security

**OAuth 2.1 + PKCE** - Modern authentication without server-side secrets

**Content Security Policy v3** - Enhanced security headers with WASM support

**Web Worker Sandboxing** - Plugin isolation through native browser security boundaries

## Desktop Application

**Tauri v2** - Rust-based runtime with 90% smaller bundle than Electron and native performance

## Deployment

**Vercel v3** - Edge optimization with superior Next.js 15 support

**GitHub Actions** - Native CI/CD without external dependencies

## Monitoring

**Next.js 15 Speed Insights** - Built-in Real User Monitoring with zero configuration

**React 19 Error Boundaries** - Enhanced error handling with improved component stack traces

## Browser Compatibility

**Progressive Enhancement** - Feature detection for WebGPU, OffscreenCanvas, BroadcastChannel

**No Polyfills** - ES2022 target eliminates polyfill overhead while maintaining broad compatibility

## Package Management

**Import Maps** - Native browser module resolution for plugin ecosystem

**Module Federation** - Scalable plugin architecture with shared dependency management

**T3 Env** - Compile-time environment validation preventing runtime configuration errors

## Key Architectural Principles

1. **Native Web Standards First** - Prefer browser APIs over external libraries
2. **Zero Configuration** - Eliminate configuration files where possible
3. **Performance by Default** - Choose tools optimized for speed and bundle size
4. **TypeScript Throughout** - Full type safety across application layers
5. **Progressive Enhancement** - Graceful degradation across browser capabilities

## Related ADRs

- ADR Index: `guidance/adrs/README.md`
- ADR-006: `guidance/adrs/006-auth-authz.md`
- ADR-007: `guidance/adrs/007-frontend-backend-boundaries.md`

---

## Theming and Tokens (Reference)

Summary

- Root theme class on `<html>`: `.light | .dark` (system-resolved via ThemeToggle).
- Components and plugins must use token-driven Tailwind utilities (e.g., `bg-background`, `text-foreground`, `border-input`).
- No hardcoded colors in component/plugin code.

Full token list and CSS variables: see `guidance/reference/theme_tokens.md`.
