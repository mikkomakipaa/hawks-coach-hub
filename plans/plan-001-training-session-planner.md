# Plan-001: Training Session Planner

**Created**: 2026-02-28
**Status**: Draft - split into coach and editor tracks
**Author**: Design session with AI

---

## Feature Scope and Assumptions

### Feature Statement

Hawks Coach Hub expands from a read-only Drive browser into two connected product surfaces:

- a **Coach Planner** for finding structured drills and building training sessions quickly
- an **Editor/Admin CMS** for creating, curating, importing, and maintaining drill content

### Key Assumptions

- Structured drill records in a database become the long-term source of truth for planner content.
- Airtable is the initial mock database for drills, sessions, and import drafts during MVP shaping.
- Supabase remains the likely follow-up target once the data model and workflows are validated in Airtable.
- Drive remains available for legacy files, attachments, handbook content, and tactical materials.
- No-login browse access remains a core product principle for the existing read-only material browser.
- Authenticated write access is introduced only for editor/admin flows and any planner features that require database-backed editing.
- PDF files are treated as import sources or attachments, not as the preferred runtime representation of a drill.

### Product Boundary

This plan is intentionally split into two experience tracks because the users, motivations, and friction tolerances are different:

- **Coach Planner MVP**: optimize for fast drill discovery and session planning
- **Editor/Admin CMS**: optimize for content quality, migration, and maintainability

---

## Persona-to-Use-Case Mapping

### Primary Persona: Head Coach Harri

- Primary jobs:
  - Find the right drill quickly
  - Build a session without redoing the same work every time
  - Print or share the final plan before practice
- Device context:
  - Phone at rink
  - Laptop/tablet before practice
- Design implication:
  - Planning and drill consumption flows must minimize steps and avoid auth friction where possible

### Secondary Persona: Assistant Coach Anu

- Primary jobs:
  - Build and reuse session plans
  - Maintain a useful drill library over time
  - Convert useful legacy content into reusable drills
- Device context:
  - iPad/laptop for planning and curation
- Design implication:
  - Structured drill metadata and saved sessions matter more than PDF browsing

### Tertiary Persona: Club Admin Mika

- Primary jobs:
  - Keep content organized and trustworthy
  - Support migration from legacy Drive materials
  - Avoid fragile folder conventions and support overhead
- Device context:
  - Laptop/desktop
- Design implication:
  - Import review, permissions, and editorial controls should be separated from coach-facing flows

---

## Design Inputs

### User Facts

- Coaches abandon slow or confusing flows when players are waiting.
- Search-first behavior is common when the drill name is known.
- Session planning is a real unmet need, especially for repeated weekly use.

### Journey Facts

- Existing critical path is still "open app, find drill, open it quickly."
- Assistant-coach planning is currently simulated through file selection rather than true session building.
- Error recovery is already a product expectation and must continue for new planner surfaces.

### Technical Constraints

- Existing browse mode must keep its sub-5-second uncached mobile experience.
- Existing read-only Drive browsing must remain available.
- Current repo architecture is vanilla TypeScript + Vite; new planner infrastructure must be introduced deliberately and documented.

### Validation Metrics

- Time to first saved session
- Time to add 5 drills to a session
- Percentage of planning sessions completed without opening legacy PDFs
- Mobile planner success rate at 375px
- Import-to-published conversion rate for editor workflows

---

## Product Strategy

### Direction

Do not build the planner on top of inferred Drive folder structure.

Instead:

- store drills as structured records in Airtable first, with a later migration path to Supabase
- build a native drill authoring workflow
- treat PDFs as import sources and attachments
- preserve Drive as a supporting system, not the planner's source of truth

### Why

This increases initial scope, but it removes the long-term product debt caused by folder heuristics, duplicated PDFs, weak metadata, and poor reuse.

---

## Track A: Coach Planner MVP

### Goal

Let coaches build and reuse structured training sessions quickly from a trusted drill catalog.

### In Scope

- Drill catalog read experience
- Drill detail view
- Session builder
- Session save/load
- Print/export
- Internal sharing of completed session plans

### Out of Scope for MVP

- Full drill authoring on phone
- Bulk PDF conversion
- Complex editorial workflows

### Journey A1: Coach Creates a Session From Structured Drills

