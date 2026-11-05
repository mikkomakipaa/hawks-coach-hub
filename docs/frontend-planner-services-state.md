# Frontend Planner Services And State

**Last Updated**: 2026-02-28

This note documents the frontend boundary for planner/editor data access introduced for drills, sessions, imports, and planner permissions.

## Service Modules

- `src/services/planner-api-client.ts`
  Centralizes HTTP transport, temporary planner header auth, query serialization, and typed API error mapping.
- `src/services/drill-catalog-service.ts`
  Exposes canonical drill catalog reads plus editor drill create/update/publish methods.
- `src/services/session-planner-service.ts`
  Exposes session list, detail, create/update, share-link, and shared-session reads.
- `src/services/planner-session-recovery-store.ts`
  Persists the active planner draft plus failed-save recovery payloads in `localStorage` so coaches can reopen work after reloads or backend failures.
- `src/services/session-print-service.ts`
  Generates a print-friendly session window from the canonical `Session` DTO.
- `src/services/import-review-service.ts`
  Exposes import queue reads and review actions using canonical import draft DTOs.
- `src/services/planner-auth-service.ts`
  Resolves `PlannerProfile` and computes UI-facing permission flags from planner roles.
- `src/services/planner-identity.ts`
  Resolves the temporary frontend planner identity from `localStorage` or `window.HAWKS_PLANNER_IDENTITY` so protected planner/editor routes can send `x-planner-*` headers without hardcoding them in view code.

Boundary rule:

- These services only expose app-owned DTOs from `src/types/*`.
- HTTP details and temporary `x-planner-*` headers stay inside the client layer.
- Airtable field names, record shapes, and linked-record metadata do not appear in service or state contracts.

## State Modules

- `src/state/request-state.ts`
  Shared load/save status and recoverable error helpers.
- `src/state/drill-catalog-state.ts`
  Tracks catalog query state, result pages, drill detail loading, and recoverable fetch errors.
- `src/state/planner-session-state.ts`
  Tracks session list/detail state, dirty state, save state, and share-link state separately.
- `src/state/editor-draft-state.ts`
  Tracks editor drill load/save/publish state, field validation errors, plus import queue and import review actions.
- `src/state/planner-access-state.ts`
  Tracks current planner profile, computed permissions, and route-guard loading state.

## Vendor-Neutral Contract Boundary

The frontend now depends on these canonical types:

- `Drill`
- `DrillDetail`
- `DrillImportDraft`
- `DrillImportDraftPage`
- `Session`
- `SessionListResponse`
- `SessionShareResult`
- `SharedSessionView`
- `PlannerProfile`
- `PlannerPermissions`

If Airtable is replaced by Postgres (Neon proposed) later, the intended change surface is:

1. Backend repository/storage adapters
2. Backend route internals if persistence mechanics change

The intended non-change surface is:

1. Frontend service method signatures
2. Frontend state container shapes
3. Route/view contracts consuming planner/editor data

## Planner Save And Recovery Behavior

- `#/plan` lists the coach's saved sessions and surfaces any local draft or failed-save recovery entry point.
- `#/plan/new` and `#/plan/:id` persist the working draft locally on every edit.
- Successful saves keep the local draft aligned with the canonical saved session.
- Failed saves store a recovery payload with the error message so the coach can restore the last editable version without rebuilding the session.
- Share links stay behind `SessionPlannerService.createShareLink(...)`, while print output stays frontend-owned and is derived from the same canonical session shape.

## Test-Version Route Map

- `#/`
  Browse mode. Live Google Drive data. Default entry point for the product and the fallback link target for shell routes.
- `#/plan`
  Session list shell. Live session API when available, plus local recovery entry points. Meant for repeat planner testing.
- `#/plan/new` and `#/plan/:id`
  Session builder shell. Uses live draft/session state plus explicit placeholder panels for later builder enhancements.
  For the current user test version, metadata editing, block ordering, save/share status, and session persistence are interactive; the inline builder drill-search shelf and tester-notes card are intentionally mock-backed/local-only.
- `#/drills` and `#/drills/:id`
  Coach drill catalog and detail shells. These already depend on live published drill data and expose quick links back into planning.
  The first test-version catalog prioritizes search, category/age/tag/intensity filters, and direct `Lisaa suunnitelmaan` entry points over editorial metadata.
- `#/editor/drills/new` and `#/editor/drills/:id/edit`
  Editor authoring shells. Mock-first framing with live permission/draft wiring underneath. Reviewers should expect clear structure, role states, and save/publish affordances before every authoring detail is final.
- `#/editor/imports`
  Import review shell. Mock-first framing with live queue/review wiring underneath. The shell is intended for workflow walkthroughs even when import content is partial.

Shell status guidance:

- Live-data first: browse, drill catalog, drill detail, shared session
- Hybrid shell + live state: planner list, planner builder
- Mock-first shell + live permissions/state: editor drill form, import review

## Planner Test-Version Assumptions

- `#/plan` should explain the flow on first glance: recent sessions on the left, recent drill shortcuts on the right, and a visible `Uusi suunnitelma` action above the fold.
- `#/plan/new` and `#/plan/:id` must remain usable at `375px` without horizontal scrolling, so block reordering stays on explicit buttons rather than drag-only interactions.
- Builder drill additions are currently backed by curated mock drills so testers can validate planning flow before the final catalog-to-builder integration is complete.
- The tester notes panel is deliberately local-only. It exists to capture usability observations during the first rounds, not as part of the canonical session payload.
- The drill catalog and detail views are live-data first, but they intentionally tolerate partial Airtable-backed records in the first test version.
- Missing drill images, diagrams, setup copy, or attachments should render explicit placeholders so testers can still assess discovery and planner handoff quality.
- Coach-facing drill cards should stay limited to planning-relevant metadata: category, age fit, duration, player count, intensity, and a small skill-tag sample.

## Native Drill Authoring

- `#/editor/drills/new` and `#/editor/drills/:id/edit` now mount a native drill authoring form.
- The editor form loads planner permissions first and hides write actions from non-editor roles.
- The form validates required drill fields and player-count constraints before save or publish.
- Save calls stay behind `EditorDrillService.createDraft(...)` and `EditorDrillService.updateDraft(...)`.
- Publish stays behind `EditorDrillService.publishDrill(...)` and remains admin-gated.

## Import Queue And Review

- `#/editor/imports` mounts a dedicated import queue and review screen rather than reusing the native drill route.
- Queue reads and review status changes stay behind `ImportReviewService`.
- Import correction form values are persisted locally per draft id so refreshes do not immediately drop manual cleanup work.
- Converting an import into a canonical drill stays behind `ImportReviewService.approveDraft(...)`.
- Publishing an import-derived drill into the coach catalog chains `ImportReviewService.approveDraft(...)` and `EditorDrillService.publishDrill(...)`.
