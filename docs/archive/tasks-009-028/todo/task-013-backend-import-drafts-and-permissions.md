# Task: Backend Import Drafts And Permissions

## Context

- Why this is needed:
  - Editor import workflows require draft storage and role enforcement, and all new writes need to stay isolated from anonymous browse mode.
  - Airtable is the temporary store, so import-draft persistence and permission logic must be designed for eventual Supabase replacement.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-003-structured-data-api-and-auth-foundation.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/api/`
  - `/Users/mikko.makipaa/coach-hub/api/drive.js`

## Scope

- In scope:
  - Add import-draft persistence and API contracts.
  - Add role enforcement for viewer, editor, and admin actions across structured-data APIs.
  - Add Airtable-backed repository or adapter logic for import drafts and any role metadata stored there during MVP.
- Out of scope:
  - Frontend editor UI.

## Changes

- [ ] Add backend storage and handlers for import drafts.
- [ ] Add Airtable-backed implementations for import-draft persistence behind neutral interfaces.
- [ ] Add auth and authorization checks for structured-data endpoints.
- [ ] Preserve `api/drive.js` read-only separation and document it.

## Acceptance Criteria

- [ ] Only authorized users can create or publish import-derived drills.
- [ ] Import drafts support pending, reviewed, rejected, and converted states.
- [ ] Anonymous browse access still cannot perform writes.
- [ ] Permission and import APIs do not expose Airtable-specific structure in their public contracts.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `bash scripts/check-dev.sh`
- [ ] New/updated tests:
  - Integration tests for import-draft status transitions and permission failures.

## Documentation

- [ ] Update docs describing auth boundaries, import-draft behavior, and the temporary Airtable implementation boundary.
