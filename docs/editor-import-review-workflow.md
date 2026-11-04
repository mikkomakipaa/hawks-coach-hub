# Editor Import Review Workflow

**Last Updated**: 2026-02-28

This document describes the current editor import queue behavior for `#/editor/imports`.

## Route Behavior

- `#/editor/imports`
  Loads planner permissions first, then shows the import queue and the selected import-review form in the same shell.

The queue currently supports:

- filtering by `reviewStatus`
- filtering by `sourceType`
- opening any listed import draft into the manual correction form

## Permissions

- `viewer`
  Cannot see the import queue or import actions.
- `editor`
  Can review and reject import drafts, plus edit manual correction fields locally while preparing a publishable record.
- `admin`
  Can review, reject, convert to a drill draft, and publish an import-derived drill into the coach catalog.

## Review And Correction Flow

The review screen shows three data layers at once:

1. Queue metadata
   Confidence, review status, file/source information, and updated timestamp
2. Manual correction form
   Canonical drill fields that will be sent to the approve endpoint
3. Raw extraction reference
   `extractedText` and `extractedFields` for side-by-side cleanup work

The current UI test version also makes the review model explicit with:

- an `Editorin testiversio` banner that separates editor-only review from coach-facing catalog views
- a comparison panel showing `Jarjestelman ehdotus` versus the human-corrected canonical drill form
- a readiness checklist that communicates how close the corrected drill is to publishable quality

Manual field edits are stored in `localStorage` per import draft id so refreshes and transient API failures do not immediately wipe editor work.

Storage key prefix:

```text
hawks.editor.import-review.v1:
```

## Action Semantics

- `Merkitse tarkistetuksi`
  Calls `POST /api/editor/imports/:id/review` with `reviewNotes`
- `Hylkaa`
  Calls `POST /api/editor/imports/:id/reject` with `reviewNotes`
- `Muunna luonnokseksi`
  Calls `POST /api/editor/imports/:id/approve` with corrected canonical drill fields
- `Julkaise katalogiin`
  Calls `POST /api/editor/imports/:id/approve` first, then `POST /api/editor/drills/:id/publish`

Important constraint:

- the backend approve route still creates a canonical drill in `draft` state
- direct coach-catalog visibility therefore requires the extra publish call after approval

## Validation And Failure Handling

- Publish and convert actions reuse the canonical drill validation rules from the native editor form.
- Required corrected fields remain `title`, `summary`, `description`, and `category`.
- Numeric guards for duration and player counts are enforced before any approve/publish request is sent.
- API validation `details` are mapped back onto field-level errors when present.
- If `approve` succeeds but the follow-up publish call fails, the converted drill remains available through `#/editor/drills/:id/edit` and the import draft stays marked as converted.

## Status Interpretation

- `pending`
  New draft waiting for first human review
- `reviewed`
  Reviewed and notes recorded, but not yet converted
- `rejected`
  Source extraction or file quality is not usable yet
- `converted`
  Canonical drill record has already been created from this import draft

## Mocked Elements In This UI Release

- Confidence labels, readiness messaging, and the suggestion-vs-correction explainer are frontend review aids for the prototype.
- The queue and correction form are real route surfaces, but the broader editorial workflow remains intentionally simplified to draft/review/converted cues.
- The goal of this release is stakeholder validation of screen structure and review language, not final upload automation or permission hardening.
