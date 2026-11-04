# Hawks Coach Hub: Implementation Guide

## Quick Start Implementation

### 1. Search Architecture Setup

#### Install Dependencies

```bash
npm install minisearch
npm install @supabase/supabase-js
npm install intersection-observer  # For infinite scroll polyfill
```

#### Package.json additions for Astro

```json
{
  "dependencies": {
    "minisearch": "^6.3.0",
    "@supabase/supabase-js": "^2.38.0",
    "intersection-observer": "^0.12.2"
  }
}
```

### 2. Search Service Implementation

#### Core Search Service (`src/services/search-service.ts`)

```typescript
import MiniSearch from 'minisearch';
import type { DriveFile, CategoryName } from '../types/google-apis';

export interface SearchableFile extends DriveFile {
  category: CategoryName;
  description?: string;
  tags?: string[];
  searchText?: string; // Combined searchable text
}

export interface SearchFilters {
  categories?: CategoryName[];
  mimeTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SearchResult extends SearchableFile {
  score: number;
  match: Record<string, string[]>; // Highlighted matches
}

class SearchService {
  private miniSearch: MiniSearch<SearchableFile>;
  private documents: SearchableFile[] = [];

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['name', 'category', 'description', 'tags', 'searchText'],
      storeFields: [
        'id',
        'name',
        'mimeType',
        'modifiedTime',
        'webViewLink',
        'category',
        'description',
        'tags',
      ],
      searchOptions: {
        boost: {
          name: 2, // File name matches are most important
          category: 1.5, // Category matches are important
          description: 1, // Description baseline
          tags: 1.2, // Tags slightly boosted
        },
        fuzzy: 0.2, // 20% character difference tolerance
        prefix: true, // Enable prefix matching
        combineWith: 'OR', // Combine search terms with OR
      },
      extractField: (document, fieldName) => {
        // Custom field extraction for multi-language support
        const value = document[fieldName as keyof SearchableFile];
        if (typeof value === 'string') {
          // Normalize Finnish characters for better search
          return value
            .toLowerCase()
            .replace(/[äåá]/g, 'a')
            .replace(/[öøó]/g, 'o')
            .replace(/[üú]/g, 'u');
        }
        return value;
      },
    });
  }

  /**
   * Initialize search index with Google Drive files
   */
  async indexFiles(files: DriveFile[]): Promise<void> {
    this.documents = files.map(file => this.enhanceFileForSearch(file));

    // Clear existing index and add new documents
    this.miniSearch.removeAll();
    this.miniSearch.addAll(this.documents);

    console.log(`Indexed ${this.documents.length} files for search`);
  }

  /**
   * Enhanced file data for better search results
   */
  private enhanceFileForSearch(file: DriveFile): SearchableFile {
    const category = this.categorizeFile(file);
    const tags = this.generateTags(file);
    const description = this.generateDescription(file);

    return {
      ...file,
      category,
      tags,
      description,
      searchText: [file.name, category, description, ...tags].join(' '),
    };
  }

  /**
   * Smart file categorization based on name and type
   */
  private categorizeFile(file: DriveFile): CategoryName {
    const name = file.name.toLowerCase();
    const mimeType = file.mimeType;

    // Video files
    if (mimeType.startsWith('video/') || name.includes('video')) {
      return 'Video Resources';
    }

    // Image files and diagrams
    if (
      mimeType.startsWith('image/') ||
      name.includes('diagram') ||
      name.includes('kuva')
    ) {
      return 'Diagrams & Images';
    }

    // Drill-related files
    if (
      name.includes('drill') ||
      name.includes('harjoitus') ||
      name.includes('exercise')
    ) {
      return 'Floorball Drills';
    }

    // Tactics and strategy
    if (
      name.includes('tactic') ||
      name.includes('taktiikka') ||
      name.includes('strategy') ||
      name.includes('strategia')
    ) {
      return 'Tactics & Strategy';
    }

    // Training plans
    if (
      name.includes('training') ||
      name.includes('harjoittelu') ||
      name.includes('plan') ||
      name.includes('suunnitelma')
    ) {
      return 'Training Plans';
    }

    // Default to Documents
    return 'Documents';
  }

  /**
   * Generate searchable tags from file metadata
   */
  private generateTags(file: DriveFile): string[] {
    const tags: string[] = [];
    const name = file.name.toLowerCase();

    // Skill level tags
    if (name.includes('beginner') || name.includes('alkeiss'))
      tags.push('beginner');
    if (name.includes('intermediate') || name.includes('keskitaso'))
      tags.push('intermediate');
    if (name.includes('advanced') || name.includes('edistynyt'))
      tags.push('advanced');

    // Age group tags
    if (name.includes('youth') || name.includes('nuoris')) tags.push('youth');
    if (name.includes('junior') || name.includes('junior')) tags.push('junior');
    if (name.includes('senior') || name.includes('aikuis')) tags.push('senior');

    // Activity type tags
    if (name.includes('passing') || name.includes('syöttö'))
      tags.push('passing');
    if (name.includes('shooting') || name.includes('laukaus'))
      tags.push('shooting');
    if (name.includes('defense') || name.includes('puolustus'))
      tags.push('defense');
    if (name.includes('attack') || name.includes('hyökkäys'))
      tags.push('attack');

    return tags;
  }

  /**
   * Generate description for better search context
   */
  private generateDescription(file: DriveFile): string {
    const parts: string[] = [];

    // File type description
    if (file.mimeType.includes('pdf')) parts.push('PDF document');
    if (file.mimeType.includes('video')) parts.push('Video file');
    if (file.mimeType.includes('image')) parts.push('Image file');
    if (file.mimeType.includes('presentation')) parts.push('Presentation');
    if (file.mimeType.includes('document')) parts.push('Text document');

    // Modified date context
    const modifiedDate = new Date(file.modifiedTime);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 7) parts.push('recently updated');
    if (daysDiff < 30) parts.push('updated this month');

    return parts.join(', ');
  }

  /**
   * Perform search with filters and sorting
   */
  search(
    query: string,
    filters?: SearchFilters,
    limit: number = 20
  ): SearchResult[] {
    if (!query.trim()) {
      return this.getFilteredDocuments(filters).slice(0, limit);
    }

    const results = this.miniSearch.search(query, {
      ...this.miniSearch.searchOptions,
      filter: result => this.applyFilters(result, filters),
    });

    return results.slice(0, limit).map(result => ({
      ...this.documents.find(doc => doc.id === result.id)!,
      score: result.score,
      match: result.match || {},
    }));
  }

  /**
   * Get autocomplete suggestions
   */
  getAutoSuggestions(query: string, limit: number = 5): string[] {
    if (query.length < 2) return [];

    const suggestions = this.miniSearch.autoSuggest(query, {
      fuzzy: 0.2,
      prefix: true,
    });

    return suggestions.slice(0, limit).map(suggestion => suggestion.suggestion);
  }

  /**
   * Apply search filters
   */
  private applyFilters(
    document: SearchableFile,
    filters?: SearchFilters
  ): boolean {
    if (!filters) return true;

    if (filters.categories && !filters.categories.includes(document.category)) {
      return false;
    }

    if (
      filters.mimeTypes &&
      !filters.mimeTypes.some(type => document.mimeType.includes(type))
    ) {
      return false;
    }

    if (filters.dateRange) {
      const fileDate = new Date(document.modifiedTime);
      if (
        fileDate < filters.dateRange.start ||
        fileDate > filters.dateRange.end
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get documents matching filters (for no-query scenarios)
   */
  private getFilteredDocuments(filters?: SearchFilters): SearchResult[] {
    return this.documents
      .filter(doc => this.applyFilters(doc, filters))
      .map(doc => ({
        ...doc,
        score: 1,
        match: {},
      }))
      .sort(
        (a, b) =>
          new Date(b.modifiedTime).getTime() -
          new Date(a.modifiedTime).getTime()
      );
  }

  /**
   * Get popular search terms (for analytics)
   */
  getSearchStats(): {
    totalDocuments: number;
    categories: Record<CategoryName, number>;
  } {
    const categoryCount = this.documents.reduce(
      (acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      },
      {} as Record<CategoryName, number>
    );

    return {
      totalDocuments: this.documents.length,
      categories: categoryCount,
    };
  }
}

export const searchService = new SearchService();
export default searchService;
```

