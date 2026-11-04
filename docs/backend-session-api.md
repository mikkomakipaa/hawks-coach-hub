# Backend Session API

**Last Updated**: 2026-02-28

This document describes the implemented backend contract for planner sessions, draft recovery, and shareable read-only session links.

## Route Summary

| Method  | Route                           | Access                                    | Notes                                              |
| ------- | ------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `GET`   | `/api/sessions`                 | Authenticated planner user                | Returns the current user's sessions                |
| `POST`  | `/api/sessions`                 | Authenticated planner user                | Creates a session draft                            |
| `GET`   | `/api/sessions/:id`             | Authenticated owner, `editor`, or `admin` | Loads an editable session                          |
| `PATCH` | `/api/sessions/:id`             | Authenticated owner, `editor`, or `admin` | Updates an existing session                        |
| `POST`  | `/api/sessions/:id/share`       | Authenticated owner, `editor`, or `admin` | Creates or reuses a public share link              |
| `GET`   | `/api/shared-sessions/:shareId` | Anonymous                                 | Reads a shared session without planner/editor auth |
| `GET`   | `/api/planner/me`               | Authenticated planner user                | Returns the canonical planner profile              |

Temporary planner auth contract:

- planner routes resolve identity from `x-planner-user-id` and optional `x-planner-email`
- role metadata may be loaded from Airtable `Planner Profiles`; when that repository is not configured, `x-planner-role` remains the temporary fallback
- allowed authenticated roles are `viewer`, `editor`, and `admin`
- owner checks use canonical `ownerUserId`
- public shared-session reads must not require planner headers

## Canonical Response Shapes

Session list response:

```json
{
  "items": [
    {
      "id": "session_123",
      "name": "Game Day Prep",
      "group": "U14",
      "date": "2026-03-05",
      "ownerUserId": "coach_1",
      "coachLabel": "Coach A",
      "targetDurationMin": 75,
      "totalDurationMin": 70,
      "status": "draft",
      "visibility": "private",
      "shareId": "nQ8W8k5FG6sCz2gR2aS9dK7T",
      "blockCount": 4,
      "createdAt": "2026-02-28T12:00:00.000Z",
      "updatedAt": "2026-02-28T12:05:00.000Z"
    }
  ],
  "total": 1
}
```

Share response:

```json
{
  "sessionId": "session_123",
  "shareId": "nQ8W8k5FG6sCz2gR2aS9dK7T",
  "visibility": "shared",
  "shareUrl": "/session/nQ8W8k5FG6sCz2gR2aS9dK7T",
  "updatedAt": "2026-02-28T12:10:00.000Z"
}
```

Shared read response:

```json
{
  "shareId": "nQ8W8k5FG6sCz2gR2aS9dK7T",
  "sessionId": "session_123",
  "canView": true,
  "session": {
    "id": "session_123",
    "name": "Game Day Prep",
    "group": "U14",
    "date": "2026-03-05",
    "ownerUserId": "coach_1",
    "coachLabel": "Coach A",
    "status": "draft",
    "visibility": "shared",
    "shareId": "nQ8W8k5FG6sCz2gR2aS9dK7T",
    "blocks": []
  }
}
```

Validation failure response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Session payload is invalid.",
    "details": [
      {
        "field": "name",
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
- `METHOD_NOT_ALLOWED`
- `CONFIGURATION_ERROR`

## Session Persistence Rules

- New sessions are always created as `draft`
- Session list reads are scoped to the authenticated planner user
- Editable session reads and writes require ownership or an elevated `editor`/`admin` role
- Shared visibility is established through `POST /api/sessions/:id/share`, not direct create/update payloads
- Shared reads require a distinct `shareId`, not the canonical session `id`
- Shared reads return `404` when the `shareId` does not exist or the session is not currently shared
- Frontend draft recovery is client-owned: failed saves should preserve the last attempted payload locally and let the coach reopen or restore it without requiring backend draft-recovery endpoints

## Share Identifier Rules

- Share identifiers are generated separately from session IDs
- Share identifiers use cryptographically random bytes encoded with `base64url`
- Share identifiers must not be sequential, incremental, or derived from Airtable record IDs

## Airtable Adapter Boundary

Implementation split:

- `api/sessions/*` and `api/shared-sessions/*` own HTTP method gating and response shaping
- `api/_lib/planner/service.js` owns canonical session persistence, reopen, and share-link rules
- `api/_lib/planner/airtable.js` owns Airtable table access and field mapping

Isolation rules:

- Airtable field names such as `App ID`, `Blocks JSON`, and `Session App ID` stay inside the adapter
- route handlers and clients only see canonical `Session`, `SessionSummary`, `SessionShareResult`, and `SharedSessionView` shapes
- replacing Airtable with Supabase should only require a new repository adapter with the same repository methods

Current Airtable environment variables:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_SESSIONS_TABLE` default: `Sessions`
- `AIRTABLE_SESSION_SHARES_TABLE` default: `Session Shares`
- `AIRTABLE_PLANNER_PROFILES_TABLE` default: `Planner Profiles`
