# Core Architecture Decisions

**Project**: Hawks Coach Hub
**Status**: Accepted
**Last Updated**: 2026-02-28

---

## Context

Hawks Coach Hub currently ships as a read-only Google Drive browser for Hawks Helsinki coaching staff plus additive planner/editor routes for structured drills, sessions, sharing, and import review.

Current shipped constraints:

- No user authentication in browse mode — service account reads on behalf of all users
- Read-only Drive access — coaches cannot modify Drive content through the app
- Mobile-first — coaches use phones/tablets on the field
- Sub-5-second load time for browse mode
- Low complexity — minimal dependencies, easy to maintain

Structured planner/editor constraints:

- Preserve the no-login browse experience for legacy materials
- Add structured drill/session data without making planner content depend on Drive folder heuristics
- Separate coach-facing planning flows from editor/admin authoring flows
- Introduce authenticated write access only where planner/CMS editing requires it

---

## Decision 1: Vanilla TypeScript (No Frontend Framework)

**Status**: Accepted

### Options Considered

1. React + Vite — familiar, component model, good ecosystem
2. Vanilla TypeScript + Vite — minimal bundle, no framework overhead
3. Next.js — SSR, complex for a simple SPA

### Decision

**Vanilla TypeScript + Vite**

### Rationale

- App is simple enough: one page, DOM manipulation, no complex state tree
- Smaller bundle size, faster initial load
- No virtual DOM overhead for what is essentially a file browser
- Vite provides HMR and fast builds without framework complexity

### Consequences

- Manual DOM manipulation instead of declarative rendering
- No component lifecycle hooks — use class instances with explicit `destroy()`
- State managed via singleton `appState` object

---

## Decision 2: Vercel Serverless Function as API Proxy

**Status**: Accepted

### Options Considered

1. Direct Drive API from browser — requires OAuth, exposes credentials
2. Vercel serverless function (`api/drive.js`) — credentials stay server-side
3. Dedicated backend service — overkill for a read-only API

### Decision

**Single Vercel serverless function** at `api/drive.js`

### Rationale

- Service account credentials never leave the server
- Free tier sufficient for coaching team traffic
- Zero infra management
- Co-located with frontend deployment

### Consequences

- Cold start latency (~1-2s first request); mitigated by client-side caching
- Single function for all Drive operations (simpler, but less separation)
- Node.js runtime with `googleapis` package

---

## Decision 3: Service Account Authentication (No User Login)

**Status**: Accepted

### Options Considered

1. Google OAuth per user — each coach authenticates individually
2. Service account — single identity reads for all coaches
3. API key — not suitable for Drive API

### Decision

**Service account with read-only Drive scope**

### Rationale

- Coaches should not need to manage Google accounts in the app
- Training materials are not sensitive — same access for all coaching staff
- Eliminates OAuth complexity (redirects, token refresh, session management)
- Hawks team admin controls access by managing the shared Drive folder

### Consequences

- All coaches see the same materials (no personalization)
- Cannot track which coach accessed what
- Admin must manage Drive folder sharing separately

---

## Decision 4: Client-Side In-Memory Cache (5-Minute TTL)

**Status**: Accepted

### Options Considered

1. No caching — fetch from Drive on every tab switch
2. Client-side cache in `sessionStorage` — persistent across navigations
3. In-memory cache with TTL — fast, automatic expiry

### Decision

**In-memory cache with 5-minute TTL** in `ServiceAccountDriveService`

### Rationale

- Drive content changes infrequently (coaches upload materials, not real-time)
- Reduces API calls by ~90% for typical session (30-60 minutes)
- 5 minutes is short enough to pick up new uploads without manual refresh
- In-memory avoids serialization overhead of sessionStorage for large file lists

### Consequences

- Cache lost on page reload (acceptable — load time still fast)
- Coaches may see stale data for up to 5 minutes after a new upload
- Manual "Päivitä" (refresh) button bypasses cache

---

## Decision 5: Parallel Batch Loading for Folders

**Status**: Accepted

### Context

Hawks Drive folder has 5-15 top-level folders, each with 10-50 files. Sequential loading was 30+ seconds.

### Decision

**Load all subfolders in parallel** using `Promise.all()` batched requests

### Rationale

- Drive API allows multiple concurrent requests
- Parallel loading cuts load time from ~30s to ~5s (83% improvement)
- Batch size limited to avoid rate limiting (max ~60 concurrent)

### Consequences

- Higher burst API usage on initial load
- More complex error handling (partial failures)
- Requires graceful fallback if some folders fail to load

---

## Decision 6: MiniSearch for Client-Side Full-Text Search

**Status**: Accepted

### Options Considered

1. Simple `String.includes()` filter — fast but no fuzzy matching
2. MiniSearch (npm) — lightweight full-text search with fuzzy matching
3. Server-side search — adds latency, complexity

### Decision

**MiniSearch** indexed on file names at load time

### Rationale

- File names are the primary search target (no file content search needed)
- Sub-100ms search response without server round-trip
- Fuzzy matching handles Finnish coaching terms (diacritics, variations)
- ~8KB library size acceptable

### Consequences

