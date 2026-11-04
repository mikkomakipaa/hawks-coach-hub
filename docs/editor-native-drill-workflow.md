# Editor Native Drill Workflow

**Last Updated**: 2026-02-28

This document describes the current native drill authoring flow for `#/editor/drills/new` and `#/editor/drills/:id/edit`.

## Route Behavior

- `#/editor/drills/new`
  Opens the native drill form for creating a new draft.
- `#/editor/drills/:id/edit`
  Loads an existing draft or published drill into the same form shell.

Both routes call `GET /api/planner/me` before exposing write controls.

## Permissions

- `viewer`
  Cannot access write actions. The form is replaced with an explicit access-denied state.
- `editor`
  Can create and update draft drills.
- `admin`
  Can create, update, and publish drills.

The current temporary frontend identity source is `localStorage['hawks.planner.identity.v1']` or `window.HAWKS_PLANNER_IDENTITY`.

Expected shape:

```json
{
  "userId": "admin_1",
  "email": "admin@example.com",
  "role": "admin",
  "displayName": "Admin"
}
```

These values are translated into the temporary `x-planner-*` headers by `PlannerApiClient`.

## Form Structure

The native drill form is split into four sections in the first internal UI test:

1. `Perustiedot`
   Title, slug, summary, category, intensity, primary image URL, description
2. `Kohderyhma`
   Duration, player counts, age groups, skill tags, equipment
3. `Valmennussisalto`
   Setup instructions, coaching points, progressions, variations
4. `Liitteet`
   A mocked attachment zone that shows the intended placement for image/PDF/Drive assets without wiring upload yet

Multi-value fields accept one value per line and also tolerate comma-separated input.

Additional internal-review cues:

- an explicit `Editorin testiversio` banner explains that this screen is not coach-facing
- a `Julkaisun tarkistus` side panel shows readiness and browser validation state
- the attachment area is intentionally mocked so stakeholders can review placement and terminology before backend upload exists

## Validation And Publish Flow

- Save and publish both validate required drill fields in the browser first.
- Required fields: `title`, `summary`, `description`, `category`
- Numeric guards: `durationMin`, `playerCountMin`, and `playerCountMax` must be non-negative integers.
- `playerCountMax` must be greater than or equal to `playerCountMin`.
- Publish reuses the same field checks before calling the backend.
- The readiness checklist shown in the UI is a review aid for the internal prototype. It is not yet a separate backend workflow state.

Flow:

1. New route + `Tallenna luonnos`
   Calls `POST /api/editor/drills`, then routes to `#/editor/drills/:id/edit`
2. Edit route + `Tallenna luonnos`
   Calls `PATCH /api/editor/drills/:id`
3. `Julkaise`
   Saves the current form state first if needed, then calls `POST /api/editor/drills/:id/publish`

## Unauthorized And Forbidden Handling

- `401 UNAUTHORIZED`
  The route shows a sign-in-required editor state.
- `403 FORBIDDEN`
  The route keeps the user out of write actions or shows a publish permission failure inline.
- API validation details are mapped back onto field-level errors when the backend returns structured `details`.

## Mocked Elements In This UI Release

- Attachment upload, sorting, and persistence remain mocked in the editor screen.
- The readiness panel is frontend-only and is derived from current form values.
- The screen is meant to validate layout, content hierarchy, and editor-only cues before the full editorial workflow is completed.
