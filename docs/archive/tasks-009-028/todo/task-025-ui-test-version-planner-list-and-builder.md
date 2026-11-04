# Task: UI Test Version Planner List And Builder

## Context

- Why this is needed:
  - The coach planner is the core feature to put in front of testers first.
  - The initial test version should validate flow clarity, layout, and mobile usability before persistence is fully complete.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/DWF/WIREFRAMES.md`
  - `/Users/mikko.makipaa/coach-hub/DWF/DESIGN_SYSTEM.md`
  - `/Users/mikko.makipaa/coach-hub/todo/task-024-ui-test-version-navigation-and-shells.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/components/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Build the sessions list screen and a usable session builder UI for the first test version.
  - Support realistic sample or mock data for recent sessions, drill additions, notes, totals, and block ordering controls.
- Out of scope:
  - Final backend save logic and share-link generation.
  - Advanced planner rules or export formats.

## Changes

- [ ] Build the sessions list screen with recent sessions, “Uusi suunnitelma”, and useful empty states.
- [ ] Build the session builder layout with metadata fields, drill search area, plan blocks, notes, and totals.
- [ ] Add mobile-safe reorder controls and visible save-status placeholders for the test version.
- [ ] Ensure the planner UI remains usable at `375px` without horizontal scrolling.

## Acceptance Criteria

- [ ] Testers can understand the planner flow from sessions list to builder without explanation.
- [ ] The builder supports a realistic mock planning interaction path with visible feedback.
- [ ] The mobile planner layout remains readable and tappable on phone-sized screens.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - UI coverage for sessions list rendering, builder layout, and mobile planner interactions.

## Documentation

- [ ] Update journey or test notes describing what is interactive versus mocked in the planner UI.
- [ ] Record any copy or layout assumptions needed for user testing.
