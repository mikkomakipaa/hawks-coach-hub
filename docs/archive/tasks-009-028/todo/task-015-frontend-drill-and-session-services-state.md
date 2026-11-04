# Task: Frontend Drill And Session Services State

## Context

- Why this is needed:
  - Coach and editor views need shared typed access to drill, session, import, and permission data.
  - Frontend services must consume stable app-owned contracts rather than Airtable-shaped responses to keep the later Supabase migration contained.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-004-frontend-planner-foundation.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/services/`
  - `/Users/mikko.makipaa/coach-hub/src/state/`
  - `/Users/mikko.makipaa/coach-hub/src/types/`

## Scope

- In scope:
  - Add frontend types, service clients, and shared state for drills, sessions, permissions, save status, and import drafts.
- Out of scope:
  - Final route-specific UI rendering.

## Changes

- [ ] Add TypeScript types for planner/editor entities.
- [ ] Add service clients for drills, sessions, imports, and permission checks.
- [ ] Add shared state modules for save status, load state, and recoverable errors.
- [ ] Ensure frontend types and services stay vendor-neutral and do not encode Airtable record shapes.

## Acceptance Criteria

- [ ] Feature UIs can consume typed drill/session/import data.
- [ ] Shared state exposes predictable loading, saving, and error signals.
- [ ] Replacing Airtable with Supabase later would not require changing planner/editor view contracts.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
- [ ] New/updated tests:
  - Unit and integration tests for service clients and state transitions.

## Documentation

- [ ] Update frontend implementation notes for new service/state modules and the vendor-neutral contract boundary.
