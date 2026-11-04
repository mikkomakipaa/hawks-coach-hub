# Planner API Implementation Boundaries

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28
**Purpose**: Define the canonical backend/API surface and layer boundaries for the shipped drill catalog, coach planner, shared-session, and editor/import features

---

## Why This Document Exists

This is the single implementation reference for planner/editor API boundaries and the Airtable adapter seam that must survive a later Supabase migration.

Use it when implementing:

- backend route handlers
- backend repository and storage adapters
- frontend planner/editor services
- planner/editor state containers
- route-specific UI managers

This document complements:

- `docs/DATA_MODEL.md` for canonical entity contracts
- `docs/COMPONENTS.md` for module ownership
- `docs/CORE_ARCHITECTURE.md` for accepted boundary decisions

---

## Boundary Summary

Ownership by layer:

- `api/*` owns HTTP concerns, auth checks, request validation, and response shaping.
- backend services/repositories own domain operations and persistence orchestration.
- storage adapters own Airtable-specific mapping and persistence details.
- `src/services/*` owns frontend access to planner/editor APIs.
- `src/state/*` owns in-memory planner/editor state transitions.
- `src/ui/*` and `src/components/*` own rendering and interaction wiring.

Non-negotiable rule:

- Airtable table names, field names, linked-record shapes, attachment column structure, formula outputs, and record IDs are storage details only. They must not leak into route handlers, shared domain types, frontend services, state, or UI code.

---

## Canonical API Surface

The endpoints below describe the current public planner/editor surface. They are intentionally storage-neutral.

### Drill Catalog

| Method  | Route                            | Access                            | Returns            | Notes                                |
| ------- | -------------------------------- | --------------------------------- | ------------------ | ------------------------------------ |
| `GET`   | `/api/drills`                    | Anonymous read by default         | `DrillCatalogPage` | Filtered catalog query               |
| `GET`   | `/api/drills/:idOrSlug`          | Anonymous read by default         | `DrillDetail`      | Canonical drill detail payload       |
| `POST`  | `/api/editor/drills`             | Authenticated `editor` or `admin` | `Drill`            | Create draft or initial drill record |
| `PATCH` | `/api/editor/drills/:id`         | Authenticated `editor` or `admin` | `Drill`            | Update drill draft or metadata       |
| `POST`  | `/api/editor/drills/:id/publish` | Authenticated `admin`             | `Drill`            | Publish workflow action              |

### Sessions and Sharing

| Method  | Route                           | Access                       | Returns                          | Notes                        |
| ------- | ------------------------------- | ---------------------------- | -------------------------------- | ---------------------------- |
| `GET`   | `/api/sessions`                 | Authenticated                | `SessionSummary[]` or paged list | Current user's sessions      |
| `POST`  | `/api/sessions`                 | Authenticated                | `Session`                        | Create session               |
| `GET`   | `/api/sessions/:id`             | Authenticated owner/editor   | `Session`                        | Load editable session        |
| `PATCH` | `/api/sessions/:id`             | Authenticated owner/editor   | `Session`                        | Update session               |
| `POST`  | `/api/sessions/:id/share`       | Authenticated owner/editor   | `SessionShareResult`             | Create or refresh share link |
| `GET`   | `/api/shared-sessions/:shareId` | Anonymous or link-gated read | `SharedSessionView`              | Read-only shared session     |

### Import Review and Permissions

| Method | Route                             | Access                            | Returns                | Notes                                    |
| ------ | --------------------------------- | --------------------------------- | ---------------------- | ---------------------------------------- |
| `GET`  | `/api/editor/imports`             | Authenticated `editor` or `admin` | `DrillImportDraftPage` | Import queue                             |
| `POST` | `/api/editor/imports`             | Authenticated `editor` or `admin` | `DrillImportDraft`     | Create draft from import payload         |
| `GET`  | `/api/editor/imports/:id`         | Authenticated `editor` or `admin` | `DrillImportDraft`     | Draft detail                             |
| `POST` | `/api/editor/imports/:id/review`  | Authenticated `editor` or `admin` | `DrillImportDraft`     | Marks draft as reviewed                  |
| `POST` | `/api/editor/imports/:id/reject`  | Authenticated `editor` or `admin` | `DrillImportDraft`     | Records rejection outcome                |
| `POST` | `/api/editor/imports/:id/approve` | Authenticated `admin`             | `Drill`                | Converts draft into canonical drill data |
| `GET`  | `/api/planner/me`                 | Authenticated                     | `PlannerProfile`       | Current planner identity and role        |

