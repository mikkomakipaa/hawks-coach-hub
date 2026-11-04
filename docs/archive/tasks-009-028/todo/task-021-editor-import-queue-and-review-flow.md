# Task: Editor Import Queue And Review Flow

## Context

- Why this is needed:
  - Legacy PDFs and Drive files need a controlled conversion path into the structured drill catalog.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-007-editor-drill-authoring-and-imports.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/services/`

## Scope

- In scope:
  - Build import queue, import draft review, confidence display, and manual correction flow.
- Out of scope:
  - Native drill form basics already covered in task 020.

## Changes

- [ ] Build import queue listing and review entry points.
- [ ] Build import draft review UI with confidence visibility and manual correction.
- [ ] Connect publish-from-import flow into the structured drill catalog.

## Acceptance Criteria

- [ ] Editors can review and correct import drafts before publish.
- [ ] Import confidence and status are visible.
- [ ] Published import-derived drills appear in the coach catalog.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - Coverage for import queue, review, correction, and publish flow.

## Documentation

- [ ] Update docs for import review expectations and failure handling.
