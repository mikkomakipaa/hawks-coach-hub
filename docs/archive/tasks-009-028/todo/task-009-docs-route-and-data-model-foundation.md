# Task: Docs Route And Data Model Foundation

## Context

- Why this is needed:
  - Follow-up implementation tasks need stable route and entity contracts before code changes begin.
  - The existing DWF docs describe a read-only Drive browser and need a precise extension path for planner and editor work.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/plans/plan-001-training-session-planner.md`
  - `/Users/mikko.makipaa/coach-hub/todo/task-002-planner-architecture-and-contracts.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/DWF/CORE_ARCHITECTURE.md`
  - `/Users/mikko.makipaa/coach-hub/DWF/DATA_MODEL.md`

## Scope

- In scope:
  - Define routes for drill catalog, drill detail, planner, shared session, and editor/import areas.
  - Define canonical entities for drills, attachments, import drafts, sessions, and roles.
  - Document Airtable as the temporary backend and preserve a clean migration boundary to Supabase.
- Out of scope:
  - Backend or frontend implementation.

## Changes

- [ ] Update route documentation in DWF/docs.
- [ ] Update DWF data model contracts for planner/editor entities.
- [ ] Document storage-layer assumptions so Airtable field mappings do not become the domain model.

## Acceptance Criteria

- [ ] Follow-up tasks can reference stable route and entity definitions.
- [ ] Anonymous browse and authenticated planner/editor boundaries are explicit in docs.
- [ ] Docs make it clear that Airtable is temporary and Supabase migration should not require domain-model redesign.

## Testing

- [ ] Tests to run:
  - None.
- [ ] New/updated tests:
  - None.

## Documentation

- [ ] Update `/Users/mikko.makipaa/coach-hub/DWF/CORE_ARCHITECTURE.md`.
- [ ] Update `/Users/mikko.makipaa/coach-hub/DWF/DATA_MODEL.md`.
