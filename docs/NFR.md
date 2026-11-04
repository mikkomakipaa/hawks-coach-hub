# Non-Functional Requirements (NFR)

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Performance

### NFR-P01: Initial Load Time

**Priority**: P0 (Critical)
**Requirement**: App displays file list within 5 seconds on a 4G mobile connection (uncached)
**Rationale**: Coaches use this on the field. 5+ seconds causes abandonment.
**Measure**: Playwright test on simulated 4G network

### NFR-P02: Cached Load Time

**Priority**: P0
**Requirement**: Cached page loads display file list within 200ms
**Rationale**: Repeat use within a session should feel instant
**Measure**: `performance.now()` in `ServiceAccountDriveService`

### NFR-P03: Search Response Time

**Priority**: P1
**Requirement**: Browse-mode search results update within 100ms of keystroke, and drill-catalog search settles within 250ms including the current 150ms debounce.
**Rationale**: Browse mode must stay field-fast while planner catalog search avoids request spam without feeling sluggish.
**Measure**: Browse-mode timing via `performance.now()` plus Playwright regression on `#/drills`

### NFR-P04: Bundle Size

**Priority**: P1
**Requirement**: Browse-mode critical JS stays lean enough to preserve current mobile startup performance; any planner/CMS code should be split so it does not penalize anonymous browse mode.
**Rationale**: Planner/CMS expansion must not degrade the existing field-use experience
**Measure**: `npm run build` chunk analysis and route-level performance checks

---

## Security

### NFR-S01: Credential Protection

**Priority**: P0 (Critical)
**Requirement**: Service account credentials must never be committed to git or exposed in client-side code
**Measure**: `.gitignore` review; client bundle inspection (`grep` for service_account)

### NFR-S02: Read-Only Drive Access

**Priority**: P0
**Requirement**: Service account has only Viewer permission on Hawks Drive folder
**Measure**: Google Cloud IAM review; test that write operations return 403

### NFR-S03: No User Data Stored

**Priority**: P1
**Requirement**: Anonymous browse mode stores no user identity. If planner/CMS auth is introduced, identity and session data must be limited to authenticated planner/editor flows and handled according to the chosen backend auth model.
**Measure**: Browser DevTools inspection by route/mode; backend auth/session review

---

## Reliability

### NFR-R01: Drive API Error Handling

**Priority**: P1
**Requirement**: App shows a friendly Finnish error message (not a crash) if Drive API fails
**Measure**: Integration test with mocked 500 response from API

### NFR-R02: Partial Load Handling

**Priority**: P1
**Requirement**: If some subfolders fail to load, app shows available content rather than blank screen
**Measure**: Integration test with mocked partial failure

### NFR-R03: Availability

**Priority**: P1
**Requirement**: App follows Vercel's 99.9% uptime SLA
**Measure**: Vercel dashboard monitoring

---

## Usability

### NFR-U01: Mobile Usability

**Priority**: P0
**Requirement**: Browse mode and coach-facing planning flows must be usable on a 375px-width mobile viewport without horizontal scroll.
**Measure**: Playwright test at 375×812 viewport; manual testing on iPhone

### NFR-U02: Touch Target Size

**Priority**: P1
**Requirement**: All interactive elements minimum 48×48px
**Measure**: CSS inspection; manual touch testing

### NFR-U03: No Login Required

**Priority**: P0
**Requirement**: Coaches access browse mode and legacy materials without any authentication step. If planner/CMS editing requires auth, the no-login browse journey must remain intact.
**Measure**: Navigate to browse mode with cleared cookies — content loads immediately; verify planner/editor routes follow documented access rules

### NFR-U04: Planner Mobile Usability

**Priority**: P0
**Requirement**: Coach-facing planner flows must be usable on a 375px-width viewport without horizontal scroll.
**Measure**: Playwright test at 375×812 viewport; manual planning-flow testing on iPhone

---

## Maintainability

### NFR-M01: TypeScript Strict Mode

**Priority**: P1
**Requirement**: Zero TypeScript errors in strict mode on every build
**Measure**: `npm run typecheck` in CI

### NFR-M02: Lint Clean

**Priority**: P1
**Requirement**: Zero ESLint warnings on every build
**Measure**: `npm run lint` in CI

### NFR-M03: Test Coverage

**Priority**: P2
**Requirement**: ≥40% statement coverage on `src/utils/` modules
**Measure**: `npm run test:coverage`

### NFR-M04: Clear Surface Separation

**Priority**: P1
**Requirement**: Documentation and code boundaries must clearly distinguish anonymous browse mode from authenticated planner/CMS functionality.
**Measure**: docs review plus route/module structure inspection

---

## Cost

### NFR-C01: Drive API Quota

**Priority**: P1
**Requirement**: Stay within Google Drive API free tier (1,000,000 requests/day)
**Rationale**: Coaching team is small; caching reduces calls significantly
**Measure**: Google Cloud Console quota dashboard

### NFR-C02: Vercel Hosting Cost

**Priority**: P1
**Requirement**: Stay within Vercel free tier (100GB bandwidth/month)
**Measure**: Vercel dashboard

### NFR-C03: Planner Backend Cost

**Priority**: P1
**Requirement**: Any database/auth/storage backend for planner/CMS remains within a low-cost tier appropriate for a coaching staff product.
**Measure**: Airtable during MVP, then the chosen long-term backend usage dashboard after migration

---

## Planner/CMS Extension Notes

These NFRs now distinguish between:

- current anonymous, read-only browse mode
- shipped authenticated planner/CMS extensions

Planner/CMS work must additionally satisfy:

- authenticated save/edit recovery
- role-based access enforcement
- planner/session sharing controls
- migration/import review quality gates
