# Component Reference

**Project**: Hawks Coach Hub
**Last Updated**: 2026-11-05
**Purpose**: Document all TypeScript UI modules and their APIs

---

## Architecture Note

Hawks Coach Hub uses **vanilla TypeScript** — no React or other component framework. "Components" are TypeScript classes or module singletons that manage sections of the DOM directly.

---

## Services

### `ServiceAccountDriveService` (`src/services/drive-service-account.ts`)

Fetches files and folders from the Vercel API proxy. Manages client-side cache.

**Key methods**:

```typescript
class ServiceAccountDriveService {
  async loadAllFilesAndFolders(refresh?: boolean): Promise<AppData>;
  clearCache(): void;
}
```

**Caching**: In-memory, 5-minute TTL. `refresh=true` bypasses cache.

---

## Planned Planner/CMS Extension

The modules below define ownership for the structured drill catalog, coach planner, shared-session, and editor/import flows. They are additive to the existing Drive browser and should not weaken browse-mode performance or blur route boundaries documented in `docs/DATA_MODEL.md`.

Planner/CMS layering rules:

- `api/*` route handlers own HTTP parsing, auth enforcement, response codes, and mapping request/response payloads to repo-owned service interfaces.
- `src/services/*` own frontend API access, request shaping, client-side caching, optimistic state coordination, and conversion from transport DTOs into UI-facing view models when needed.
- `src/state/*` own in-memory planner/editor state and explicit state transitions. They do not call Airtable or encode vendor storage fields.
- `src/ui/*` own view orchestration, route-specific rendering, and event wiring.
- `src/components/*` own render primitives and field-level DOM output.
- Airtable-specific schema details belong only in backend repository or adapter modules. They must not appear in route handlers, frontend services, UI code, or shared domain types.

### Backend Planner/API Modules

### `DrillApiHandler` (`api/drills/*.js|ts`)

Owns public drill catalog and drill detail HTTP endpoints.

**Responsibilities**:

- Parse catalog filters and pagination from request query params
- Enforce anonymous-read versus editor-write policy
- Call backend drill services using repo-owned DTOs
- Return canonical `Drill` and `DrillAttachment` payloads defined by `docs/DATA_MODEL.md`

**Must not own**:

- Airtable table names, field IDs, linked-record parsing, or formula interpretation
- HTML rendering concerns
- Client-specific planner state

### `SessionApiHandler` (`api/sessions/*.js|ts`)

Owns authenticated coach planner save/load/update flows and shared-session publish/read endpoints.

**Responsibilities**:

- Resolve planner identity from auth/session middleware
- Validate session create/update/share payloads
- Enforce ownership and role checks for session mutation
- Return canonical `Session` and `SharedSessionView` payloads

**Must not own**:

- Airtable row layout or share-token storage details
- Planner UI totals calculations beyond basic input validation

### `ImportApiHandler` (`api/imports/*.js|ts`)

Owns editor/admin import queue, import-draft review, and publish actions.

**Responsibilities**:

- Enforce editor/admin authorization
- Accept import review decisions and publish commands
- Return canonical `DrillImportDraft` payloads and editor action results

### `PlannerRepository` and `StorageAdapters` (`api/_lib/planner/*.js|ts`)

Own the persistence boundary for structured planner/CMS data.

**Responsibilities**:

- Translate canonical domain entities to and from the temporary Airtable schema
- Hide record IDs, linked-record arrays, attachment column layouts, and formula fields from the rest of the app
- Expose neutral repository methods such as `listDrills`, `getDrillById`, `saveSession`, `publishImportDraft`

**Boundary rule**:

- If Postgres (Neon proposed) replaces Airtable later, these modules change first. Route handlers, shared domain types, and frontend services should not need contract redesign.

---

## Planned Frontend Services

### `DrillCatalogService` (`src/services/drill-catalog-service.ts`)

Owns drill catalog and drill detail fetching for anonymous and authenticated planner surfaces.

**Key methods**:

```typescript
class DrillCatalogService {
  async listDrills(query: DrillCatalogQuery): Promise<DrillCatalogPage>;
  async getDrill(drillIdOrSlug: string): Promise<DrillDetail>;
}
```

**Responsibilities**:

- Call the public drill API surface
- Normalize transport responses for planner views
- Keep filter/query handling frontend-friendly without encoding storage details

### `SessionPlannerService` (`src/services/session-planner-service.ts`)

