# Task: Backend Drill API And Storage

## Context

- Why this is needed:
  - Structured drill catalog and editor publishing need persistent drill and attachment records with clear read/write contracts.
  - Airtable will act as the temporary backing store, but the backend contract must remain portable to Supabase later.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-003-structured-data-api-and-auth-foundation.md`
  - `/Users/mikko.makipaa/coach-hub/todo/task-009-docs-route-and-data-model-foundation.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/api/`
  - `/Users/mikko.makipaa/coach-hub/src/types/`

## Scope

- In scope:
  - Add persistence and API contracts for drills and drill attachments.
  - Add Airtable-backed repository or adapter logic behind storage abstractions.
  - Support draft and published drill reads.
- Out of scope:
  - Session persistence and import drafts.

## Changes

- [ ] Add backend storage abstractions for drills and attachments.
- [ ] Add Airtable-backed implementations for drill and attachment persistence without exposing Airtable field names to API consumers.
- [ ] Add drill read/write endpoints or handlers.
- [ ] Add validation for drill payloads and status transitions.

## Acceptance Criteria

- [ ] Backend supports creating, updating, listing, and reading drills.
- [ ] Published drills are readable by coach-facing clients.
- [ ] Invalid drill payloads fail with predictable responses.
- [ ] Airtable-specific mapping is isolated enough that a later Supabase repository can replace it without changing public API contracts.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
- [ ] New/updated tests:
  - Integration tests for drill CRUD and validation failures.

## Documentation

- [ ] Update backend/API docs for drill contracts and the temporary Airtable adapter boundary.
