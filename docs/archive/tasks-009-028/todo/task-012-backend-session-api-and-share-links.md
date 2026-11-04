# Task: Backend Session API And Share Links

## Context

- Why this is needed:
  - Coaches need persistent sessions plus a readable share or print surface detached from editor permissions.
  - Airtable will be used first, so session persistence needs a replaceable repository boundary instead of direct vendor coupling.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-003-structured-data-api-and-auth-foundation.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/api/`
  - `/Users/mikko.makipaa/coach-hub/src/types/`

## Scope

- In scope:
  - Add persistence and API contracts for sessions and shareable session reads.
  - Add Airtable-backed repository or adapter logic for session storage.
  - Support draft recovery and reopen flows.
- Out of scope:
  - Drill authoring and import review.

## Changes

- [ ] Add backend storage abstractions for sessions and share identifiers.
- [ ] Add Airtable-backed implementations for sessions and share-link persistence.
- [ ] Add session create, update, list, and read handlers.
- [ ] Add shared-session read handling with unguessable identifiers.

## Acceptance Criteria

- [ ] Sessions can be saved, reopened, and listed.
- [ ] Shared-session reads do not require editor privileges.
- [ ] Share identifiers are not sequential or guessable.
- [ ] Session API contracts remain stable regardless of the later Airtable-to-Supabase migration.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
- [ ] New/updated tests:
  - Integration tests for session persistence, recovery, and share-link reads.

## Documentation

- [ ] Update backend/API docs for session and share-link behavior, including the temporary Airtable persistence layer.