1. **Entry trigger**
   - User action: Coach opens `#/plan` or `#/plan/new`
   - UI touchpoint: Planner landing/list
   - Intent: "I need today's plan quickly"
   - Emotion: Focused, time-sensitive
   - Friction/risk: Sign-in or empty-state confusion
   - Design opportunity: Show recent sessions and a clear "Uusi suunnitelma"

2. **Discover/understand**
   - User action: Searches for known drill or browses filtered drill list
   - UI touchpoint: Drill catalog search and filters
   - Intent: "Find familiar drills fast"
   - Emotion: Efficient if instant, frustrated if noisy
   - Friction/risk: Too much editor metadata or poor mobile layout
   - Design opportunity: Keep coach-facing drill cards concise and scannable

3. **Setup/commitment**
   - User action: Sets session name, group, date, and target duration
   - UI touchpoint: Session metadata header
   - Intent: "Anchor this session"
   - Emotion: Neutral
   - Friction/risk: Too many required fields up front
   - Design opportunity: Use sensible defaults and defer non-essential fields

4. **Core interaction loop**
   - User action: Adds drills, adjusts durations, reorders blocks, adds notes
   - UI touchpoint: Session builder
   - Intent: "Shape the practice"
   - Emotion: In control when feedback is instant
   - Friction/risk: Drag-only reorder, hidden totals, weak block editing
   - Design opportunity: Explicit mobile controls, persistent totals, quick-add patterns

5. **Feedback and recovery**
   - User action: Saves session, recovers draft, retries failed save
   - UI touchpoint: Toasts, inline save state, recover prompt
   - Intent: "Don't lose my work"
   - Emotion: Anxiety if save state is unclear
   - Friction/risk: Silent failure or auth timeout
   - Design opportunity: Always show save status and recovery actions

6. **Completion and continuation**
   - User action: Prints, exports, or shares internally
   - UI touchpoint: Session summary actions
   - Intent: "Use this at practice and reuse it later"
   - Emotion: Relief
   - Friction/risk: Print output too dense or sharing unclear
   - Design opportunity: Coach-friendly print layout and one-tap copy link

### Failure and Edge Paths

- Save fails due to expired auth -> preserve local draft, prompt re-auth, allow retry
- Drill search returns nothing -> suggest category filters and recent drills
- Mobile session too long to scan -> collapse blocks and keep totals sticky

### Accessibility and Mobile Considerations

- Planner usable at `375px` without horizontal scroll
- Minimum `48x48px` touch targets
- Reorder via explicit up/down controls on mobile
- Clear save and error feedback in Finnish

### Acceptance Criteria

- Coach can create and save a session with 5 drills in one flow without opening Drive PDFs.
- Planner search returns results within `100ms` for typical catalog sizes.
- A saved session can be reopened and edited later.
- Print view produces a readable session summary with drill references.
- Mobile planner works at `375x812` without horizontal scroll.

### Success Metrics

- Median time to first saved session under `5 minutes` for a known-drill scenario
- At least `80%` of planner sessions completed without opening legacy PDF attachments
- Session save success rate above `99%` for authenticated users

---

## Track B: Editor/Admin CMS

### Goal

Let editors/admins create, improve, and migrate drills into a structured catalog without burdening coach-facing flows.

### In Scope

- Drill catalog management
- Drill creation/editing
- PDF/Drive import queue
- Import review and conversion
- Publication workflow
- Permission-aware editing

### Out of Scope for MVP

- Fully automatic PDF conversion with no human review
- Advanced content analytics
- Complex multi-stage editorial workflows

### Journey B1: Editor Converts a PDF Into a Structured Drill

1. **Entry trigger**
   - User action: Editor opens `#/imports` or `#/drills/new`
   - UI touchpoint: Import queue or new drill action
   - Intent: "Turn this legacy material into something reusable"
   - Emotion: Deliberate, lower time pressure
   - Friction/risk: Mixed import quality or unclear next step
   - Design opportunity: Separate import workflow from coach planner UI

2. **Discover/understand**
   - User action: Reviews extracted title, text, and suggested fields
   - UI touchpoint: Import draft review form
   - Intent: "See what the system understood"
   - Emotion: Skeptical
   - Friction/risk: Low-confidence extraction hidden or over-trusted
   - Design opportunity: Show confidence clearly and require review

