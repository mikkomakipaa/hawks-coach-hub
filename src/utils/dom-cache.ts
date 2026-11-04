/**
 * DOM Cache Manager
 * Prevents repeated DOM queries for performance optimization
 * Provides cached references to frequently accessed DOM elements
 */

export interface DOMCache {
  // Search elements
  searchInput: HTMLInputElement | null;
  refreshButton: HTMLButtonElement | null;
  filesList: HTMLDivElement | null;
  
  // Status elements
  totalFiles: HTMLElement | null;
  totalFolders: HTMLElement | null;
  currentViewCount: HTMLElement | null;
  fileCount: HTMLElement | null;
  loadingStatus: HTMLElement | null;
  loadingText: HTMLElement | null;
  
  // Navigation elements
  folderChipsBar: HTMLElement | null;
  folderChips: HTMLElement | null;
  
  // Pagination elements
  paginationInfo: HTMLElement | null;
  paginationControls: HTMLElement | null;
  prevPage: HTMLButtonElement | null;
  nextPage: HTMLButtonElement | null;
  
  // Session planning elements
  sessionPlanningBar: HTMLElement | null;
  sessionCount: HTMLElement | null;
  sessionMaterialsList: HTMLElement | null;
}

class DOMCacheManager {
  private cache: DOMCache;
  private initialized = false;

  constructor() {
    this.cache = this.createEmptyCache();
  }

  private createEmptyCache(): DOMCache {
    return {
      // Search elements
      searchInput: null,
      refreshButton: null,
      filesList: null,
      
      // Status elements
      totalFiles: null,
      totalFolders: null,
      currentViewCount: null,
      fileCount: null,
      loadingStatus: null,
      loadingText: null,
      
      // Navigation elements
      folderChipsBar: null,
      folderChips: null,
      
      // Pagination elements
      paginationInfo: null,
      paginationControls: null,
      prevPage: null,
      nextPage: null,
      
      // Session planning elements
      sessionPlanningBar: null,
      sessionCount: null,
      sessionMaterialsList: null,
    };
  }

  /**
   * Initialize the DOM cache by querying all elements once
   */
  initialize(): void {
    if (this.initialized) {
      //console.warn('DOM cache already initialized');
      return;
    }

    //console.log('🔧 Initializing DOM cache...');
    
    // Search elements
    this.cache.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.cache.refreshButton = document.getElementById('refreshButton') as HTMLButtonElement;
    this.cache.filesList = document.getElementById('allFilesList') as HTMLDivElement;
    
    // Status elements
    this.cache.totalFiles = document.getElementById('totalFiles');
    this.cache.totalFolders = document.getElementById('totalFolders');
    this.cache.currentViewCount = document.getElementById('currentViewCount');
    this.cache.fileCount = document.getElementById('fileCount');
    this.cache.loadingStatus = document.getElementById('loadingStatus');
    
    // Loading text inside loading status
    if (this.cache.loadingStatus) {
      this.cache.loadingText = this.cache.loadingStatus.querySelector('.loading-text');
    }
    
    // Navigation elements
    this.cache.folderChipsBar = document.getElementById('folderChipsBar');
    this.cache.folderChips = document.getElementById('folderChips');
    
    // Pagination elements
    this.cache.paginationInfo = document.getElementById('paginationInfo');
    this.cache.paginationControls = document.getElementById('paginationControls');
    this.cache.prevPage = document.getElementById('prevPage') as HTMLButtonElement;
    this.cache.nextPage = document.getElementById('nextPage') as HTMLButtonElement;
    
    // Session planning elements
    this.cache.sessionPlanningBar = document.getElementById('session-planning-bar');
    this.cache.sessionCount = document.getElementById('session-count');
    this.cache.sessionMaterialsList = document.getElementById('session-materials-list');

    this.initialized = true;
    
    // Log which elements were found for debugging
    const missingElements = Object.entries(this.cache)
      .filter(([_key, element]) => element === null)
      .map(([key]) => key);

    // Development logging (commented for production)
    // console.log(`✅ DOM cache initialized: ${Object.keys(this.cache).length - missingElements.length} elements found`);
    if (missingElements.length > 0) {
      //console.warn(`⚠️ Missing DOM elements: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Get a cached DOM element by key
   */
  get<K extends keyof DOMCache>(key: K): DOMCache[K] {
    if (!this.initialized) {
      //console.warn('DOM cache not initialized, initializing now...');
      this.initialize();
    }
    
    return this.cache[key];
  }

  /**
   * Refresh a specific element in the cache
   * Useful if DOM elements are dynamically added/removed
   */
  refresh<K extends keyof DOMCache>(key: K, selector: string): void {
    const element = document.querySelector(selector) as DOMCache[K];
    this.cache[key] = element;
    
    if (element) {
      //console.log(`🔄 Refreshed DOM cache for: ${key}`);
    } else {
      //console.warn(`⚠️ Could not find element for: ${key} (${selector})`);
    }
  }

  /**
   * Clear the cache and reinitialize
   * Useful after major DOM changes
   */
  reset(): void {
    //console.log('🔄 Resetting DOM cache...');
    this.cache = this.createEmptyCache();
    this.initialized = false;
    this.initialize();
  }

  /**
   * Check if an element exists in cache and is still in DOM
   */
  isValid<K extends keyof DOMCache>(key: K): boolean {
    const element = this.cache[key];
    if (!element) return false;
    
    // Check if element is still in DOM
    return document.contains(element as Node);
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getStats(): { total: number; found: number; missing: number; invalid: number } {
    const total = Object.keys(this.cache).length;
    const found = Object.values(this.cache).filter(el => el !== null).length;
    const missing = total - found;
    
    // Check for invalid elements (no longer in DOM)
    const invalid = Object.entries(this.cache)
      .filter(([key, element]) => element !== null && !this.isValid(key as keyof DOMCache))
      .length;

    return { total, found, missing, invalid };
  }
}

// Export singleton instance
export const domCache = new DOMCacheManager();

// Type is already exported at the top of the file