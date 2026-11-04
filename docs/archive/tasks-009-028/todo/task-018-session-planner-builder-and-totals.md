# Task: Session Planner Builder And Totals

## Context

- Why this is needed:
  - The session builder is the core coach workflow and needs block editing, ordering, and duration feedback.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-006-session-planner-workflow.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/state/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Build session metadata editing, block management, reorder controls, and duration totals.
- Out of scope:
  - Persistence, print, and share outputs.

## Changes

- [ ] Build planner builder UI for blocks and session metadata.
- [ ] Add mobile-safe reorder controls and duration calculations.
- [ ] Add clear inline save-state placeholders for follow-up persistence work.

## Acceptance Criteria

- [ ] Coaches can build and reorder a session on mobile without drag-only controls.
- [ ] Duration totals stay visible and accurate while editing.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
- [ ] New/updated tests:
  - Coverage for planner block editing and totals calculations.

## Documentation

- [ ] Update planner workflow docs if builder interactions differ from plan.