3. **Setup/commitment**
   - User action: Edits core drill fields and attaches diagram/PDF
   - UI touchpoint: Structured drill authoring form
   - Intent: "Make this publishable"
   - Emotion: Productive if the model is clear
   - Friction/risk: Overly long form or unclear required fields
   - Design opportunity: Strong defaults, grouped sections, draft save

4. **Core interaction loop**
   - User action: Refines metadata, coaching points, age groups, and attachments
   - UI touchpoint: Drill editor
   - Intent: "Create a high-quality drill record"
   - Emotion: Confident if progress is preserved
   - Friction/risk: Losing work or not knowing publish readiness
   - Design opportunity: Validation checklist and publish readiness status

5. **Feedback and recovery**
   - User action: Saves draft, handles validation errors, retries failed upload
   - UI touchpoint: Inline validation and save status
   - Intent: "Finish without rework"
   - Emotion: Frustrated if errors appear late
   - Friction/risk: Network/upload failures
   - Design opportunity: Save draft early, validate continuously

6. **Completion and continuation**
   - User action: Publishes drill and verifies it appears in catalog
   - UI touchpoint: Drill detail/catalog
   - Intent: "Make this usable by coaches"
   - Emotion: Satisfied
   - Friction/risk: Published content not discoverable
   - Design opportunity: Show publish confirmation and next actions

### Failure and Edge Paths

- Import extraction confidence is low -> require manual completion before publish
- User lacks editor permission -> redirect to read-only view with clear explanation
- Attachment upload fails -> keep draft intact and allow retry

### Accessibility and Device Considerations

- Editor workflow optimized for tablet/desktop first
- Keyboard-friendly forms
- Inline labels and validation, not hidden behind hover-only patterns

### Acceptance Criteria

- Editor can create a native drill from scratch and publish it.
- Editor can import a PDF into a draft drill, review fields, and publish after manual correction.
- Published drills appear in the coach-facing drill catalog.
- Permission failures are explicit and recoverable.

### Success Metrics

- Median time from PDF import to published structured drill under `10 minutes` for a moderate-complexity drill
- Less than `5%` of published drills require immediate rollback due to import quality issues
- At least `70%` of newly published drills are created natively or converted without reopening the original PDF during coach planning

---

## Proposed Information Architecture

### Coach-Facing Navigation

```text
[ Selaa materiaalit ] [ Suunnitelmat ] [ Harjoitteet ]
```

Coach-facing priorities:

- `Suunnitelmat` and `Harjoitteet` matter more than import or admin tools
- Existing browse mode remains fast and prominent

### Editor/Admin Navigation

Editor-only actions:

- `Uusi harjoite`
- `Tuo PDF`
- `Tuontijono`
- `Muokkaa harjoitetta`

These should not dominate the coach-facing top-level navigation on mobile.

### Routing

```text
#/                        -> Browse mode
#/drills                  -> Coach-facing drill catalog
#/drills/:id              -> Drill detail
#/plan                    -> Session list
#/plan/new                -> New session
#/plan/:id                -> Edit session
#/session/:shareId        -> View-only shared session
#/editor/drills/new       -> Editor-only drill authoring
#/editor/drills/:id/edit  -> Editor-only drill editing
#/editor/imports          -> Editor-only import queue
```

---

## Proposed Data Model

### Drill