Owns persisted planner session operations.

**Key methods**:

```typescript
class SessionPlannerService {
  async listSessions(): Promise<SessionSummary[]>;
  async getSession(sessionId: string): Promise<Session>;
  async createSession(input: SessionCreateInput): Promise<Session>;
  async updateSession(
    sessionId: string,
    input: SessionUpdateInput
  ): Promise<Session>;
  async createShareLink(sessionId: string): Promise<SessionShareResult>;
  async getSharedSession(shareId: string): Promise<SharedSessionView>;
}
```

**Responsibilities**:

- Keep planner-save and share-link calls behind one service boundary
- Coordinate retries or optimistic refresh without leaking HTTP details to UI managers

### `EditorDrillService` (`src/services/editor-drill-service.ts`)

Owns editor-only drill create/edit/publish workflows.

**Key methods**:

```typescript
class EditorDrillService {
  async createDraft(input: DrillDraftInput): Promise<Drill>;
  async updateDraft(drillId: string, input: DrillDraftInput): Promise<Drill>;
  async publishDrill(drillId: string): Promise<Drill>;
}
```

### `ImportReviewService` (`src/services/import-review-service.ts`)

Owns editor import queue and review actions.

**Key methods**:

```typescript
class ImportReviewService {
  async listDrafts(query?: ImportDraftQuery): Promise<DrillImportDraftPage>;
  async getDraft(draftId: string): Promise<DrillImportDraft>;
  async approveDraft(
    draftId: string,
    input: ImportApprovalInput
  ): Promise<Drill>;
  async rejectDraft(
    draftId: string,
    input: ImportRejectionInput
  ): Promise<DrillImportDraft>;
}
```

### `PlannerAuthService` (`src/services/planner-auth-service.ts`)

Owns planner/editor identity lookup for protected surfaces.

**Responsibilities**:

- Fetch current planner profile and role
- Centralize unauthorized/forbidden response handling for planner/editor routes
- Expose neutral `PlannerProfile` and `PlannerRole` contracts only

---

## Planned Planner/CMS State

### `PlannerSessionState` (`src/state/planner-session-state.ts`)

Owns mutable session-draft state for the planner builder.

**State examples**:

```typescript
interface PlannerSessionState {
  currentSession: Session | null;
  blocks: SessionBlockDraft[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  dirty: boolean;
}
```

**Responsibilities**:

- Track unsaved planner edits and totals inputs
- Support explicit reset, load, merge, and save-success transitions
- Remain based on canonical `Session`/`SessionBlock` contracts only

### `DrillCatalogState` (`src/state/drill-catalog-state.ts`)

Owns current drill query, result page, and selected drill detail cache.

### `EditorDraftState` (`src/state/editor-draft-state.ts`)

Owns draft form values, validation state, publish status, and import-review work state for editor routes.

**Boundary rule**:

- State modules may store request status, validation errors, and canonical planner entities.
- State modules must not store Airtable field names, record IDs, raw linked-record arrays, or adapter-specific metadata.

---

## Planned UI Managers

### `PlannerRouteManager` (`src/ui/planner-route-manager.ts`)

Owns top-level route resolution for `#/drills`, `#/plan`, `#/session/:shareId`, and `#/editor/*` shells.

**Responsibilities**:

- Choose the correct view manager by route namespace
- Keep browse-mode navigation separate from planner/editor surfaces

### `DrillCatalogView` (`src/ui/drill-catalog-view.ts`)

Owns coach-facing drill discovery UI.

**Responsibilities**:

- Render catalog filters, results, and drill detail transitions
- Delegate data loading to `DrillCatalogService`
- Delegate persistent session insertion actions to planner services/state

### `SessionPlannerView` (`src/ui/session-planner-view.ts`)

Owns session builder screens for `#/plan/new` and `#/plan/:id`.

**Responsibilities**:

- Bind planner form controls to `PlannerSessionState`
- Render block ordering, duration totals, save status, and share actions
- Avoid embedding raw fetch or persistence logic in view code

Temporary implementation note:

- Until persisted session editing lands, `src/ui/planner-draft-view.ts` provides the live builder for `#/plan/new` on top of `PlannerDraftState`.
- The current builder supports local metadata editing, block add/remove, up/down reorder controls, and inline "Tallennus tulossa" placeholders instead of server persistence.

### `SharedSessionView` (`src/ui/shared-session-view.ts`)

