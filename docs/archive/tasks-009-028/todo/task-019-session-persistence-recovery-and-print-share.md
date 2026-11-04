# Task: Session Persistence Recovery And Print Share

## Context

- Why this is needed:
  - A usable planner must save work reliably, recover from failures, and support readable print or shared-session output.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-006-session-planner-workflow.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/services/`

## Scope

- In scope:
  - Implement session save, reopen, recovery, and print/share views.
- Out of scope:
  - Editor authoring or import flows.

## Changes

- [ ] Connect planner UI to session save and load APIs.
- [ ] Add draft recovery and failed-save messaging.
- [ ] Build print or shared-session output.

## Acceptance Criteria

- [ ] Coaches can save and reopen sessions.
- [ ] Failed saves preserve recoverable work.
- [ ] Print or shared-session output is readable and useful at practice.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
  - `bash scripts/check-dev.sh`
- [ ] New/updated tests:
  - Coverage for save, reopen, recovery, and print/share flows.

## Documentation

- [ ] Update planner docs for save/recovery/share behavior.