- Search only covers file names, not file content
- Index rebuilt on each load (fast for <500 files)
- All files loaded before search is available (~5s initial load)

---

## Decision 7: Tab-Based Navigation Derived from Drive Folder Structure

**Status**: Accepted

### Context

Coaches organize materials into top-level Drive folders (e.g., "Käsikirja", "Harjoitukset", "Taktiikka"). These should map to UI tabs.

### Decision

**Dynamically derive tabs from top-level Drive folder names** via `TabSearchService`

### Rationale

- Admin controls tab structure by managing Drive folders — no code changes needed
- Coaches familiar with their own folder organization
- Ordering can be customized in `config.ts` if needed

### Consequences

- Tab names come directly from Drive folder names (Finnish)
- Adding a new top-level folder automatically adds a new tab
- Folder names must be reasonable as tab labels

---

## Performance Targets

| Metric                        | Target | Current    |
| ----------------------------- | ------ | ---------- |
| Initial load (uncached)       | <5s    | ~5s        |
| Cached load                   | <200ms | <200ms     |
| Browse search response        | <100ms | <50ms      |
| Drill catalog search response | <250ms | ~150-200ms |
| File action (open)            | <500ms | ~200ms     |
| Bundle size (gzipped)         | <100KB | ~80KB      |

---

## Technology Stack Summary

| Layer      | Technology | Version      |
| ---------- | ---------- | ------------ |
| Language   | TypeScript | 5.x (strict) |
| Build      | Vite       | 6.x          |
| Unit Tests | Vitest     | 3.x          |
| E2E Tests  | Playwright | 1.x          |
| Drive API  | googleapis | latest       |
| Search     | MiniSearch | 7.x          |
| Deploy     | Vercel     | -            |

---

## Decision 8: Planner/CMS as Additive Product Surface

**Status**: Accepted

### Decision

Add a second product surface alongside the existing Drive browser:

- **Coach Planner** for structured drill discovery and session planning
- **Editor/Admin CMS** for drill authoring, import, and curation

Browse mode remains available and must not regress.

### Rationale

- Existing browse mode already serves the fast field-use retrieval journey
- Session planning and structured drill reuse are now strong product needs
- Content authoring and migration belong in a different workflow from rapid browse/search

### Consequences

- Routing expands beyond `#/` into planner and editor namespaces
- Current browse architecture remains valid for legacy materials
- New planner/CMS features should be documented as an extension, not a replacement

---

## Decision 9: Structured Database as Drill Source of Truth

**Status**: Accepted

### Decision

Treat a structured database as the source of truth for drill and session data. Google Drive remains a source of legacy content and supporting attachments, not the planner's primary content model.

### Rationale

- Folder conventions and PDFs are brittle as the long-term planner model
- Structured content enables reliable filtering, editing, reuse, sharing, and analytics
- Coaches should plan from drills, not from inferred file system patterns

### Consequences

- New planner flows read from a database-backed drill catalog
- Drive-derived drill parsing is no longer the strategic direction

---

## Decision 10: Structured Write APIs Use Role-Gated Planner/Auth Boundary

**Status**: Accepted

### Decision

Keep `api/drive.js` as the isolated anonymous read-only Drive proxy. All structured drill, import, session, and planner-profile writes or authenticated reads must go through separate planner/editor routes with explicit `viewer` / `editor` / `admin` authorization.

### Rationale

- Browse mode must stay fast and anonymous for field use
- Write paths need clear ownership, review, and publication governance
- Airtable is a temporary backend, so role and import contracts must remain storage-neutral

### Consequences

- `viewer` supports planner session access but not editor/import writes
- `editor` supports drill draft authoring and import review
- `admin` owns publication and import-conversion governance
- Planner profile and import-draft storage can live in Airtable temporarily as long as route contracts stay canonical
- Legacy files can still be attached or imported

---

## Decision 10: Preserve No-Login Browse, Add Authenticated Write Flows

**Status**: Accepted

### Decision

Preserve anonymous read-only browse mode while introducing authenticated write-capable planner/CMS routes where needed.

### Rationale

- Browse mode currently succeeds because coaches can open it instantly
- Authoring, role control, and shared session editing require authenticated access
- Mixing these concerns into one undifferentiated surface would damage the primary browse journey

### Consequences

- Browse mode remains accessible without login
- Editor/admin flows require authentication and authorization
- Planner read/share flows must be designed to minimize login friction for coaches

### Route Contract

The planner/CMS extension uses route namespaces so follow-up implementation work can keep browse, planner, and editor concerns separate.

