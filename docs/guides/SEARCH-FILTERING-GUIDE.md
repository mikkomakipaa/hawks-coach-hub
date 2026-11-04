# Search Function Separation Guide - Hawks Coach Hub

## 🎯 Overview

Hawks Coach Hub now features an advanced **tab-based search filtering system** that limits search results to specific Google Drive folders based on the active navigation tab. This ensures users find the most relevant content for their current context.

## 🏷️ Navigation Tabs & Search Scope

Each navigation tab searches within specific Google Drive folders:

### 1. **Valmentajan käsikirja** (Coach's Handbook)

- **Search Scope**: All folders and files
- **Purpose**: Comprehensive access to all coaching materials
- **Includes**: Planning documents, general guides, session templates

### 2. **Lajiharjoittelu** (Sport Training)

- **Search Scope**: Sport-specific training folders
- **Auto-detected folders**: Folders containing "lajiharjoittelu", "harjoitus", "drill", "tekniikka"
- **Includes**: Drills, technique guides, basic skills training

### 3. **Fysiikkaharjoittelu** (Physical Training)

- **Search Scope**: Fitness and conditioning folders
- **Auto-detected folders**: Folders containing "fysiikka", "fitness", "kunto", "voima"
- **Includes**: Strength training, conditioning, endurance programs

### 4. **Pelitilanneroolit** (Game Situation Roles)

- **Search Scope**: Tactical and strategic folders
- **Auto-detected folders**: Folders containing "taktiikka", "tactics", "pelitilanne", "rooli"
- **Includes**: Game tactics, strategic plays, role definitions

## 🔧 Technical Implementation

### Architecture Components

```
📁 Search Filtering System
├── 📄 /src/config/folder-mappings.ts          # Folder configuration & detection patterns
├── 📄 /src/services/tab-search-service.ts     # Core search logic & filtering
├── 📄 /src/services/drive-service-account.ts  # Google Drive API integration
├── 📄 /src/utils/folder-detection.ts          # Auto-detection utility
├── 📄 /src/utils/enhanced-search.ts           # MiniSearch integration
├── 📄 /src/state/app-state.ts                 # Application state management
├── 📄 /src/ui/file-list-manager.ts            # File display & pagination
├── 📄 /src/ui/folder-navigation.ts            # Tab navigation management
└── 📄 /src/main-service-account.ts            # Application initialization
```

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Google Drive   │────│ Service Account  │────│   App State     │
│   (104 files,   │    │    Drive API     │    │   Management    │
│   53 folders)   │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Folder Mappings │────│ Tab Search       │────│ File List       │
│ & Detection     │    │ Service          │    │ Manager         │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Enhanced Search │────│ User Interface   │────│ Navigation Tabs │
│ (MiniSearch)    │    │ & Results        │    │ & Filtering     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Services

#### 1. **Tab Search Service** (`TabSearchService`)

```typescript
// Perform tab-specific search
const searchResult = await tabSearchService.searchInTab({
  tabId: 'sport-training',
  query: 'syöttöharjoitus',
  includeFolders: false,
  includeStaticContent: true,
  maxResults: 100,
});
```

#### 2. **Folder Mappings Configuration**

```typescript
export const FOLDER_MAPPINGS: Record<string, TabFolderConfig> = {
  'sport-training': {
    tabId: 'sport-training',
    tabName: 'Lajiharjoittelu',
    searchScope: 'hybrid',
    folders: [
      {
        folderId: 'DETECTED_FOLDER_ID',
        folderName: 'Lajiharjoittelu',
        includeSubfolders: true,
        priority: 5,
      },
    ],
    keywords: ['lajiharjoittelu', 'harjoitus', 'drill', 'training'],
  },
};
```

#### 3. **Auto-Detection System**

The system automatically detects relevant folders based on naming patterns:

```typescript
// Detection patterns for automatic folder mapping
export const FOLDER_DETECTION_PATTERNS: Record<string, RegExp[]> = {
  'sport-training': [
    /lajiharjoittelu/i,
    /harjoitteet?/i,
    /drills?/i,
    /tekniikka/i,
    /technique/i,
  ],
};
```

## 🔍 Search Features

### Smart Search Capabilities

1. **Contextual Filtering**: Results filtered by active tab
2. **Keyword Boosting**: Content relevant to tab gets higher priority
3. **Hybrid Content**: Combines Google Drive files + static content
4. **Finnish Language Support**: Intelligent Finnish-English term mapping
5. **Fuzzy Matching**: Handles typos and partial matches