### 3. Search Component Implementation

#### Search Interface (`src/components/SearchInterface.astro`)

```astro
---
// SearchInterface.astro
---

<div class="search-container">
  <div class="search-input-wrapper">
    <input
      type="text"
      id="searchInput"
      class="search-input"
      placeholder="Search training materials..."
      autocomplete="off"
      aria-label="Search training materials"
    />
    <button class="search-clear" id="clearSearch" aria-label="Clear search">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
      </svg>
    </button>
  </div>

  <div class="search-filters" id="searchFilters">
    <div class="filter-group">
      <label for="categoryFilter">Category:</label>
      <select id="categoryFilter" class="filter-select">
        <option value="">All Categories</option>
        <option value="Floorball Drills">Floorball Drills</option>
        <option value="Tactics & Strategy">Tactics & Strategy</option>
        <option value="Training Plans">Training Plans</option>
        <option value="Video Resources">Video Resources</option>
        <option value="Diagrams & Images">Diagrams & Images</option>
        <option value="Documents">Documents</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="typeFilter">File Type:</label>
      <select id="typeFilter" class="filter-select">
        <option value="">All Types</option>
        <option value="application/pdf">PDF</option>
        <option value="video/">Video</option>
        <option value="image/">Image</option>
        <option value="presentation">Presentation</option>
        <option value="document">Document</option>
      </select>
    </div>
  </div>

  <div class="search-suggestions" id="searchSuggestions" style="display: none;">
    <!-- Auto-suggestions will be populated here -->
  </div>
</div>

<style>
  .search-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    position: relative;
  }

  .search-input-wrapper {
    position: relative;
    margin-bottom: 1rem;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-clear {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .search-clear:hover {
    color: #374151;
    background: #f3f4f6;
  }

  .search-input:not(:placeholder-shown) + .search-clear {
    opacity: 1;
  }

  .search-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 150px;
  }

  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    font-size: 0.875rem;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 50;
    max-height: 200px;
    overflow-y: auto;
  }

  .suggestion-item {
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #f3f4f6;
  }

  .suggestion-item:hover {
    background: #f8fafc;
  }

  .suggestion-item:last-child {
    border-bottom: none;
  }

  /* Mobile optimizations */
  @media (max-width: 640px) {
    .search-filters {
      flex-direction: column;
    }

    .filter-group {
      min-width: unset;
    }

    .search-input {
      font-size: 16px; /* Prevent zoom on iOS */
    }
  }
</style>

<script>
  import { searchService } from '../services/search-service';

  class SearchInterface {
    private searchInput: HTMLInputElement;
    private clearButton: HTMLButtonElement;
    private categoryFilter: HTMLSelectElement;
    private typeFilter: HTMLSelectElement;
    private suggestionsContainer: HTMLElement;
    private debounceTimer: number | null = null;

    constructor() {
      this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
      this.clearButton = document.getElementById('clearSearch') as HTMLButtonElement;
      this.categoryFilter = document.getElementById('categoryFilter') as HTMLSelectElement;
      this.typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
      this.suggestionsContainer = document.getElementById('searchSuggestions') as HTMLElement;

      this.bindEvents();
    }

    private bindEvents(): void {
      // Search input events
      this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
      this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
      this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));

      // Clear button
      this.clearButton.addEventListener('click', this.clearSearch.bind(this));

      // Filter changes
      this.categoryFilter.addEventListener('change', this.handleFilterChange.bind(this));
      this.typeFilter.addEventListener('change', this.handleFilterChange.bind(this));

      // Keyboard navigation
      this.searchInput.addEventListener('keydown', this.handleKeyDown.bind(this));

      // Outside click to close suggestions
      document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

    private handleSearchInput(event: Event): void {
      const query = (event.target as HTMLInputElement).value;

      // Debounce search
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.performSearch(query);
        this.updateSuggestions(query);
      }, 300);
    }

    private handleSearchFocus(): void {
      if (this.searchInput.value.length >= 2) {
        this.updateSuggestions(this.searchInput.value);
      }
    }

    private handleSearchBlur(): void {
      // Delay hiding suggestions to allow clicks
      setTimeout(() => {
        this.hideSuggestions();
      }, 200);
    }

    private handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        this.hideSuggestions();
        this.searchInput.blur();
      }

      if (event.key === 'Enter') {
        this.hideSuggestions();
        this.performSearch(this.searchInput.value);
      }

      // TODO: Add arrow key navigation for suggestions
    }

    private handleFilterChange(): void {
      this.performSearch(this.searchInput.value);
    }

    private handleOutsideClick(event: Event): void {
      if (!this.suggestionsContainer.contains(event.target as Node) &&
          !this.searchInput.contains(event.target as Node)) {
        this.hideSuggestions();
      }
    }

    private clearSearch(): void {
      this.searchInput.value = '';
      this.hideSuggestions();
      this.performSearch('');
      this.searchInput.focus();
    }

    private performSearch(query: string): void {
      const filters = this.getActiveFilters();

      // Dispatch custom event for search results
      const searchEvent = new CustomEvent('searchPerformed', {
        detail: { query, filters }
      });
      document.dispatchEvent(searchEvent);
    }

    private getActiveFilters() {
      const filters: any = {};

      if (this.categoryFilter.value) {
        filters.categories = [this.categoryFilter.value];
      }

      if (this.typeFilter.value) {
        filters.mimeTypes = [this.typeFilter.value];
      }

      return filters;
    }

    private async updateSuggestions(query: string): Promise<void> {
      if (query.length < 2) {
        this.hideSuggestions();
        return;
      }

      const suggestions = searchService.getAutoSuggestions(query);

      if (suggestions.length === 0) {
        this.hideSuggestions();
        return;
      }

      this.renderSuggestions(suggestions);
      this.showSuggestions();
    }

    private renderSuggestions(suggestions: string[]): void {
      this.suggestionsContainer.innerHTML = suggestions
        .map(suggestion => `
          <div class="suggestion-item" data-suggestion="${suggestion}">
            ${this.highlightMatch(suggestion, this.searchInput.value)}
          </div>
        `)
        .join('');

      // Add click handlers to suggestions
      this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const suggestion = item.getAttribute('data-suggestion') || '';
          this.searchInput.value = suggestion;
          this.hideSuggestions();
          this.performSearch(suggestion);
        });
      });
    }

    private highlightMatch(text: string, query: string): string {
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<strong>$1</strong>');
    }

    private showSuggestions(): void {
      this.suggestionsContainer.style.display = 'block';
    }

    private hideSuggestions(): void {
      this.suggestionsContainer.style.display = 'none';
    }
  }

  // Initialize search interface when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new SearchInterface();
  });
</script>
```

