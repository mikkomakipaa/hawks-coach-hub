# Task: Editor Drill Form And Publish Flow

## Context

- Why this is needed:
  - Editors need a structured native authoring flow before import review is layered in.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-007-editor-drill-authoring-and-imports.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/components/`

## Scope

- In scope:
  - Build editor drill create/edit forms, validation, save, and publish actions.
- Out of scope:
  - Import queue and import review UI.

## Changes

- [ ] Build editor drill form sections and validation states.
- [ ] Connect save and publish actions to drill APIs.
- [ ] Add explicit unauthorized or forbidden handling.

## Acceptance Criteria

- [ ] Editors can create, edit, and publish a native drill.
- [ ] Invalid fields are surfaced before publish.
- [ ] Unauthorized users cannot access write actions.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - Coverage for drill form validation, save, publish, and permission denial.

## Documentation

- [ ] Update editor workflow docs for native drill authoring.
