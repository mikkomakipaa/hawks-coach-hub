# Task: UI Test Version Navigation And Shells

## Context

- Why this is needed:
  - The initial test version needs visible entry points into planner, drills, and editor flows before deeper interactions are implemented.
  - Reviewers need a coherent, clickable UI shell that coexists with the current browse mode.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/DWF/DESIGN_SYSTEM.md`
  - `/Users/mikko.makipaa/coach-hub/DWF/WIREFRAMES.md`
  - `/Users/mikko.makipaa/coach-hub/plans/plan-001-training-session-planner.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/src/main-service-account.ts`
  - `/Users/mikko.makipaa/coach-hub/src/ui/`
  - `/Users/mikko.makipaa/coach-hub/src/components/`
  - `/Users/mikko.makipaa/coach-hub/styles-minimal.css`

## Scope

- In scope:
  - Add the top-level navigation and shell views for `Selaa`, `Suunnitelmat`, `Harjoitteet`, and editor test routes.
  - Make route transitions and view framing usable for internal testing with partial or mock data.
- Out of scope:
  - Final data loading, persistence, or editor permissions.
  - Detailed planner or editor form interactions beyond shell-level structure.

## Changes

- [ ] Add top-level UI navigation for browse, planner, drill catalog, and editor test surfaces.
- [ ] Build shell layouts for sessions list, session builder, drill catalog, drill detail, editor form, and import review.
- [ ] Add clear loading, placeholder, and “coming next” areas where later tasks will attach real behavior.
- [ ] Ensure shell routing still preserves the existing browse view as the default entry point.

## Acceptance Criteria

- [ ] A tester can navigate between the main product areas without broken or blank screens.
- [ ] New shells visually match the current Hawks design direction and remain Finnish-first.
- [ ] Browse mode still opens normally at `#/`.

## Testing

- [ ] Tests to run:
  - `npm run test:run`
  - `bash scripts/check-dev.sh`
- [ ] New/updated tests:
  - Route and shell rendering coverage for new test-version entry points.

## Documentation

- [ ] Update any route or screen-map notes that explain the test-version UI structure.
- [ ] Document which shells are mock-first and which already depend on live data.
