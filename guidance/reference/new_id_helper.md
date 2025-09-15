# `newId()` Helper — UUIDv7 Identifier Guidance

## Purpose

Provide a single, consistent source for generating globally unique, time‑ordered identifiers (UUIDv7) across the app and plugins. Ensures IDs are sortable, debuggable, and standards‑aligned.

## API (proposed)

```ts
// Minimal, universal API
function newId(): string; // returns a UUIDv7 string

// Optional ergonomics (if useful later)
function isUuidV7(id: string): boolean; // validation utility
```

- Returns: canonical UUID string (lowercase hex with hyphens), version nibble = `7`.
- No prefixes; consumers attach semantics separately (e.g., keep type in payload, not in ID).

## Behavior

- Always emits UUIDv7.
- Uses `crypto.getRandomValues` for randomness; includes millisecond timestamp per UUIDv7 spec.
- Works in browser and Worker contexts. For Node tools, same interface.
- No global state. Safe for concurrent/burst generation.

## Contract

- Stability: format does not change. If native `crypto.randomUUID({version:'v7'})` becomes available, implementation may switch internally without API change.
- Uniqueness: collision probability negligible; no app‑level dedupe required beyond normal business rules.
- Ordering: lexicographically sortable by creation time (k‑sortable). Do not rely on strict monotonicity under clock skew.

## Validation

- Basic regex check (informational):

```ts
// e.g., /\b[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/
```

- Optional `isUuidV7(id)` helper can be provided if needed by persistence or import tools.

## Testing Guidance

- Unit: length/format, version nibble `7`, variant nibble in `[8,9,a,b]`.
- Burst: generate 100k IDs, ensure uniqueness and non‑decreasing sort order in aggregate (allow ties at ms boundaries).
- Stubbing: in tests, inject or mock `newId()` to produce deterministic IDs when needed.

## Security & Privacy

- UUIDv7 embeds a timestamp (millisecond). OK for our domain; do not encode any user‑sensitive data into IDs.
- Treat IDs as opaque; avoid exposing them where not necessary in user‑facing UI.

## Plugin Usage

- Expose `newId()` on the public AppAPI for plugins (read‑only utility):

```ts
interface AppAPI {
  util: { newId(): string };
}
```

- Plugins must not ship their own ID schemes; they should call `AppAPI.util.newId()` to ensure consistency.

## Implementation Notes (for later PR)

- Preferred: native `crypto.randomUUID({ version: 'v7' })` when broadly available.
- Portable fallback: small, audited UUIDv7 generator using `crypto.getRandomValues`, following the IETF draft.
- Package choice (if we use one): pick a tiny, tree‑shakeable library or copy a minimal vetted implementation.

## References

- ADR‑0012: Identifier Strategy — UUIDv7
- Domain Model: `guidance/domain/domain_model.md`
