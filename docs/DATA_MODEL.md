# Data Model

**Project**: Hawks Coach Hub
**Last Updated**: 2026-11-05
**Purpose**: Document the current Drive-backed browse runtime model and the shipped structured planner/CMS data model

---

## Overview

Current shipped application:

- has no database dependency for browse mode
- reads data from the Google Drive API via a service account
- holds browse data in memory during the session

Shipped planner/CMS extension:

- introduces structured drill/session data in a structured backend, using Airtable first
- preserves Drive as a source of legacy files and attachments
- separates anonymous browse data from authenticated planner/editor data
- should keep storage access behind app-owned contracts so Postgres (Neon proposed) can replace Airtable later without changing the domain model

---

## Planner/CMS Route Boundary

These routes are the canonical navigation contract for the structured planner/editor extension.

| Route                      | Access                       | Backing model                                     |
| -------------------------- | ---------------------------- | ------------------------------------------------- |
| `#/`                       | Anonymous                    | Drive browse model                                |
| `#/drills`                 | Anonymous read by default    | `Drill` catalog query                             |
| `#/drills/:id`             | Anonymous read by default    | `Drill` + `DrillAttachment`                       |
| `#/plan`                   | Authenticated                | `Session` list scoped to current planner identity |
| `#/plan/new`               | Authenticated                | New `Session` draft                               |
| `#/plan/:id`               | Authenticated                | Existing `Session` draft/edit model               |
| `#/session/:shareId`       | Anonymous or link-gated read | `SharedSessionView`                               |
| `#/editor/drills/new`      | Authenticated role-gated     | New `Drill` draft                                 |
| `#/editor/drills/:id/edit` | Authenticated role-gated     | Existing `Drill` draft/edit model                 |
| `#/editor/imports`         | Authenticated role-gated     | `DrillImportDraft` queue                          |

Boundary rules:

- Anonymous routes must never require planner/editor identity just to browse structured drills.
- Authenticated planner routes exist because sessions are user-owned or shared records, not anonymous browse state.
- Editor/import routes are separate because authoring and migration are operational workflows, not coach browsing flows.

Test-version navigation note:

- The shipped test UI exposes a persistent top-level nav with `Selaa`, `Suunnitelmat`, `Harjoitteet`, and `Editori`.
- Secondary quick links expose `#/plan/new`, `#/editor/drills/new`, and `#/editor/imports` so reviewers can move between shells without relying on hidden actions inside a single route.
- `#/` remains the default entry and continues to bootstrap the Drive browse model first.

---

## Core Data Types

### DriveFile

Represents a file in Google Drive.

```typescript
interface DriveFile {
  id: string; // Drive file ID (unique)
  name: string; // File name (as stored in Drive)
  mimeType: string; // e.g. "application/pdf", "video/mp4"
  webViewLink?: string; // URL to open in browser
  webContentLink?: string; // Direct download URL
  size?: string; // File size in bytes (string from API)
  modifiedTime?: string; // ISO 8601 timestamp
  parents?: string[]; // Parent folder ID(s)
  thumbnailLink?: string; // Thumbnail URL (if available)
  description?: string; // Optional file description
}
```

### DriveFolder

Represents a folder in Google Drive.

```typescript
interface DriveFolder {
  id: string; // Drive folder ID (unique)
  name: string; // Folder name
  parents?: string[]; // Parent folder ID(s)
}
```

### AppData

The full dataset loaded from Drive, stored in `appState`.

```typescript
interface AppData {
  files: DriveFile[];
  folders: DriveFolder[];
  cached: boolean; // True if served from cache
  loadedAt: number; // Unix timestamp of load
}
```

---

## Application State (`src/state/app-state.ts`)

In-memory singleton representing current app state.

```typescript
interface AppState {
  files: DriveFile[]; // All loaded files
  folders: DriveFolder[]; // All loaded folders
  activeTab: string; // Currently selected tab (folder name)
  activeFolderId: string | null; // Folder being browsed (null = root of tab)
  searchQuery: string; // Current search input
  selectedFiles: Set<string>; // File IDs selected for export
  folderCache: Map<string, DriveFile[]>; // folder ID → files
}
```

