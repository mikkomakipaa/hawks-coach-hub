# Task: Regression Performance And Documentation Hardening

## Context

- Why this is needed:
  - The rollout adds multiple new surfaces and security-sensitive paths, so final hardening must confirm performance, coverage, and docs accuracy.
- Related docs/links:
  - `/Users/mikko.makipaa/coach-hub/todo/task-008-planner-validation-performance-and-docs.md`
- Related files:
  - `/Users/mikko.makipaa/coach-hub/e2e/`
  - `/Users/mikko.makipaa/coach-hub/src/test/`
  - `/Users/mikko.makipaa/coach-hub/DWF/`
  - `/Users/mikko.makipaa/coach-hub/docs/`

## Scope

- In scope:
  - Fill remaining test gaps, verify performance targets, and update stale docs.
- Out of scope:
  - New product behavior outside bug fixes and regressions.

## Changes

- [ ] Add remaining unit, integration, and Playwright regression coverage.
- [ ] Verify browse-mode startup and planner search responsiveness.
- [ ] Update DWF and docs to reflect shipped behavior.
- [ ] Verify the implemented Airtable adapter boundaries are documented well enough to support a later Supabase migration.
- [ ] Create `IDEA-*.md` follow-ups for deferred work.

## Acceptance Criteria

- [ ] Main planner, editor, import, auth, and mobile flows are covered.
- [ ] Browse mode remains within target or documented variance.
- [ ] Docs match implemented behavior and known gaps are explicit.

## Testing

- [ ] Tests to run:
  - `bash scripts/check-dev.sh`
  - `npm run test:run`
  - `npm run test:e2e`
- [ ] New/updated tests:
  - Any missing regression coverage discovered during hardening.

## Documentation

- [ ] Update affected DWF docs and implementation notes.
- [ ] Add follow-up `IDEA-*.md` files for deferred work if needed.
