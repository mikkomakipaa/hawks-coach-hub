# Backend Import API

**Last Updated**: 2026-11-05

This document describes the implemented backend contract for editor import drafts, review-state transitions, and conversion into canonical drills.

## Route Summary

| Method | Route                             | Access              | Notes                                                  |
| ------ | --------------------------------- | ------------------- | ------------------------------------------------------ |
| `GET`  | `/api/editor/imports`             | `editor` or `admin` | Returns the import queue                               |
| `POST` | `/api/editor/imports`             | `editor` or `admin` | Creates a new import draft                             |
| `GET`  | `/api/editor/imports/:id`         | `editor` or `admin` | Returns a single import draft                          |
| `POST` | `/api/editor/imports/:id/review`  | `editor` or `admin` | Marks a draft as reviewed                              |
| `POST` | `/api/editor/imports/:id/reject`  | `editor` or `admin` | Marks a draft as rejected                              |
| `POST` | `/api/editor/imports/:id/approve` | `admin`             | Converts the import draft into a canonical drill draft |

Auth boundary:

- import routes resolve planner identity from `x-planner-user-id` and optional `x-planner-email`
- role metadata may be loaded from Airtable `Planner Profiles`; when that repository is not configured, `x-planner-role` remains the temporary fallback
- anonymous browse clients must never reach these write flows
- `api/drive.js` remains a separate anonymous read-only surface and must not be used for import-draft writes

## Canonical Response Shapes

Import draft detail:

```json
{
  "id": "import_draft_123",
  "sourceType": "pdf",
  "sourceFileId": "drive_file_123",
  "sourceFileName": "Breakout Drill.pdf",
  "extractedTitle": "Breakout Drill",
  "extractedText": "Players break out under pressure.",
  "extractedFields": {
    "category": "transition",
    "summary": "Imported summary"
  },
  "confidence": "medium",
  "reviewStatus": "reviewed",
  "convertedDrillId": "drill_123",
  "reviewedByUserId": "admin_1",
  "reviewNotes": "Converted after cleanup.",
  "createdAt": "2026-02-28T13:00:00.000Z",
  "updatedAt": "2026-02-28T13:10:00.000Z"
}
```

Approve response:

- returns the canonical `Drill` payload from the drill API
- converted drills are created as canonical draft drills, not Airtable records or vendor envelopes
- frontend publish-from-import flows must still call `/api/editor/drills/:id/publish` if the result should appear immediately in the coach catalog

Stable review statuses:

- `pending`
- `reviewed`
- `rejected`
- `converted`

Validation failure response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Import draft payload is invalid.",
    "details": [
      {
        "field": "sourceType",
        "message": "Must be one of: pdf, drive-file."
      }
    ]
  }
}
```

Other stable error codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `METHOD_NOT_ALLOWED`
- `CONFIGURATION_ERROR`

## Import Review Rules

- New import drafts always start in `pending`
- `editor` and `admin` users can create drafts and move them between `pending`, `reviewed`, and `rejected`
- Only `admin` users can approve a draft into a canonical drill record
- Approval converts the draft into a canonical drill and stores the resulting `convertedDrillId`
- Converted drafts cannot transition back into active review states
- If the frontend chains a publish step after approval and that publish fails, the converted draft drill remains the recovery point for further editor cleanup

## Airtable Adapter Boundary

Implementation split:

- `api/editor/imports/*` owns HTTP method gating and response shaping
- `api/_lib/imports/service.js` owns review-state transitions and conversion rules
- `api/_lib/imports/airtable.js` owns Airtable table access and field-name mapping
- `api/_lib/auth/airtable.js` owns temporary Airtable planner-profile lookups

Isolation rules:

- Airtable field names such as `Extracted Fields JSON`, `Converted Drill App ID`, and `Display Name` stay inside adapter code
- route handlers and clients only see canonical `DrillImportDraft`, `Drill`, and `PlannerProfile` shapes
- replacing Airtable with Postgres (Neon proposed) should only require adapter changes behind the same repository interfaces

Current Airtable environment variables:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_IMPORT_DRAFTS_TABLE` default: `Import Drafts`
- `AIRTABLE_PLANNER_PROFILES_TABLE` default: `Planner Profiles`
