# Task: UI Test Version Drill Catalog And Detail

## Context

- Why this is needed:
  - Testers need to see how drills are discovered and added into planning without waiting for the entire data pipeline to be finished.
  - The drill catalog and detail view will shape the planner’s perceived usefulness early.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/DWF/WIREFRAMES.md`
  - `/Users/mikko.makipaa/coach-hub/DWF/DESIGN_SYSTEM.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/components/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Build the first test-version drill catalog list, filters, cards, and drill detail UI.
  - Support mock or partial Airtable-backed drill data in a way that looks production-intentional.
- Out of scope:
  - Full production search quality tuning.
  - Editor-only controls on coach-facing drill screens.

## Changes

- [ ] Build drill catalog cards with planning-relevant metadata only.
- [ ] Build the filter and search bar UI for common coach discovery paths.
- [ ] Build the drill detail screen with diagram/media placeholder, metadata, description, coaching points, and add-to-session action.
- [ ] Add clear empty, loading, and no-result states for internal testing.

## Acceptance Criteria

- [ ] Testers can browse, search, and open drills without confusion.
- [ ] Drill cards and detail views feel coherent with the planner rather than like a separate tool.
- [ ] Add-to-session actions are visually obvious even if final persistence is not yet complete.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - UI coverage for drill catalog rendering, drill detail rendering, and add-to-session entry actions.

## Documentation

- [ ] Update UI notes for drill-card content and detail-page content priorities.
- [ ] Document any temporary mock-data assumptions used in the first test version.