---

## API Contract (`api/drive.js`)

### GET `/api/drive?action=files`

Returns all files in the Hawks root folder and subfolders.

**Response**:

```json
{
  "files": [
    {
      "id": "1abc...",
      "name": "Harjoitus 1.pdf",
      "mimeType": "application/pdf",
      "webViewLink": "https://drive.google.com/file/d/1abc.../view",
      "webContentLink": "https://drive.google.com/uc?id=1abc...&export=download",
      "size": "204800",
      "modifiedTime": "2026-01-15T10:30:00Z",
      "parents": ["folder-id-123"]
    }
  ],
  "folders": [
    {
      "id": "folder-id-123",
      "name": "Harjoitukset",
      "parents": ["root-folder-id"]
    }
  ],
  "cached": false,
  "loadedAt": 1706789400000
}
```

### GET `/api/drive?action=list&folderId=<id>`

Returns files in a specific folder (used for lazy loading, if implemented).

---

## Tab Mapping

Top-level Drive folders map to UI tabs. Managed by `TabSearchService`.

```typescript
interface TabConfig {
  folderId: string; // Drive folder ID
  label: string; // Display name (from folder name)
  icon?: string; // Optional icon name
}
```

**Example mapping** (derived from actual Drive structure):

```
Root Folder (HAWKS_FOLDER_ID)
├── Käsikirja/       → Tab: "Käsikirja"
├── Harjoitukset/    → Tab: "Harjoitukset"
├── Taktiikka/       → Tab: "Taktiikka"
├── Videot/          → Tab: "Videot"
└── Kausisuunnitelma/ → Tab: "Kausisuunnitelma"
```

---

## Content Manager State

Tracks files selected for a practice session export.

```typescript
interface ContentSelection {
  selectedFileIds: Set<string>;
  addFile(id: string): void;
  removeFile(id: string): void;
  clearAll(): void;
  getSelectedFiles(allFiles: DriveFile[]): DriveFile[];
}
```

---

## Search Index

MiniSearch index built from file names at load time.

```typescript
// Index schema
{
  fields: ['name'],          // Searchable fields
  storeFields: ['id', 'name', 'mimeType', 'parents'], // Returned with results
  searchOptions: {
    fuzzy: 0.2,              // 20% fuzzy tolerance
    prefix: true             // Prefix matching
  }
}
```

---

## Folder Cache

Precomputed map of folder ID → child files, built from loaded data.

```typescript
// Built by appState.updateFolderCache()
folderCache: Map<string, DriveFile[]>;
// Key: folder ID
// Value: array of files with that folder as parent
```

---

## File Type Classification

```typescript
const MIME_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'video/mp4': 'Video',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.spreadsheet': 'Taulukko',
  'application/vnd.google-apps.presentation': 'Esitys',
  'image/jpeg': 'Kuva',
  'image/png': 'Kuva',
};
```

---

## Structured Planner/CMS Model

The planner/CMS direction no longer treats Drive folder parsing as the strategic drill model. Instead, drills and sessions are intended to live as structured records.

### Domain Modeling Rules

- The interfaces below are the canonical domain contracts for the shipped planner/editor surfaces and future follow-up tasks.
- Airtable is a temporary persistence adapter, not the definition of these entities.
- Airtable field names, linked records, attachment columns, and formula outputs must be mapped into these contracts at the storage layer.
- Postgres migration should preserve these contracts, with storage-specific changes isolated to repository/service adapters.

### Drill

```typescript
interface Drill {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  intensityLevel?: 'low' | 'medium' | 'high';
  ageGroups: string[];
  skillTags: string[];
  durationMin?: number;
  playerCountMin?: number;
  playerCountMax?: number;
  equipment: string[];
  coachingPoints: string[];
  setupInstructions?: string;
  progressionIdeas: string[];
  variationIdeas: string[];
  status: 'draft' | 'published' | 'archived';
  sourceType: 'native' | 'pdf-import' | 'drive-import';
  sourceFileId?: string;
  primaryImageUrl?: string;
  attachmentIds: string[];
  publishedAt?: string;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}
```

