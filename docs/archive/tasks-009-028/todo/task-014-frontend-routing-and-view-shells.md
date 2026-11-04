# Task: Frontend Routing And View Shells

## Context

- Why this is needed:
  - New planner and editor surfaces need route handling and top-level view shells before detailed feature UI can be implemented.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-004-frontend-planner-foundation.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/main-service-account.ts`
  - `/Users/mikko.makipaa/coach-hub/src/ui/`

## Scope

- In scope:
  - Add route parsing and top-level rendering shells for drill, planner, share, and editor pages.
  - Preserve current browse bootstrap and default route behavior.
- Out of scope:
  - Final feature UI content within each shell.

## Changes

- [ ] Add route parsing for new planner/editor URLs.
- [ ] Add top-level view shell selection and fallback handling.
- [ ] Ensure `#/` still boots the existing browse experience.

## Acceptance Criteria

- [ ] New routes resolve to the correct top-level shells.
- [ ] Existing browse mode still works as the default path.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
- [ ] New/updated tests:
  - Unit tests for route parsing and shell selection.

## Documentation

- [ ] Update any frontend routing notes if implementation differs from plan.