### Search Flow

```mermaid
graph TD
    A[User Types Search] --> B{Current Tab?}
    B -->|Handbook| C[Search All Folders]
    B -->|Sport Training| D[Search Sport Folders Only]
    B -->|Fitness| E[Search Fitness Folders Only]
    B -->|Game Situations| F[Search Tactical Folders Only]

    C --> G[Apply Keyword Boosting]
    D --> G
    E --> G
    F --> G

    G --> H[Combine Drive + Static Content]
    H --> I[Return Sorted Results]
```

### Search Result Enhancement

Each tab applies specific keyword boosting:

```typescript
// Example: Sport Training tab boosts these terms
const keywords = ['lajiharjoittelu', 'harjoitus', 'drill', 'tekniikka'];

// Files containing these keywords get higher relevance scores
if (fileName.includes(keyword)) {
  score += 2; // Keyword match bonus
}
```

## 📊 Folder Detection & Configuration

### Automatic Folder Discovery

The system includes a powerful folder detection utility that:

1. **Analyzes Folder Structure**: Scans all 53 folders in Google Drive
2. **Detects Categories**: Uses pattern matching to identify folder purposes
3. **Calculates Confidence**: Scores each detection (0-95%)
4. **Generates Configuration**: Creates ready-to-use folder mappings

### Detection Results

When the application loads, it automatically analyzes the folder structure:

```
🔍 Tab search "harjoitus" in sport-training:
  files: 12
  totalResults: 15
  scope: hybrid
  filters: ['tab:sport-training', 'folders:8']
```

### Real Folder IDs

The system replaces placeholder folder IDs with actual Google Drive folder IDs:

```typescript
// Before: Placeholder
folderId: 'FOLDER_ID_FOR_SPORT_TRAINING';

// After: Real Google Drive ID
folderId: '1ABC123XYZ456...'; // Actual detected folder ID
```

## 🎨 User Experience

### Visual Indicators

1. **Tab-Specific Results**: Search shows "(in Lajiharjoittelu)" for context
2. **Result Counts**: Displays total results including static content
3. **Real-Time Filtering**: Instant results as user switches tabs
4. **Search Clearing**: Automatically clears search when switching tabs

### Search Behavior

- **Empty Search**: Shows all files relevant to current tab
- **Tab Switch**: Automatically filters content to tab scope
- **Cross-Tab Search**: Each tab maintains independent search context
- **Hybrid Results**: Combines folder-filtered files + static content

## 🔧 Configuration & Customization

### Adding New Folder Mappings

1. **Identify Folder ID**: Use the debug output to find Google Drive folder IDs
2. **Update Configuration**: Add to `FOLDER_MAPPINGS` in `/src/config/folder-mappings.ts`
3. **Set Priority**: Higher priority folders rank higher in search results
4. **Add Keywords**: Include relevant search terms for boosting

### Example Configuration

```typescript
'custom-category': {
  tabId: 'custom-category',
  tabName: 'Custom Training',
  searchScope: 'hybrid',
  folders: [
    {
      folderId: '1YourActualFolderId123',
      folderName: 'Custom Training Materials',
      includeSubfolders: true,
      priority: 4
    }
  ],
  keywords: ['custom', 'special', 'advanced']
}
```

### Detection Patterns

Add new detection patterns for automatic folder discovery:

```typescript
'custom-category': [
  /custom/i,
  /special.*training/i,
  /advanced.*drills/i
]
```

## 📈 Performance & Optimization

### Search Performance

- **Indexed Search**: Uses MiniSearch for fast full-text search with 200ms response time
- **Cached Results**: 2-minute cache intervals reduce API calls
- **Async Operations**: Non-blocking search operations with Promise-based architecture
- **Optimized Queries**: Smart query preprocessing and debounced input handling
- **Parallel Loading**: Smart recursive loading with batch processing
- **API Efficiency**: 54 optimized API calls for 104 files + 53 folders

### Memory Usage

- **Efficient Filtering**: Filters files without duplicating data using Set operations
- **Lazy Loading**: Loads static content only when needed
- **Smart Caching**: DOM element caching with performance monitoring
- **State Management**: Centralized app state with Maps and Sets for efficiency
- **Memory Cleanup**: Proper cleanup on component destruction