Canonical notes:

- `id` is an app-level identifier, not an Airtable record ID contract.
- `slug` is the stable route identifier candidate for future human-readable URLs, even if the first implementation still keys routes by `id`.
- `status` models publication state independent of storage workflow columns.
- `sourceType` records provenance only; it must not leak storage-import mechanics into coach-facing routes.

### DrillAttachment

```typescript
interface DrillAttachment {
  id: string;
  drillId: string;
  type: 'image' | 'pdf' | 'drive-file' | 'link';
  title: string;
  url: string;
  sourceFileId?: string;
  sortOrder: number;
  mimeType?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

Canonical notes:

- Attachments are child entities of `Drill`, not a persistence-specific join representation.
- `sourceFileId` is optional and should only reference external Drive content when applicable.

### DrillImportDraft

```typescript
interface DrillImportDraft {
  id: string;
  sourceType: 'pdf' | 'drive-file';
  sourceFileId?: string;
  sourceFileName?: string;
  extractedTitle?: string;
  extractedText?: string;
  extractedFields: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  reviewStatus: 'pending' | 'reviewed' | 'rejected' | 'converted';
  convertedDrillId?: string;
  reviewedByUserId?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

Canonical notes:

- Import drafts represent a temporary editorial work item and must not be exposed as coach-facing drill records.
- Raw extraction payloads stay inside `extractedFields`; downstream features should rely on normalized `Drill` entities once converted.

### Session

```typescript
interface Session {
  id: string;
  name: string;
  group: string;
  date: string;
  ownerUserId: string;
  coachLabel: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'shared';
  shareId?: string;
  blocks: SessionBlock[];
  createdAt: string;
  updatedAt: string;
}
```

Canonical notes:

- `ownerUserId` is the authoritative ownership field; `coachLabel` is display text.
- `shareId` is a public-share token and must be distinct from `id`.
- `Session` is a persisted planner entity and is never derived from anonymous browse selections.

### SessionSummary

```typescript
interface SessionSummary {
  id: string;
  name: string;
  group: string;
  date: string;
  ownerUserId: string;
  coachLabel: string;
  targetDurationMin?: number;
  totalDurationMin?: number;
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'shared';
  shareId?: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}
```

Canonical notes:

- Session lists should return summary records rather than full block payloads.
- `blockCount` exists so planner list views do not need to load full session details just to show session size.

### SessionBlock

```typescript
interface SessionBlock {
  id: string;
  order: number;
  type: 'warmup' | 'drill' | 'break' | 'game' | 'cooldown' | 'custom';
  title: string;
  durationMin: number;
  drillId?: string;
  notes: string;
  attachmentIds?: string[];
}
```

### Planner Identity and Roles

```typescript
interface PlannerProfile {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  displayName?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}
```

### SharedSessionView

```typescript
interface SharedSessionView {
  shareId: string;
  sessionId: string;
  session: Session;
  canView: boolean;
}
```

### SessionShareResult

```typescript
interface SessionShareResult {
  sessionId: string;
  shareId: string;
  visibility: 'shared';
  shareUrl: string;
  updatedAt: string;
}
```

### Role Definition

```typescript
type PlannerRole = 'viewer' | 'editor' | 'admin';
```

Role semantics:

- `viewer`: can access coach planner routes and shared-session consumption flows allowed by policy.
- `editor`: can create and edit drills, review imports, and manage session content.
- `admin`: can perform editor actions plus role-management and publication-governance actions.

### Session Export Format (Planned)

```json
{
  "exportVersion": "2.0",
  "exportedAt": "2026-03-03T10:00:00Z",
  "session": {
    "name": "U12 maanantaiharjoitus",
    "group": "U12",
    "date": "2026-03-03",
    "coachName": "Harri Virtanen",
    "totalDurationMin": 75,
    "blocks": [
      {
        "order": 1,
        "type": "warmup",
        "title": "Alkulammittely",
        "durationMin": 10,
        "notes": ""
      },
      {
        "order": 2,
        "type": "drill",
        "title": "Kulmataistelu",
        "durationMin": 15,
        "notes": "6-8 pelaajaa",
        "drillId": "drill_123"
      }
    ]
  }
}
```

### Relationship to Drive

- Drive remains the current source of truth for browse mode files and folders.
- Planner drill records may reference Drive file IDs or URLs as attachments.
- Legacy PDFs can be imported into `DrillImportDraft` records and reviewed before conversion into `Drill`.

### Relationship to Airtable and Postgres

- Airtable is the temporary persistence layer for `Drill`, `DrillAttachment`, `DrillImportDraft`, `Session`, and `PlannerProfile`.
- Airtable record IDs, linked-record arrays, select labels, and formula fields are storage details only.
- Repository-owned adapters must translate Airtable rows into the canonical contracts above.
- Postgres migration should preserve these entities and route contracts; only storage adapters and physical schema should change.

### Planned Entities (not implemented)

Planned for the coaching and athlete milestones (see `../plans/plan-002-junior-training-programs.md` sections 12 and 19). These are design sketches, not contracts; they will be finalized when the matching issues are designed.

| Entity                                                                                                                                         | Purpose                                                                                                                                                      | Milestone                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `Team` (name, age group, season)                                                                                                               | One blank team per coach to start                                                                                                                            | MS1                        |
| `TaxonomyVersion`, `Skill` (stable key, version, descriptors, age bands), `SkillCategory`                                                      | Versioned shared vocabulary; assessments, goals and drill tags reference the stable key plus the version in force                                            | MS1                        |
| `Assessment` (`subject_type` team or athlete, `subject_id`, skill stable key, taxonomy version, level, date, assessor) and `Observation`       | One shape for team and athlete level; athlete rows are rejected until MS3                                                                                    | MS1 (team) / MS3 (athlete) |
| `Goal` (scope team or athlete, type process or development, skill, baseline, target, "how we will see it", due and review dates), `GoalReview` | Team goals first; athlete goals in MS3                                                                                                                       | MS1 / MS3                  |
| `Program`, `Cycle`, `Week`                                                                                                                     | Season structure linked to goals and focus skills                                                                                                            | MS1                        |
| `Session` (extended)                                                                                                                           | `owner_user_id`, nullable `team_id` and `week_id`, `planned_for`; planned vs actual; head count; per-block goal, intensity, group size, space (all optional) | MS1                        |
| `Drill` (extended)                                                                                                                             | Age range, primary skill plus up to two secondary, group size, equipment, space, intensity, game-like flag, up to three coaching points, one progression     | MS1                        |
| `Athlete`, `Membership`                                                                                                                        | Named athletes and team roles                                                                                                                                | MS3                        |
| `Assessment` (per athlete), per-athlete `Goal`                                                                                                 | Individual development                                                                                                                                       | MS3                        |
| `Attendance`, `AthleteLog`                                                                                                                     | Per-athlete attendance and self-reported effort                                                                                                              | MS3                        |

Role mapping (proposal, see CORE_ARCHITECTURE Decision 12): system role `admin` or `user`; team membership role `head_coach` or `assistant`; content capability `editor` (a capability, not a user type). The earlier `viewer/editor/admin` planner roles are an interim editor-test mechanism. Athlete and guardian roles are introduced in MS3.

Rules for new entities: additive and backward compatible, `version` field for optimistic locking, no named-athlete data before MS3, row-level security on every table when the Postgres backend is introduced.

### Transitional Note

Drive parsing and local-only planner state were earlier planning assumptions. They are no longer the preferred long-term planner model. If temporary migration utilities are built from Drive data, they should be treated as bridge tooling rather than the final runtime contract.

---

## Environment Configuration

```typescript
// src/utils/config.ts
export const HAWKS_FOLDER_ID =
  import.meta.env.VITE_HAWKS_FOLDER_ID || '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';

export const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const API_BASE = '/api/drive';
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```
