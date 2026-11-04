# Task: Docs Component And API Responsibilities

## Context

- Why this is needed:
  - The planner/editor feature set adds services, views, and APIs that need clear ownership before implementation is split across tasks.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-002-planner-architecture-and-contracts.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/DWF/COMPONENTS.md`
  - `/Users/mikko.makipaa/coach-hub/docs/`

## Scope

- In scope:
  - Assign responsibilities across API, services, state, UI, and editor flows.
  - Add a short implementation note for expected API surfaces.
  - Define where Airtable-specific logic is allowed and where neutral abstractions are required for later Supabase migration.
- Out of scope:
  - Shipping those APIs or components.

## Changes

- [ ] Update `DWF/COMPONENTS.md` with planner/editor responsibilities.
- [ ] Add a docs note covering expected API surface and implementation boundaries.
- [ ] Explicitly place Airtable mapping and persistence concerns behind backend/service boundaries.

## Acceptance Criteria

- [ ] Task ownership between backend, services, state, and UI is unambiguous.
- [ ] Implementation tasks have a single reference for API boundaries.
- [ ] The docs prevent Airtable table/field details from leaking into route handlers, UI code, or shared domain types.

## Testing

- [ ] Tests to run:
  - None.
- [ ] New/updated tests:
  - None.

## Documentation

- [ ] Update `/Users/mikko.makipaa/coach-hub/DWF/COMPONENTS.md`.
- [ ] Add or update a planner implementation note under `/Users/mikko.makipaa/coach-hub/docs/`.