Owns read-only session rendering for share routes.

### `EditorDrillView` (`src/ui/editor-drill-view.ts`)

Owns authoring screens for new/edit drill routes.

**Responsibilities**:

- Render field groups, validation errors, publish controls, and attachment references
- Use `EditorDrillService` and `EditorDraftState`
- Keep storage adapter details out of the editor DOM layer

### `ImportReviewView` (`src/ui/import-review-view.ts`)

Owns import queue, draft review, and approval/rejection controls.

---

## Planned Planner/CMS Components

### `DrillCard` (`src/components/drill-card.ts`)

Renders a structured drill summary card for catalog and planner insertion flows.

### `SessionBlockEditor` (`src/components/session-block-editor.ts`)

Renders one editable session block row/card inside the planner builder.

### `SessionTotalsPanel` (`src/components/session-totals-panel.ts`)

Renders derived session totals and warnings from canonical planner state.

### `EditorDrillForm` (`src/components/editor-drill-form.ts`)

Renders drill field groups and inline validation messages for editor routes.

### `ImportDraftReviewPanel` (`src/components/import-draft-review-panel.ts`)

Renders normalized import-draft content for human review.

**Component rule**:

- Components receive canonical app data and callbacks.
- Components do not know whether persistence currently uses Airtable or later uses Postgres.

---

### `TabSearchService` (`src/services/tab-search-service.ts`)

Maps Drive folders to tabs and filters files by active tab.

**Key methods**:

```typescript
class TabSearchService {
  initialize(files: DriveFile[], folders: DriveFolder[]): void;
  getTabsFromFolders(folders: DriveFolder[]): TabConfig[];
  getFilesForTab(tabFolderId: string, allFiles: DriveFile[]): DriveFile[];
  searchInTab(query: string, tabFolderId: string): DriveFile[];
}
```

---

### `ContentManager` (`src/services/content-manager.ts`)

Tracks files selected for practice session export.

**Key methods**:

```typescript
class ContentManager {
  addFile(fileId: string): void;
  removeFile(fileId: string): void;
  toggleFile(fileId: string): boolean; // returns new selected state
  isSelected(fileId: string): boolean;
  getSelectedFiles(allFiles: DriveFile[]): DriveFile[];
  clearAll(): void;
  get count(): number;
}
```

---

## UI Managers

### `FileListManager` (`src/ui/file-list-manager.ts`)

Orchestrates the file list section: renders file cards, skeleton loaders, and status messages.

**Key methods**:

```typescript
class FileListManager {
  refresh(): void; // Re-render with current state
  showSkeletonLoading(): void; // Show placeholder cards
  hideSkeletonLoading(): void;
  updateStatus(msg: string, type: 'loading' | 'info' | 'error'): void;
  destroy(): void; // Clean up event listeners
}
```

**Renders**:

- File grid cards (via `FileDisplay`)
- Empty state message
- Error state message
- Skeleton loading cards

---

### `FolderNavigationManager` (`src/ui/folder-navigation.ts`)

Manages folder breadcrumb navigation and folder drill-down within a tab.

**Key methods**:

```typescript
class FolderNavigationManager {
  navigateTo(folderId: string | null): void; // null = tab root
  back(): void;
  getBreadcrumbs(): Array<{ id: string; name: string }>;
  destroy(): void;
}
```

---

## Components

### `FileDisplay` (`src/components/file-display.ts`)

Renders a single file card.

**Signature**:

```typescript
function renderFileCard(file: DriveFile, options: FileCardOptions): HTMLElement;

interface FileCardOptions {
  isSelected: boolean;
  onOpen: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  onToggleSelect: (file: DriveFile) => void;
}
```

**Card layout**:

```
┌─────────────────────────────────────┐
│ [PDF] Harjoitus 1.pdf               │
│ 200 KB · Muokattu 15.1.2026        │
│                        [Avaa] [⬇]  │
└─────────────────────────────────────┘
```

---

### `Toast` (`src/components/toast.ts`)

Shows transient notification messages.

**API**:

```typescript
function initializeToastContainer(): void;
function showToast(message: string, type?: 'success' | 'error' | 'info'): void;
```

**Usage**:

```typescript
showToast('Tiedosto avattu', 'success');
showToast('Virhe ladattaessa tiedostoa', 'error');
```

---

### `StaticContentDisplay` (`src/components/static-content-display.ts`)

