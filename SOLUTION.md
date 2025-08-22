# Hawks Coach Hub - Solution Description

## Use Cases

### Primary Actors & Workflows

**1. Coach/Trainer → Browse Training Materials**

- **Trigger**: Needs specific drill or tactic for upcoming practice
- **Happy Path**: Opens app → Authenticates with Google → Selects relevant folder (e.g., "Defensive Drills") → Views all materials in folder tree → Downloads/opens needed files
- **Alt Path**: Uses search to find materials across all folders → Filters results → Accesses content
- **Data Touched**: Google Drive folders, files metadata, user authentication
- **Success Metric**: <30s to find and access target training material

**2. Coach → Organize Training Content**

- **Trigger**: Preparing season training program or specific practice session
- **Happy Path**: Browses folder hierarchy → Explores nested categories (Beginner/Intermediate/Advanced) → Reviews file counts to assess material volume → Opens Google Drive to reorganize if needed
- **Alt Path**: Searches by keywords → Discovers related materials → Uses external links to manage in Google Drive
- **Data Touched**: Folder structure, file counts, metadata
- **Success Metric**: Complete overview of available materials in <60s

**3. Team Administrator → Access Control**

- **Trigger**: New coach joins team or permissions need updating
- **Happy Path**: Google Drive admin shares folders → New user authenticates → Gains access to authorized training materials
- **Alt Path**: Troubleshooting access issues through Google OAuth flow
- **Data Touched**: Google OAuth tokens, Drive permissions
- **Success Metric**: Successful authentication and content access within 2 attempts

## High-Level Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │────│  Google APIs    │────│  Google Drive   │
│  (TypeScript)   │    │   (OAuth +      │    │   (Content)     │
│                 │    │    Drive API)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         │ Vite Dev/Build
         ▼
┌─────────────────┐
│   Static Host   │
│ (Vercel/Netlify)│
└─────────────────┘
```

### Component Architecture

```
├── Authentication Layer (Google OAuth 2.0)
├── API Integration (Drive API v3)
├── State Management (In-memory reactive state)
├── UI Components
│   ├── Folder Browser (Hierarchical navigation)
│   ├── File Display (Grid/list views)
│   ├── Search Interface (Real-time filtering)
│   └── Status/Toast Notifications
└── Utilities (DOM helpers, caching, debouncing)
```

### Technical Architecture Details

**Data Flow:**

1. **Authentication**: Google OAuth 2.0 → Token acquisition → API initialization
2. **Content Loading**: Parallel fetch (files + folders) → Cache building → Hierarchy construction
3. **User Interaction**: Folder selection → Recursive content aggregation → UI updates
4. **Real-time Features**: Search debouncing → Live filtering → Status updates

**Key Design Decisions:**

| Decision                     | Rationale                                                     | Trade-offs                                    |
| ---------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| **Client-side only**         | No backend infrastructure needed, leverages Google's security | Limited to browser CORS policies              |
| **Recursive folder display** | Complete content visibility for training planning             | Higher memory usage, complex state management |
| **In-memory caching**        | Fast UI responsiveness for folder navigation                  | Data refresh required on page reload          |
| **TypeScript + ES modules**  | Type safety, modern development experience                    | Build complexity, larger initial bundle       |
| **Vite build system**        | Fast HMR during development, optimized production builds      | Node.js dependency for development            |

## Implementation Overview

### Core Services & Responsibilities

**1. DriveApiService** (`src/services/drive-api.ts`)

- Google Drive API integration
- File/folder fetching with parallel loading
- OAuth token management
- Error handling and retry logic

**2. FolderBrowserService** (`src/components/folder-browser.ts`)

- Hierarchical folder tree construction
- Recursive file counting and content aggregation
- DOM element generation for folder navigation
- Expansion state management

**3. SearchService** (`src/utils/search.ts`)

- Real-time search with debouncing (300ms)
- Multi-field filtering (name, description, categories)
- Folder-scoped search capability

**4. FileDisplayService** (`src/services/file-display.ts`)

- File rendering with category badges
- Responsive grid/list layouts
- Download and external link handling

### State Management

```typescript
interface AppState {
  // Authentication
  tokenClient: TokenClient | null;
  gapiInited: boolean;
  gisInited: boolean;
  accessToken: string;

  // Content
  allFiles: DriveFile[];
  filteredFiles: DriveFile[];
  allFolders: DriveFolder[];
  folderCache: Map<string, DriveFolder>;

  // UI State
  currentFolderFilter: string | null;
  expandedFolders: Set<string>;
}
```

### Key Features Implemented

**✅ Folder Browser Enhancement**

- Auto-expansion of selected folders showing sub-structure
- Recursive file inclusion (folder + all subfolders)
- Persistent expansion state across interactions
- Visual hierarchy with left borders and proper indentation

**✅ Performance Optimizations**

- Parallel API calls for files and folders
- Debounced search to prevent excessive filtering
- In-memory caching with recursive file count calculation
- Efficient DOM updates using event delegation

**✅ User Experience**

- Responsive design (mobile-first approach)
- Toast notifications for user feedback
- Loading states and skeleton screens
- Comprehensive error handling with user-friendly messages

## Security & Compliance

**Authentication Security**

- Google OAuth 2.0 with PKCE flow
- Client-side credential management (no server-side secrets)
- Automatic token refresh handling
- Scope limitation to read-only Drive access

**Data Privacy**

- No server-side data storage
- Client-side only processing
- Google Drive permissions respected
- No telemetry or analytics tracking

## Performance Targets

| Metric               | Target               | Current Implementation                             |
| -------------------- | -------------------- | -------------------------------------------------- |
| **Initial Load**     | <2s first render     | Optimized with parallel API calls                  |
| **Folder Selection** | <500ms response      | In-memory cache + efficient DOM updates            |
| **Search Response**  | <200ms filter update | Debounced search (300ms) with fast local filtering |
| **Bundle Size**      | <200KB gzipped       | TypeScript + Vite optimization                     |

## Deployment & Operations

**Build Pipeline**

- GitHub Actions CI/CD with automated testing
- ESLint + Prettier code quality gates
- TypeScript strict mode compilation
- Automated Vercel deployment on push

**Monitoring**

- Client-side error boundary with toast notifications
- Console logging for development debugging
- Google API quota monitoring through usage patterns

---

**Solution Status**: ✅ **Production Ready**

- Comprehensive folder browser with recursive content display
- Modern TypeScript architecture following CLAUDE.md guidelines
- Responsive design with mobile support
- Robust error handling and user feedback systems
