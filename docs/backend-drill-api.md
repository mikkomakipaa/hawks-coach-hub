# Backend Drill API

**Last Updated**: 2026-11-05

This document describes the implemented backend contract for structured drills and the temporary Airtable adapter boundary.

## Route Summary

| Method  | Route                            | Access              | Notes                               |
| ------- | -------------------------------- | ------------------- | ----------------------------------- |
| `GET`   | `/api/drills`                    | Anonymous           | Returns published drills only       |
| `GET`   | `/api/drills/:idOrSlug`          | Anonymous           | Returns published drill detail only |
| `POST`  | `/api/editor/drills`             | `editor` or `admin` | Creates a draft drill               |
| `PATCH` | `/api/editor/drills/:id`         | `editor` or `admin` | Updates an existing drill           |
| `POST`  | `/api/editor/drills/:id/publish` | `admin`             | Publishes a draft drill             |

Temporary editor auth contract:

- editor routes currently resolve planner identity from `x-planner-user-id` and optional `x-planner-email`
- role metadata may be loaded from Airtable `Planner Profiles`; when that repository is not configured, `x-planner-role` remains the temporary fallback
- this header-based identity is an interim editor-test mechanism, not authentication; it is to be replaced by real authentication before coaching data is stored (see `../plans/plan-002-junior-training-programs.md`, finding F1)
- drill draft creation and updates require `editor` or `admin`
- drill publication is an `admin` governance action
- public coach-facing reads must not require those headers

Draft visibility:

- public reads return published drills only
- editor/admin reads can request drafts with `includeDrafts=true`

## Canonical Response Shapes

List route response:

```json
{
  "items": [
    {
      "id": "drill_123",
      "slug": "warmup-passing-circle",
      "title": "Warmup Passing Circle",
      "summary": "Quick-touch passing under pressure",
      "description": "Players rotate through a passing circle.",
      "category": "passing",
      "ageGroups": ["U12", "U14"],
      "skillTags": ["passing", "scanning"],
      "equipment": ["cones", "balls"],
      "coachingPoints": ["Open body position"],
      "progressionIdeas": [],
      "variationIdeas": [],
      "status": "published",
      "sourceType": "native",
      "attachmentIds": ["attachment_1"],
      "createdAt": "2026-02-28T10:00:00.000Z",
      "updatedAt": "2026-02-28T10:05:00.000Z"
    }
  ],
  "total": 1,
  "filters": {
    "query": "passing",
    "status": "published"
  }
}
```

Detail route response extends the drill with:

- `attachments: DrillAttachment[]`

Validation failure response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Drill payload is invalid.",
    "details": [
      {
        "field": "title",
        "message": "Must be a non-empty string."
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

## Write Rules

- New drills are always created as `draft`
- Draft to published transitions must use the publish route
- Publishing requires the authenticated actor to have the `admin` role
- `PATCH` rejects unsupported status transitions with `409 CONFLICT`
- Anonymous clients cannot read draft or archived drills
- Published drills may be listed and read by coach-facing clients without editor headers

## Airtable Adapter Boundary

Implementation split:

- `api/*` route files own method gating and HTTP response shaping
- `api/_lib/drills/service.js` owns canonical drill operations and status rules
- `api/_lib/drills/airtable.js` owns Airtable table access and field-name mapping

Isolation rules:

- Airtable field names such as `App ID`, `Slug`, `Drill App ID`, and `Sort Order` stay inside the adapter
- route handlers and clients only see canonical `Drill`, `DrillDetail`, and `DrillAttachment` shapes
- replacing Airtable with Postgres (Neon proposed) should only require a new repository adapter with the same repository methods

Current Airtable environment variables:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_DRILLS_TABLE` default: `Drills`
- `AIRTABLE_DRILL_ATTACHMENTS_TABLE` default: `Drill Attachments`
- `AIRTABLE_PLANNER_PROFILES_TABLE` default: `Planner Profiles`