| Route                      | Surface        | Access                       | Purpose                                               |
| -------------------------- | -------------- | ---------------------------- | ----------------------------------------------------- |
| `#/`                       | Browse         | Anonymous                    | Existing Drive-backed material browser                |
| `#/drills`                 | Coach planner  | Anonymous read by default    | Structured drill catalog for discovery                |
| `#/drills/:id`             | Coach planner  | Anonymous read by default    | Structured drill detail with attachments and metadata |
| `#/plan`                   | Coach planner  | Authenticated                | Session list for the signed-in coach/editor           |
| `#/plan/new`               | Coach planner  | Authenticated                | Create a new session                                  |
| `#/plan/:id`               | Coach planner  | Authenticated                | Edit an existing session                              |
| `#/session/:shareId`       | Shared session | Anonymous or link-gated read | View-only shared session route                        |
| `#/editor/drills/new`      | Editor CMS     | Authenticated + role-gated   | Create a drill record                                 |
| `#/editor/drills/:id/edit` | Editor CMS     | Authenticated + role-gated   | Edit an existing drill                                |
| `#/editor/imports`         | Editor CMS     | Authenticated + role-gated   | Import queue and import draft review                  |

Notes:

- `#/`, `#/drills`, and `#/drills/:id` are the anonymous browse/discovery surface.
- `#/plan`, `#/plan/new`, and `#/plan/:id` are authenticated because they persist coach-owned session data.
- `#/session/:shareId` is intentionally separated from `#/plan/:id` so sharing does not imply edit access.
- `#/editor/*` routes are reserved for editor/admin workflows and must not appear as part of the default coach browse journey.

---

## Decision 11: Airtable First, Supabase Later for Planner Backend

> **Update 2026-11-04**: the proposed follow-up target is now Postgres on Neon instead of Supabase (see `plans/plan-002-junior-training-programs.md`, section 9a). An ADR will confirm it.

**Status**: Accepted

### Decision

Use **Airtable** as the initial mock backend for structured drills, sessions, permissions metadata, and import drafts during MVP shaping. Keep all planner/CMS data access behind repo-owned service abstractions so a later move to **Supabase** can happen without major frontend rewrites.

### Rationale

- Airtable is fast to stand up for content-model validation and early editor workflow iteration
- The team can validate drill/session schema and operational flows before committing to a longer-term backend
- Supabase still fits the likely long-term need for stronger relational modeling, auth, and storage once the MVP has stabilized
- A backend abstraction boundary now reduces migration risk later

### Consequences

- Planner/CMS data model becomes structured-data-backed immediately, but on a temporary Airtable implementation
- Backend auth and migration workflows become part of the repo's operational model
- Airtable-specific assumptions should not leak deeply into UI code or shared business logic
- A Supabase migration path must be preserved in the service and data-contract design
- docs and NFRs must distinguish anonymous browse behavior from shipped planner/editor behavior

### Storage Boundary Rules

The planner/CMS architecture must keep a strict boundary between canonical domain entities and the storage adapter used underneath them.

- Domain contracts are defined in `docs/DATA_MODEL.md` and are storage-agnostic.
- Airtable table names, linked-record shapes, field labels, and formula fields are adapter concerns, not application contracts.
- UI code, route handlers, and shared business logic should depend on repo-owned entity/service interfaces, not Airtable response shapes.
- Supabase migration should require swapping storage adapters and persistence details, not redesigning route contracts or domain entities.
- Drive file references remain optional external references on planner entities, not the persistence backbone for structured planner records.

---

## Decision 12: Role-Based Planner/CMS Access

**Status**: Accepted

### Decision

Introduce at least three roles for planner/CMS features:

- `viewer`
- `editor`
- `admin`

### Rationale

- Coach consumption and session viewing differ from drill authoring
- PDF conversion and content publication should not be open to every user
- Role separation supports safer migration and curation

### Consequences

- Permission-denied recovery flows become a first-class UX requirement
- Server-side enforcement is required for write operations
- Editor-only navigation should stay out of the way of coach-facing flows

---

## Decision 13: PDF as Import Source, Not Core Runtime Model

**Status**: Accepted

### Decision

Treat PDFs and Drive files as import sources or attachments. Native structured drill records become the preferred planner content model.

### Rationale

- PDFs are difficult to search, filter, edit, and reuse inside a planner workflow
- Importing legacy content preserves past material without making it the UX foundation
- Human-reviewed conversion keeps data quality higher than raw extraction alone

### Consequences

- Import queue and review workflow become editor/admin features
- Coach planner flows should increasingly rely on structured drills rather than opening PDFs
- Migration can happen incrementally without freezing the planner until every file is converted

---

## Decision 14: UI Technology for Planner/CMS Remains Open

**Status**: Accepted

### Decision

Keep the current browse mode and shipped planner/editor routes in vanilla TypeScript. Re-evaluate UI technology only if the imperative route views become materially harder to maintain.

### Options Under Consideration

1. Vanilla TypeScript with stronger view abstractions
2. Preact for planner/CMS-only views
3. Another lightweight component approach if justified

### Rationale

- Current shipped browse mode should not be rewritten casually
- Planner authoring complexity may justify a component model
- The decision should follow concrete implementation pressure, not preference alone

### Consequences

- The current planner/editor implementation stays on the same imperative TypeScript stack as browse mode
- Bundle-size and mobile-performance impacts must be validated before adoption

---

## Future Considerations

1. **Offline support**: Service Worker cache for last-loaded materials
2. **File preview**: Inline PDF preview without leaving the app
3. **Notifications**: Alert coaches when new materials are uploaded
4. **Analytics**: Track most-accessed drills (privacy-safe, aggregate)
