# Non-Functional Requirements (NFR)

**Project**: Hawks Coach Hub
**Last Updated**: 2026-11-05

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

### NFR-S03: No User Data Stored in Browse Mode

**Priority**: P1
**Requirement**: Anonymous browse mode stores no user identity. If planner/CMS auth is introduced, identity and session data must be limited to authenticated planner/editor flows and handled according to the chosen backend auth model.
**Measure**: Browser DevTools inspection by route/mode; backend auth/session review

### NFR-S04: Real Authentication for Coaching Data (Planned, MS1)

**Priority**: P0 for MS1
**Requirement**: Coaching data (teams, assessments, goals, programs) is accessed only by authenticated users. The header-based planner identity (`x-planner-*`, client-supplied role fallback) must not guard this data.
**Measure**: API tests that unauthenticated and spoofed-header requests are rejected

### NFR-S05: Team-Scoped Authorization (Planned, MS1)

**Priority**: P0 for MS1
**Requirement**: A coach can read and write only their own teams' data; enforced in the database with row-level security as well as in the API.
**Measure**: Negative tests: a coach cannot read or modify another team's rows

### NFR-S06: Data About Minors (Planned, MS3)

**Priority**: P0 before any athlete data is stored
**Requirement**: Data minimisation, a documented legal basis and guardian consent where required, retention and erasure support, visibility rules, audit log of reads and writes, and no personal athlete data sent to an LLM.
**Measure**: Privacy review and documented answers to the open questions in the plan before MS3 starts

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
**Requirement**: Zero ESLint errors and warnings (`--max-warnings 0`); the pre-commit hook enforces this on staged files. Status 2026-11-05: clean
**Measure**: `npm run lint` in CI and the commit hook

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
**Measure**: Airtable for current drill content, then the Postgres provider's usage dashboard (Neon proposed)

---

## Planned Gates from the Expert Review (2026-11-05)

Source and full register: `../plans/plan-002-expert-review.md`. These are requirements to be met by the milestone named; none is implemented yet.

### Security (before MS1 stage 1a unless stated)

- **NFR-S07 Identity**: no header-based identity or client-supplied role on any route that touches coaching data; forged-header requests return 401. Measure: automated negative tests.
- **NFR-S08 Write authorization**: write routes require a coach role plus a team or ownership check; every route has a deny-by-default test. Measure: per-route authorization tests.
- **NFR-S09 Security headers**: CSP without unsafe-inline scripts, HSTS, nosniff, frame-ancestors, Permissions-Policy. Measure: header check in CI. Also restrict CORS on `api/drive.js` to the app origin.
- **NFR-S10 Rate limiting**: per IP and per user, with body-size limits, on auth, write and (later) LLM routes.
- **NFR-S11 Session handling**: HttpOnly, Secure, SameSite cookies, CSRF protection on state-changing routes, logout and revocation, short-lived tokens.
- **NFR-S12 Tenant isolation in the database**: row-level security with cross-tenant negative tests in CI and a "no table without RLS" check.
- **NFR-S13 CI hygiene**: blocking dependency audit (no `|| echo`), Dependabot for root, `api/` and Actions, secret scanning, pinned Actions, least-privilege workflow permissions, supported Node versions.
- **NFR-S14 Share links**: explicit field allowlist, expiry (proposal: 90 days), revocation, no-store and noindex headers, rate limiting; never used for athlete-linked data.
- **NFR-S15 Audit**: append-only write-audit from MS1 (team, program, role, auth events), no content in the log; read-audit from MS3. Admin MFA decision before MS2.
- **NFR-S16 Privacy for the pilot**: the club is identified as controller, coaches get a privacy notice and a processing record exists, a processor agreement is in place if the developer is a processor. MS1 free-text notes warn against names and health information.
- **NFR-S17 Minors' data (MS3)**: DPIA, lawyer-verified lawful basis and consent age, retention schedule, tested export and erasure including backups and branches, synthetic data only in previews. To be verified with counsel; not assumed.
- **NFR-S18 LLM guardrails (stage 1d)**: provider terms without training on inputs, no names, emails or free-text notes in prompts, retrieved content treated as untrusted, validated and sanitised output, cost cap, rate limit, kill-switch, injection and bad-request evaluation set.

### Accessibility and usability

- **NFR-A01**: text contrast at least 4.5:1; the design tokens flagged in `DESIGN_SYSTEM.md` are re-measured and fixed.
- **NFR-A02**: dark mode and `prefers-reduced-motion` supported; error messages persist (no auto-dismissing error toasts); save state announced with `aria-live`; focus moves to the page heading on route change.
- **NFR-A03**: touch targets 48 px minimum, 56 px on quick-capture screens.
- **NFR-A04**: every MS1 screen specifies empty, loading, error, no-permission and offline states.

### Operations and pilot

- **NFR-O01**: `/api/healthz`, structured JSON logs with a request id and no personal data.
- **NFR-O02**: backup and restore targets for the Postgres database (point-in-time-restore window) with a restore drill before MS3; EU region; breach process agreed with counsel.
- **NFR-O03 Pilot exit criteria (proposal)**: one coach and one team use MS1 for six weeks, with a minimum number of sessions planned (to be set), and the plan's four product metrics measured.
- **NFR-O04 Offline scope (MS1)**: drafts survive reload and saves retry; no background sync.

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