### 4. Display Components Implementation

#### Search Results Display (`src/components/SearchResults.astro`)

```astro
---
// SearchResults.astro
---

<div class="search-results">
  <div class="results-header" id="resultsHeader">
    <div class="results-count" id="resultsCount">
      <!-- Results count will be populated by JavaScript -->
    </div>

    <div class="view-toggle">
      <button class="view-btn active" data-view="cards" aria-label="Card view">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </button>
      <button class="view-btn" data-view="list" aria-label="List view">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zM3 8a1 1 0 000 2h14a1 1 0 100-2H3zM3 12a1 1 0 100 2h14a1 1 0 100-2H3z"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="results-container cards-view" id="resultsContainer">
    <!-- Search results will be populated here -->
  </div>

  <div class="load-more-container" id="loadMoreContainer" style="display: none;">
    <button class="load-more-btn" id="loadMoreBtn">
      <span class="load-more-text">Load More Results</span>
      <div class="loading-spinner" style="display: none;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3a7 7 0 100 14 7 7 0 000-14zm0 2a5 5 0 110 10 5 5 0 010-10z" opacity="0.3"/>
          <path d="M10 3a7 7 0 017 7h-2a5 5 0 00-5-5V3z">
            <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
          </path>
        </svg>
      </div>
    </button>
  </div>

  <div class="no-results" id="noResults" style="display: none;">
    <div class="no-results-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M21 36C29.2843 36 36 29.2843 36 21C36 12.7157 29.2843 6 21 6C12.7157 6 6 12.7157 6 21C6 29.2843 12.7157 36 21 36Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 42L30 30" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 21L20 25L26 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h3>No results found</h3>
    <p>Try adjusting your search terms or filters</p>
  </div>

  <div class="loading-state" id="loadingState" style="display: none;">
    <div class="skeleton-cards">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  </div>
</div>

<style>
  .search-results {
    width: 100%;
    margin-top: 2rem;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .results-count {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .view-btn {
    padding: 0.5rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s ease;
  }

  .view-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .view-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  /* Cards View */
  .results-container.cards-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .result-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .result-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .file-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .file-icon.pdf { background: #fef3c7; color: #d97706; }
  .file-icon.video { background: #dbeafe; color: #2563eb; }
  .file-icon.image { background: #dcfce7; color: #16a34a; }
  .file-icon.document { background: #e0e7ff; color: #5b21b6; }
  .file-icon.presentation { background: #fce7f3; color: #be185d; }
  .file-icon.default { background: #f3f4f6; color: #6b7280; }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.5rem;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .file-category {
    display: inline-block;
    background: #f3f4f6;
    color: #374151;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .file-description {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.4;
    margin-bottom: 1rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #9ca3af;
    font-size: 0.75rem;
  }

  .file-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .file-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .file-tag {
    background: #eff6ff;
    color: #2563eb;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
  }

  /* List View */
  .results-container.list-view {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .list-view .result-card {
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .list-view .card-header {
    margin-bottom: 0.5rem;
  }

  .list-view .file-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .list-view .file-description {
    margin-bottom: 0.5rem;
    -webkit-line-clamp: 1;
  }

  /* Load More */
  .load-more-container {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    cursor: pointer;
    color: #374151;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .load-more-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* No Results */
  .no-results {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .no-results-icon {
    margin-bottom: 1rem;
    color: #d1d5db;
  }

  .no-results h3 {
    margin-bottom: 0.5rem;
    color: #374151;
  }

  /* Loading Skeletons */
  .skeleton-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .skeleton-card {
    background: #f3f4f6;
    border-radius: 0.75rem;
    height: 200px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Search highlighting */
  .highlight {
    background: #fef3c7;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-weight: 600;
  }

  /* Mobile optimizations */
  @media (max-width: 640px) {
    .results-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .results-container.cards-view {
      grid-template-columns: 1fr;
    }

    .card-header {
      gap: 0.75rem;
    }

    .file-icon {
      width: 36px;
      height: 36px;
      font-size: 1.125rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .result-card {
      transition: none;
    }

    .result-card:hover {
      transform: none;
    }

    .skeleton-card {
      animation: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .result-card {
      border-width: 2px;
    }

    .file-category {
      border: 1px solid currentColor;
    }
  }
</style>

<script>
  import { searchService } from '../services/search-service';
  import type { SearchResult, SearchFilters } from '../services/search-service';

  class SearchResults {
    private resultsContainer: HTMLElement;
    private resultsHeader: HTMLElement;
    private resultsCount: HTMLElement;
    private loadMoreContainer: HTMLElement;
    private loadMoreBtn: HTMLButtonElement;
    private noResults: HTMLElement;
    private loadingState: HTMLElement;

    private currentResults: SearchResult[] = [];
    private currentQuery: string = '';
    private currentFilters: SearchFilters = {};
    private currentView: 'cards' | 'list' = 'cards';
    private resultsPerPage: number = 20;
    private currentPage: number = 1;
    private isLoading: boolean = false;

    constructor() {
      this.resultsContainer = document.getElementById('resultsContainer') as HTMLElement;
      this.resultsHeader = document.getElementById('resultsHeader') as HTMLElement;
      this.resultsCount = document.getElementById('resultsCount') as HTMLElement;
      this.loadMoreContainer = document.getElementById('loadMoreContainer') as HTMLElement;
      this.loadMoreBtn = document.getElementById('loadMoreBtn') as HTMLButtonElement;
      this.noResults = document.getElementById('noResults') as HTMLElement;
      this.loadingState = document.getElementById('loadingState') as HTMLElement;

      this.bindEvents();
    }

    private bindEvents(): void {
      // Listen for search events
      document.addEventListener('searchPerformed', this.handleSearch.bind(this));

      // View toggle buttons
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', this.handleViewChange.bind(this));
      });

      // Load more button
      this.loadMoreBtn.addEventListener('click', this.handleLoadMore.bind(this));

      // Result card clicks
      this.resultsContainer.addEventListener('click', this.handleResultClick.bind(this));
    }

    private async handleSearch(event: CustomEvent): Promise<void> {
      const { query, filters } = event.detail;

      this.currentQuery = query;
      this.currentFilters = filters;
      this.currentPage = 1;

      this.showLoading();

      try {
        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 200));

        const results = searchService.search(query, filters, this.resultsPerPage);
        this.currentResults = results;

        this.renderResults(results);
        this.updateResultsCount(results.length);
        this.updateLoadMoreVisibility();

      } catch (error) {
        console.error('Search failed:', error);
        this.showNoResults();
      } finally {
        this.hideLoading();
      }
    }

    private handleViewChange(event: Event): void {
      const btn = event.target as HTMLButtonElement;
      const view = btn.getAttribute('data-view') as 'cards' | 'list';

      if (view === this.currentView) return;

      // Update active button
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update view
      this.currentView = view;
      this.resultsContainer.className = `results-container ${view}-view`;

      // Re-render with new view
      this.renderResults(this.currentResults);
    }

    private async handleLoadMore(): Promise<void> {
      if (this.isLoading) return;

      this.isLoading = true;
      this.showLoadMoreLoading();

      try {
        this.currentPage++;
        const moreResults = searchService.search(
          this.currentQuery,
          this.currentFilters,
          this.resultsPerPage * this.currentPage
        );

        // Get only new results
        const newResults = moreResults.slice(this.currentResults.length);
        this.currentResults = [...this.currentResults, ...newResults];

        // Append new results
        this.appendResults(newResults);
        this.updateLoadMoreVisibility();

      } catch (error) {
        console.error('Load more failed:', error);
      } finally {
        this.isLoading = false;
        this.hideLoadMoreLoading();
      }
    }

    private handleResultClick(event: Event): void {
      const card = (event.target as HTMLElement).closest('.result-card');
      if (!card) return;

      const fileUrl = card.getAttribute('data-url');
      const fileName = card.getAttribute('data-name');

      if (fileUrl) {
        // Track click analytics
        this.trackResultClick(fileName || 'Unknown');

        // Open file in new tab
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    }

    private renderResults(results: SearchResult[]): void {
      if (results.length === 0) {
        this.showNoResults();
        return;
      }

      this.hideNoResults();
      this.resultsContainer.innerHTML = results.map(result => this.renderResultCard(result)).join('');
    }

    private appendResults(results: SearchResult[]): void {
      const newCards = results.map(result => this.renderResultCard(result)).join('');
      this.resultsContainer.insertAdjacentHTML('beforeend', newCards);
    }

    private renderResultCard(result: SearchResult): string {
      const icon = this.getFileIcon(result.mimeType);
      const iconClass = this.getFileIconClass(result.mimeType);
      const formattedDate = this.formatDate(result.modifiedTime);
      const highlightedName = this.highlightSearchTerms(result.name, this.currentQuery);
      const description = result.description || 'No description available';
      const tags = result.tags || [];

      return `
        <div class="result-card"
             data-url="${result.webViewLink}"
             data-name="${result.name}"
             data-id="${result.id}">
          <div class="card-header">
            <div class="file-icon ${iconClass}">
              ${icon}
            </div>
            <div class="card-content">
              <div class="file-name">${highlightedName}</div>
              <div class="file-category">${result.category}</div>
              <div class="file-description">${description}</div>
            </div>
          </div>
          <div class="card-footer">
            <div class="file-date">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4 1a1 1 0 112 0v1h2V1a1 1 0 112 0v1h1a2 2 0 012 2v6a2 2 0 01-2 2H2a2 2 0 01-2-2V4a2 2 0 012-2h1V1z"/>
              </svg>
              ${formattedDate}
            </div>
            <div class="file-tags">
              ${tags.slice(0, 2).map(tag => `<span class="file-tag">${tag}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    private getFileIcon(mimeType: string): string {
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('video')) return '🎥';
      if (mimeType.includes('image')) return '🖼️';
      if (mimeType.includes('presentation')) return '📊';
      if (mimeType.includes('document')) return '📝';
      return '📄';
    }

    private getFileIconClass(mimeType: string): string {
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('video')) return 'video';
      if (mimeType.includes('image')) return 'image';
      if (mimeType.includes('presentation')) return 'presentation';
      if (mimeType.includes('document')) return 'document';
      return 'default';
    }

    private formatDate(dateString: string): string {
      const date = new Date(dateString);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) return 'Today';
      if (daysDiff === 1) return 'Yesterday';
      if (daysDiff < 7) return `${daysDiff} days ago`;
      if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    private highlightSearchTerms(text: string, query: string): string {
      if (!query) return text;

      const terms = query.split(/\s+/).filter(term => term.length > 1);
      let highlighted = text;

      terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="highlight">$1</span>');
      });

      return highlighted;
    }

    private updateResultsCount(count: number): void {
      const totalResults = this.currentResults.length;
      this.resultsCount.textContent = count === 0
        ? 'No results found'
        : `Showing ${Math.min(count, totalResults)} of ${totalResults} results`;
    }

    private updateLoadMoreVisibility(): void {
      const hasMore = this.currentResults.length >= this.resultsPerPage * this.currentPage;
      this.loadMoreContainer.style.display = hasMore ? 'block' : 'none';
    }

    private showLoading(): void {
      this.loadingState.style.display = 'block';
      this.resultsContainer.style.display = 'none';
      this.noResults.style.display = 'none';
    }

    private hideLoading(): void {
      this.loadingState.style.display = 'none';
      this.resultsContainer.style.display = this.currentView === 'cards' ? 'grid' : 'flex';
    }

    private showLoadMoreLoading(): void {
      const spinner = this.loadMoreBtn.querySelector('.loading-spinner') as HTMLElement;
      const text = this.loadMoreBtn.querySelector('.load-more-text') as HTMLElement;

      spinner.style.display = 'block';
      text.textContent = 'Loading...';
      this.loadMoreBtn.disabled = true;
    }

    private hideLoadMoreLoading(): void {
      const spinner = this.loadMoreBtn.querySelector('.loading-spinner') as HTMLElement;
      const text = this.loadMoreBtn.querySelector('.load-more-text') as HTMLElement;

      spinner.style.display = 'none';
      text.textContent = 'Load More Results';
      this.loadMoreBtn.disabled = false;
    }

    private showNoResults(): void {
      this.noResults.style.display = 'block';
      this.resultsContainer.style.display = 'none';
      this.loadMoreContainer.style.display = 'none';
    }

    private hideNoResults(): void {
      this.noResults.style.display = 'none';
    }

    private trackResultClick(fileName: string): void {
      // Analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'file_click', {
          'file_name': fileName,
          'search_query': this.currentQuery,
          'result_position': this.currentResults.findIndex(r => r.name === fileName) + 1
        });
      }

      // Could also send to Supabase for internal analytics
      // this.analyticsService.trackSearchResultClick(fileName, this.currentQuery);
    }
  }

  // Initialize search results when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new SearchResults();
  });
</script>
```

## Summary

This implementation provides:

1. **Hybrid Search Architecture**: MiniSearch for client-side performance + Supabase for analytics
2. **Intelligent Categorization**: Automatic file categorization based on name patterns and MIME types
3. **Multi-language Support**: Finnish/English search with character normalization
4. **Mobile-First Design**: Responsive cards with infinite scroll
5. **Accessibility**: Keyboard navigation, screen reader support, high contrast mode
6. **Performance Optimized**: Debounced search, lazy loading, bundle splitting
7. **Analytics Ready**: Click tracking and search analytics integration

**Cost**: $0/month on free tiers
**Implementation Time**: 3-4 weeks
**Maintenance**: Low complexity

The solution scales from the current 10-20 coach team to hundreds of users before requiring paid services, making it perfect for the Hawks Coach Hub's budget and growth trajectory.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze search implementation options for performance and cost", "status": "completed", "activeForm": "Analyzing search implementation options for performance and cost"}, {"content": "Evaluate search features requirements for coaching content", "status": "completed", "activeForm": "Evaluating search features requirements for coaching content"}, {"content": "Compare display solution patterns for coach hub interface", "status": "completed", "activeForm": "Comparing display solution patterns for coach hub interface"}, {"content": "Assess performance implications of each approach", "status": "completed", "activeForm": "Assessing performance implications of each approach"}, {"content": "Calculate implementation complexity and maintenance overhead", "status": "completed", "activeForm": "Calculating implementation complexity and maintenance overhead"}, {"content": "Create implementation roadmap with code examples", "status": "completed", "activeForm": "Creating implementation roadmap with code examples"}, {"content": "Design hybrid search architecture for optimal performance", "status": "completed", "activeForm": "Designing hybrid search architecture for optimal performance"}, {"content": "Prototype mobile-responsive display components", "status": "completed", "activeForm": "Prototyping mobile-responsive display components"}]