Renders static information sections (e.g. welcome text, help content).

---

### `VirtualScroller` (`src/components/virtual-scroller.ts`)

Renders only visible file cards for large lists (100+ files). Improves scroll performance.

**API**:

```typescript
class VirtualScroller {
  constructor(container: HTMLElement, itemHeight: number);
  setItems(items: DriveFile[]): void;
  destroy(): void;
}
```

---

## Actions

### `FileActions` (`src/actions/file-actions.ts`)

Handles user interactions on files.

**API**:

```typescript
const fileActions = {
  openFile(file: DriveFile): void;      // Opens webViewLink in new tab
  downloadFile(file: DriveFile): void;  // Triggers download via webContentLink
  copyLink(file: DriveFile): Promise<void>; // Copies link to clipboard
};
```

---

## Utilities

### `AppState` (`src/state/app-state.ts`)

Global singleton holding all runtime state.

```typescript
const appState = {
  files: DriveFile[],
  folders: DriveFolder[],
  activeTab: string,
  activeFolderId: string | null,
  searchQuery: string,
  selectedFiles: Set<string>,
  folderCache: Map<string, DriveFile[]>,

  setFiles(files: DriveFile[]): void,
  setFolders(folders: DriveFolder[]): void,
  setActiveTab(tab: string): void,
  setActiveFolderId(id: string | null): void,
  setSearchQuery(q: string): void,
  updateFolderCache(): void,
};
```

---

### `EnhancedSearch` (`src/utils/enhanced-search.ts`)

MiniSearch-based full-text search over file names.

```typescript
const enhancedSearch = {
  indexFiles(files: DriveFile[]): void,
  search(query: string): DriveFile[],
  clear(): void,
};
```

---

### `DomCache` (`src/utils/dom-cache.ts`)

Caches frequently-accessed DOM elements to avoid repeated `querySelector` calls.

```typescript
const domCache = {
  get fileList(): HTMLElement,
  get searchInput(): HTMLInputElement,
  get statusBar(): HTMLElement,
  get tabContainer(): HTMLElement,
  invalidate(): void,
};
```

---

### `PerformanceMonitor` (`src/utils/performance-monitor.ts`)

Measures and logs performance of key operations.

```typescript
const performanceMonitor = {
  async measure<T>(category: string, name: string, fn: () => Promise<T>): Promise<T>,
  getMetrics(): PerformanceEntry[],
};
```

---

---

## Planner Modules (New — Phase 1)

### `DrillParser` (`src/services/drill-parser.ts`)

Detects drills from the Drive folder/file hierarchy. Runs client-side after Drive data loads.

```typescript
class DrillParser {
  parse(files: DriveFile[], folders: DriveFolder[]): Drill[];
  getGroups(folders: DriveFolder[]): string[]; // ["U12", "U14", "Yhteiset"]
  getDrillsForGroup(group: string): Drill[];
  isGroupFolder(folder: DriveFolder): boolean;
  isDrillFolder(folder: DriveFolder, files: DriveFile[]): boolean;
}
```

---

### `SessionStore` (`src/services/session-store.ts`)

Manages session persistence in localStorage.

```typescript
class SessionStore {
  save(session: Session): void;
  load(id: string): Session | null;
  list(): Session[];
  delete(id: string): void;
  saveDraft(session: Session): void;
  loadDraft(): Session | null;
  clearDraft(): void;
}
```

---

### `SessionExporter` (`src/services/session-exporter.ts`)

Generates downloadable outputs from a session.

```typescript
class SessionExporter {
  toJSON(session: Session): string; // Structured JSON string
  downloadJSON(session: Session): void; // Triggers browser download
  openPrintView(session: Session): void; // Opens print-friendly view
}
```

---

### `DriveExporter` (`src/services/drive-exporter.ts`)

Exports current Drive structure as structured JSON.

```typescript
class DriveExporter {
  generate(files: DriveFile[], folders: DriveFolder[]): DriveExport;
  download(files: DriveFile[], folders: DriveFolder[]): void; // Triggers browser download
}
```

---

### `SessionBuilderUI` (`src/ui/session-builder.ts`)

Orchestrates the two-panel session builder interface.

```typescript
class SessionBuilderUI {
  mount(container: HTMLElement, session: Session): void;
  destroy(): void;

  // Events emitted:
  // 'block:add' — drill added to session
  // 'block:remove' — block removed
  // 'block:reorder' — blocks reordered
  // 'session:save' — save requested
  // 'session:print' — print requested
  // 'session:export' — JSON export requested
}
```