```typescript
interface Drill {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  ageGroups: string[];
  skillTags: string[];
  durationMin?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  equipment: string[];
  coachingPoints: string[];
  setupInstructions?: string;
  progressionIdeas: string[];
  status: 'draft' | 'published' | 'archived';
  sourceType: 'native' | 'pdf-import' | 'drive-import';
  sourceFileId?: string;
  primaryImageUrl?: string;
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Drill Attachment

```typescript
interface DrillAttachment {
  id: string;
  drillId: string;
  type: 'image' | 'pdf' | 'drive-file' | 'link';
  title: string;
  url: string;
  sourceFileId?: string;
  sortOrder: number;
}
```

### Drill Import Draft

```typescript
interface DrillImportDraft {
  id: string;
  sourceType: 'pdf' | 'drive-file';
  sourceFileId?: string;
  extractedTitle?: string;
  extractedText?: string;
  extractedFields: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  reviewStatus: 'pending' | 'reviewed' | 'rejected' | 'converted';
  createdAt: string;
  updatedAt: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  name: string;
  group: string;
  date: string;
  coachName: string;
  targetDurationMin?: number;
  status: 'draft' | 'published' | 'archived';
  blocks: SessionBlock[];
  createdAt: string;
  updatedAt: string;
}
```

### Session Block

```typescript
interface SessionBlock {
  id: string;
  order: number;
  type: 'warmup' | 'drill' | 'break' | 'game' | 'cooldown' | 'custom';
  title: string;
  durationMin: number;
  drillId?: string;
  notes: string;
}
```

---

## Security and Access Model

### Principle

Protect the no-login read-only experience for browsing, while introducing authenticated write flows only where the structured planner/CMS requires them.

### Access Split

- Browse mode:
  - no login required
  - read-only
  - Drive-backed
- Coach planner read/share flows:
  - can be read-only or authenticated depending on final session-sharing policy
  - should minimize login friction for coaches
- Editor/admin flows:
  - authenticated
  - role-restricted
  - database-backed

### Minimum Roles

- `viewer`
- `editor`
- `admin`

### Security Constraints

- Share identifiers must be unguessable
- Write APIs must not broaden Drive access
- Import review is mandatory before publish for AI-assisted extraction
- User identity and session data must be stored only for authenticated planner/editor features, not for anonymous browse mode
- Airtable is a temporary operational store for MVP validation and should be wrapped behind repo-owned service interfaces so Supabase migration does not require broad UI rewrites

---

## Test Plan

### UX Validation

Coach planner:

- first-time planner session
- repeat weekly planning session
- mobile planning at `375px`
- save, recover, and print flow

Editor/admin:

- native drill creation
- PDF import to structured draft
- permission denied path
- attachment upload failure recovery

### Product Metrics

Coach metrics:

- time to first saved session
- time to add 5 drills
- planner completion rate
- print/share usage

Editor metrics:

- import conversion rate
- draft-to-publish time
- percentage of planner sessions using structured drills instead of legacy PDFs

### Engineering Validation

- read-only browse still loads within current performance budget
- planner search remains responsive
- editor forms preserve drafts and recover from failure
- permission boundaries are enforced server-side

---

## Implementation Roadmap

### Phase 1: Coach Planner Foundation

Goal:

- deliver the structured drill read path and session planner without making coach-facing UX dependent on editor tooling

Tasks:

1. Define DB schema for drills, attachments, sessions, and roles
2. Build read APIs for drill catalog and sessions
3. Build coach-facing drill catalog
4. Build session list and session builder
5. Add print/export and basic internal share flow

### Phase 2: Editor/Admin CMS

Goal:

- let editors create and maintain drill records natively

Tasks:

1. Build editor auth and role checks
2. Build native drill create/edit form
3. Add draft/publish workflow
4. Add attachment handling

### Phase 3: PDF Migration Workflow

Goal:

- migrate legacy PDF content into the structured drill model

Tasks:

1. Build import queue
2. Build extraction-to-draft pipeline
3. Build review and correction UI
4. Attach original files for traceability

### Phase 4: Hardening

Goal:

- validate performance, reliability, and permissions across all surfaces

Tasks:

1. Add failure-state coverage
2. Add mobile usability validation
3. Add instrumentation dashboards/reports
4. Tune planner and editor performance

---

## Open Risks

1. Auth friction may weaken the current no-login product advantage if the access split is not designed carefully.
2. Editor/CMS scope may distract from coach-value delivery if it lands before coach planning works well.
3. AI-assisted PDF conversion may be overestimated; manual review must remain the default quality gate.

---

## Immediate Next Tasks

1. Update `docs/CORE_ARCHITECTURE.md` to describe the dual-surface model: anonymous browse plus authenticated planner/CMS extensions.
2. Update `docs/NFR.md` so no-login remains true for browse mode while planner/editor features can add authenticated flows.
3. Update `docs/DATA_MODEL.md` to add the planned structured drill/session model alongside the current Drive-backed runtime model.
4. Break Phase 1 and Phase 2 into `todo/task-###` files.
