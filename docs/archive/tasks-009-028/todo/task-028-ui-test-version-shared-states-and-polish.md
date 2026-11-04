# Task: UI Test Version Shared States And Polish

## Context

- Why this is needed:
  - A test version will be judged heavily on clarity of loading, empty, error, and permission states even when backend integration is incomplete.
  - Shared polish work prevents the prototype from feeling inconsistent across screens.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/DWF/DESIGN_SYSTEM.md`
  - `/Users/mikko.makipaa/coach-hub/DWF/WIREFRAMES.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/components/`
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Add reusable empty, loading, error, toast, and permission-denied states for the test-version UI.
  - Align spacing, touch targets, typography, and state styling across new planner, drill, and editor screens.
- Out of scope:
  - Large visual redesign of the existing browse mode.
  - Production analytics or telemetry.

## Changes

- [ ] Add shared loading, empty, and error-state components or patterns for planner, drills, and editor views.
- [ ] Add a permission-denied state and mock save or action feedback suitable for partial integrations.
- [ ] Align new UI surfaces with Finnish copy, touch-target rules, and the Hawks visual system.
- [ ] Fix obvious responsiveness gaps across the initial test-version screens.

## Acceptance Criteria

- [ ] All new UI surfaces have deliberate loading, empty, and error states instead of placeholders or broken gaps.
- [ ] The prototype feels visually consistent across coach and editor flows.
- [ ] Mobile and tablet review does not reveal obvious layout breakage on primary screens.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `npm run test:e2e`
  - `bash scripts/check-dev.sh`
- [ ] New/updated tests:
  - Coverage for shared state rendering and key responsive UI paths.

## Documentation

- [ ] Update design or test notes for shared UI states used in the initial test version.
- [ ] Record any intentionally deferred polish as follow-up ideas if needed.