---

### `DrillLibraryUI` (`src/ui/drill-library.ts`)

Left panel of the session builder — browsable drill list.

```typescript
class DrillLibraryUI {
  mount(container: HTMLElement): void;
  setGroup(group: string): void;
  setQuery(q: string): void;
  onDrillSelect(callback: (drill: Drill) => void): void;
  destroy(): void;
}
```

---

### `DrillCard` (`src/components/drill-card.ts`)

Renders a single drill in the library panel.

```
┌──────────────────────────────────┐
│ [diagram image or placeholder]   │
│ Kulmataistelu                    │
│ Laukaukset                       │
│              [+ Lisää sessioon]  │
└──────────────────────────────────┘
```

---

### `DrillDetailPanel` (`src/components/drill-detail.ts`)

Slide-in panel showing full drill info (diagram + instructions link + add-to-session).

---

### `SessionBlockList` (`src/components/session-block-list.ts`)

Right panel — renders ordered session blocks with drag-to-reorder and inline duration editing.

---

### `SessionPlanView` (`src/components/session-plan-view.ts`)

Read-only, print-optimized view of a complete session plan. Used for print and (Phase 2) shared session links.

---

### `HashRouter` (`src/utils/hash-router.ts`)

Minimal hash-based router. No library dependency.

```typescript
class HashRouter {
  on(pattern: string, handler: (params: Record<string, string>) => void): void;
  navigate(path: string): void;
  start(): void;
}
// Usage:
// router.on('#/plan/:id', ({ id }) => loadSession(id));
// router.on('#/', () => showBrowseMode());
```

---

## Shared UI Component Library (`src/components/ui/`)

Typed factory functions used across browse mode, planner, and editor surfaces.
**See `docs/COMPONENT_LIBRARY.md` for full documentation.**

| Component              | File              | Purpose                                                                    |
| ---------------------- | ----------------- | -------------------------------------------------------------------------- |
| `createButton`         | `button.ts`       | All interactive buttons — primary, secondary, ghost, danger; loading state |
| `createBadge`          | `badge.ts`        | Inline status/type labels — semantic variants + file-type colours          |
| `createEmptyState`     | `empty-state.ts`  | Centered placeholder for empty results, errors, no-content                 |
| `createLoadingSpinner` | `spinner.ts`      | Animated inline indicator for pending states                               |
| `createSkeletonItem`   | `skeleton.ts`     | Animated placeholder while list items load                                 |
| `createInlineAlert`    | `inline-alert.ts` | Contextual feedback banner (info / warning / error / success)              |
| `createModal`          | `modal.ts`        | Focus-trapped dialog overlay (ESC + click-outside closes)                  |
| `createFormField`      | `form-field.ts`   | Label + input + hint/error wrapper                                         |
| `createCard`           | `card.ts`         | Base card container — static or interactive (renders as button)            |
| `createMetaList`       | `meta-list.ts`    | Key-value pair `<dl>` 2-column grid                                        |

Import from the barrel: `import { createButton, createBadge } from '@/components/ui';`

Design rules:

- No `innerHTML` — all text via `.textContent`
- All return `HTMLElement` (never a string)
- Finnish `aria-label` defaults for interactive elements

---

## Naming Conventions

- **Services**: PascalCase classes in `src/services/`
- **UI Managers**: PascalCase classes in `src/ui/`
- **Components**: camelCase render functions in `src/components/`
- **Shared UI primitives**: `create{Name}` factory functions in `src/components/ui/`
- **Utils**: camelCase singletons or functions in `src/utils/`
- **State**: `appState` singleton in `src/state/`

## Adding a New Component

1. Create file in appropriate folder (`services/`, `ui/`, `components/`, `utils/`)
2. Export class or singleton (not default exports)
3. Import in `main-service-account.ts` if needed at startup
4. Add entry to this document
5. Write unit test in same directory with `.test.ts` suffix

For shared UI primitives:

1. Create `src/components/ui/{name}.ts`
2. Add re-export to `src/components/ui/index.ts`
3. Add CSS block to `styles-minimal.css` under the UI Component Library section
4. Write Vitest tests including XSS safety check
5. Add section to `docs/COMPONENT_LIBRARY.md`