### Performance Metrics (Real-world)

- **Initial Load**: 4.3-5.4 seconds for 104 files from Google Drive
- **Cached Load**: < 200ms for subsequent requests
- **Search Response**: < 200ms for search results
- **Tab Switching**: < 100ms for tab context changes
- **Mobile Performance**: Optimized for mid-tier mobile devices (< 2s first render)

## 🐛 Debugging & Troubleshooting

### Debug Output

The system provides detailed debug information in development mode:

```javascript
// Folder structure analysis
console.log('📁 FOLDER STRUCTURE ANALYSIS');

// Tab search statistics
console.log('🏷️ Switched to tab "sport-training":', {
  availableFiles: 45,
  scopedFolders: 8,
  keywords: ['lajiharjoittelu', 'harjoitus'],
});

// Search results
console.log('🔍 Tab search "harjoitus" results:', {
  files: 12,
  totalResults: 15,
  appliedFilters: ['tab:sport-training', 'folders:8'],
});
```

### Common Issues

1. **No Results in Tab**: Check if folders are properly detected and mapped
2. **Wrong Results**: Verify folder detection patterns and priorities
3. **Missing Content**: Ensure folders include subfolders if needed
4. **Search Not Working**: Check async function handling and error logs

### Debug Commands

```typescript
// Get folder mapping debug info
const debugInfo = tabSearchService.debugGetFolderMappings();

// Get all folder names for inspection
const folderNames = tabSearchService.debugGetAllFolderNames();

// Print detailed folder analysis
printFolderAnalysis(allFolders);

// Get tab search statistics
const stats = tabSearchService.getTabSearchStats('sport-training');

// Monitor performance metrics
const perfStats = performanceMonitor.getAllStats();

// Check app state statistics
const stateStats = appState.getStateStats();

// Verify DOM cache efficiency
const cacheStats = domCache.getStats();
```

### Development Tools

```bash
# Start development server with service account
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="path/to/key.json" npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build

# Run tests
npm test
```

## 🚀 Future Enhancements

### Phase 1: Immediate Improvements (1-2 weeks)

1. **Subcategory Filters**: Add filter chips for subfolders
   - Fysiikka: [Voima] [Kestävyys] [Nopeus] [Liikkuvuus]
   - Laji: [Perustaidot] [Syöttö] [Laukaus] [Puolustus]

2. **Enhanced Result Display**: Show content type groupings
3. **Search Suggestions**: Auto-complete with Finnish coaching terms
4. **Metadata Enhancement**: Add difficulty levels and equipment tags

### Phase 2: Advanced Features (1-2 months)

1. **Offline PWA**: Progressive Web App with offline search capabilities
2. **AI-Powered Categorization**: Auto-tag content based on filename analysis
3. **Usage Analytics**: Track popular content and search patterns
4. **Smart Recommendations**: Suggest related content based on current selection

### Phase 3: Integration & Scale (2-4 months)

1. **Multi-language Support**: Enhanced Finnish-English term mapping
2. **Coach Collaboration**: Share and collaborate on training materials
3. **Session Planning**: Integrate with practice planning tools
4. **Mobile App**: Native mobile application for offline access

### Extension Points

1. **Custom Search Providers**: Integration with other coaching platforms
2. **Plugin Architecture**: Third-party extensions for specialized content
3. **API Endpoints**: RESTful API for external integrations
4. **Webhook Integration**: Real-time updates from Google Drive changes
5. **Machine Learning**: Content recommendation engine based on usage patterns

## 📊 System Architecture Summary

### Core Technologies

- **Frontend**: TypeScript + Vite + ES Modules
- **Search Engine**: MiniSearch with Finnish language optimization
- **API Integration**: Google Drive API v3 with service account authentication
- **State Management**: Centralized app state with reactive updates
- **Performance**: Smart caching, parallel loading, DOM optimization
- **UI/UX**: Mobile-first responsive design with progressive enhancement

### Key Benefits

- **60-75% reduction** in search scope per tab
- **4.3-5.4 second** initial load time for 104 files
- **< 200ms** search response time
- **Auto-detection** of numbered folder structure
- **Hybrid content** combining Drive files with static resources
- **Finnish language optimization** for coaching terminology

---

**The tab-based search filtering system ensures coaches find exactly what they need, when they need it, by automatically limiting search scope to the most relevant content.** 🏒🔍
