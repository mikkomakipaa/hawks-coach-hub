# Task: UI Test Version Editor And Import Screens

## Context

- Why this is needed:
  - Internal stakeholders need to validate the content-editing direction early, even before the full workflow is wired end to end.
  - The first test version should show how native drill authoring and import review will feel without exposing unfinished complexity.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/DWF/WIREFRAMES.md`
  - `/Users/mikko.makipaa/coach-hub/plans/plan-001-training-session-planner.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/components/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Build the first test-version editor drill form and import review queue screens.
  - Make validation, confidence, and publication readiness visible in the UI even if backend behavior is partially mocked.
- Out of scope:
  - Final permission enforcement and production-ready upload flows.
  - Complex editorial workflow states beyond draft and ready-to-publish cues.

## Changes

- [ ] Build the editor drill form layout with sections for title, summary, category, age groups, duration, players, description, coaching points, and attachments.
- [ ] Build the import queue and import review screens with confidence labels and manual correction areas.
- [ ] Add draft, publish, and validation-status UI cues suitable for internal review.
- [ ] Keep these screens tablet and desktop friendly while staying consistent with the repo’s visual system.

## Acceptance Criteria

- [ ] Stakeholders can review the editor flow and understand the intended authoring process.
- [ ] Import review screens make the “system suggestion plus human correction” model obvious.
- [ ] The UI clearly distinguishes coach-facing screens from editor-only screens.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - UI coverage for editor form rendering, import queue rendering, and review-state visibility.

## Documentation

- [ ] Update any editor UX notes needed for internal testing.
- [ ] Document which editor/import elements are mocked in the first UI release.