Notes:

- Exact filenames under `api/` can vary, but the route contracts and ownership rules should remain stable.
- Route handlers should expose canonical contracts from `docs/DATA_MODEL.md`, not backend-vendor payloads.
- If pagination, cursoring, or filtering expands later, extend DTOs without exposing storage-specific query syntax.
- Current implementation details for drill routes live in `docs/backend-drill-api.md`, including the temporary header-based editor auth contract and Airtable environment variables.
- Current implementation details for session and shared-session routes live in `docs/backend-session-api.md`, including the temporary planner-header auth contract, share-link behavior, and Airtable environment variables.
- Current implementation details for import routes live in `docs/backend-import-api.md`, including review-state transitions and the temporary Airtable profile/import adapters.

---

## Request and Response Rules

Route handlers:

- Accept route params, query params, and JSON bodies in app-owned DTOs only.
- Validate user input before it reaches repository adapters.
- Translate domain failures into HTTP status codes and stable error payloads.
- Return canonical entities or purpose-built response DTOs such as `DrillCatalogPage` or `SessionShareResult`.

Route handlers must not:

- reference Airtable base IDs, table names, view names, field labels, or formula fields
- emit raw Airtable records to clients
- require UI code to understand adapter-specific nullability or linked-record arrays

Frontend services:

- consume only the canonical API surface above
- map HTTP transport details into frontend-friendly results
- centralize retry/auth-expiry handling for planner/editor routes

Frontend services must not:

- encode Airtable schema assumptions
- build UI around vendor-specific response envelopes

---

## Storage Boundary

Allowed Airtable-specific logic:

- base/table selection
- field-name mapping
- linked-record expansion
- attachment-field normalization
- formula or computed-column interpretation needed to produce canonical entities
- Airtable pagination and rate-limit handling

Allowed locations:

- backend repository modules
- backend storage adapter modules
- backend mapper modules local to the persistence layer

Not allowed:

- frontend code
- route handlers
- shared domain types
- route names or public response shapes
- planner/editor UI validation logic

Required implementation pattern:

1. route handler validates request and authorizes access
2. backend service performs domain operation using canonical inputs
3. repository delegates persistence to a storage adapter
4. storage adapter maps Airtable rows into canonical entities
5. route handler returns canonical JSON response

If Supabase replaces Airtable later:

- replace repository or storage-adapter internals
- preserve route contracts and domain entities
- preserve frontend service interfaces
- avoid planner/editor UI rewrites caused by storage migration

---

## Frontend Consumption Rules

Planner/editor frontend code should be organized around these responsibilities:

- `src/services/*`: call planner/editor APIs and return canonical DTOs
- `src/state/*`: track draft/session/query/save status state
- `src/ui/*`: orchestrate route-specific views and user actions
- `src/components/*`: render normalized data only

Examples of acceptable frontend contracts:

- `Drill`
- `DrillDetail`
- `DrillImportDraft`
- `Session`
- `SharedSessionView`
- `PlannerProfile`

Examples of unacceptable frontend contracts:

- Airtable record IDs as primary app IDs
- Airtable `{ fields: ... }` record shapes
- field labels copied from Airtable configuration
- attachment arrays that expose vendor-specific metadata not present in canonical types

---

## Implementation Checklist

Use this checklist during implementation tasks:

- Does the route handler depend only on canonical request/response DTOs?
- Is auth/role enforcement happening before persistence calls?
- Are Airtable-specific mappings isolated to backend adapter code?
- Can the frontend service swap backend storage vendors without changing its own public methods?
- Can the UI render the same data if Airtable is replaced by Supabase?

If any answer is "no", the boundary is too weak and should be corrected before merging.
