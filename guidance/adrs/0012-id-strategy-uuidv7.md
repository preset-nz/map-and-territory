# ADR-0012: Identifier Strategy — UUIDv7 for New Entities

## Context

The codebase currently generates identifiers via `crypto.randomUUID()` (UUIDv4) or a fallback helper. We want k-sortable, time-ordered IDs to improve data locality, debugging, and potential storage/index performance, while remaining globally unique and standards-based.

## Decision

- Adopt UUIDv7 for all entity identifiers (Campaign, Map, Layer, future Items).
- Provide a small ID helper that emits UUIDv7. No fallback needed in greenfield contexts; tests can stub if unavailable.
- Enforce UUIDv7 in schema validation for new data.

## Rationale

- UUIDv7 is IETF draft standard (time-ordered) and widely supported across ecosystems.
- Time-ordering improves write patterns, log analysis, and user support (approximate creation time observable).
- Still random-suffixed; preserves uniqueness and avoids collision risks.
- Privacy: timestamp presence is acceptable for our domain; millisecond granularity is sufficient and beneficial for ordering.

## Consequences

- Implement a UUIDv7 generator (or use a small library) where native v7 is absent.
- Some tools may not yet recognize v7 specifically; treat as generic UUID.

## Alternatives Considered

- UUIDv4 only: widely available but not time-sortable.
- ULID: lexicographically sortable and compact, but not a formal UUID standard; base32 may require additional tooling.
- Snowflake/KSUID: good properties but introduce additional complexity and assumptions.

## Migration

- None required (greenfield). All new data must use UUIDv7.
- Update documentation and domain model to reference UUIDv7 as the required format.
- Add a runtime helper `newId()` that emits v7.

## Validation

- Ensure IDs are unique across rapid creations (burst testing).
- Verify ordering properties in logs and during list operations where appropriate.

## Follow-ups

- Add `newId()` helper in a shared lib (docs first, implement later when scheduled).
- Update store creation sites to consume `newId()` when we touch those files next.
