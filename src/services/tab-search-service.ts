/**
 * Tab-Based Search Service
 * Implements search filtering by navigation tabs with folder constraints
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';
import { SearchService } from '@/utils/search';
import { enhancedSearch } from '@/utils/enhanced-search';
import {
  getFolderMappingsForTab,
  getRelevantFolderIds,
  getSearchKeywordsForTab,
  updateFolderMappingsWithRealIds,
} from '@/config/folder-mappings';

export interface TabSearchOptions {
  tabId: string;
  query: string;
  includeFolders?: boolean;
  includeStaticContent?: boolean;
  maxResults?: number;
}

export interface TabSearchResult {
  files: DriveFile[];
  folders: DriveFolder[];
  staticContent: any[];
  totalResults: number;
  searchScope: 'strict' | 'hybrid';
  appliedFilters: string[];
}

export class TabSearchService {
  private searchService: SearchService;
  private allFiles: DriveFile[] = [];
  private allFolders: DriveFolder[] = [];
  private isInitialized = false;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * Initialize the service with data from Google Drive
   */
  initialize(files: DriveFile[], folders: DriveFolder[]): void {
    this.allFiles = files;
    this.allFolders = folders;
    this.isInitialized = true;

    // Auto-update folder mappings with real IDs
    updateFolderMappingsWithRealIds(
      folders.map(f => ({ id: f.id, name: f.name, parents: f.parents || [] }))
    );

    console.debug(
      '🔍 Tab Search Service initialized with',
      files.length,
      'files and',
      folders.length,
      'folders'
    );
  }

  /**
   * Perform tab-specific search
   */
  async searchInTab(options: TabSearchOptions): Promise<TabSearchResult> {
    if (!this.isInitialized) {
      console.warn('⚠️ Tab Search Service not initialized');
      return this.createEmptyResult(options.tabId);
    }

    const config = getFolderMappingsForTab(options.tabId);
    if (!config) {
      console.warn(`⚠️ No configuration found for tab: ${options.tabId}`);
      return this.createEmptyResult(options.tabId);
    }

    // Get relevant folder IDs for this tab
    const relevantFolderIds = getRelevantFolderIds(
      options.tabId,
      this.allFolders.map(f => ({
        id: f.id,
        name: f.name,
        parents: f.parents || [],
      }))
    );

    // Filter files to only those in relevant folders
    const scopedFiles = this.filterFilesByFolders(relevantFolderIds);

    // Perform search within scoped files
    const searchResults = this.searchService.filterFilesBySearch(
      scopedFiles,
      options.query
    );

    // Apply keyword boosting for this tab
    const boostedResults = this.applyKeywordBoosting(
      searchResults,
      options.tabId,
      options.query
    );

    // Include folders if requested
    const folders = options.includeFolders
      ? this.searchFoldersInScope(relevantFolderIds, options.query)
      : [];

    // Include static content if tab supports it
    const staticContent =
      options.includeStaticContent && config.searchScope === 'hybrid'
        ? await this.searchStaticContent(options.tabId, options.query)
        : [];

    return {
      files: boostedResults.slice(0, options.maxResults || 50),
      folders,
      staticContent,
      totalResults:
        boostedResults.length + folders.length + staticContent.length,
      searchScope: config.searchScope,
      appliedFilters: [
        `tab:${options.tabId}`,
        `folders:${relevantFolderIds.length}`,
      ],
    };
  }

  /**
   * Filter files by folder IDs (including parent hierarchy)
   */
  private filterFilesByFolders(folderIds: string[]): DriveFile[] {
    if (folderIds.length === 0) return this.allFiles;

    return this.allFiles.filter(file => {
      if (!file.parents || file.parents.length === 0) return false;

      // Check if any of the file's parents are in our scope
      return file.parents.some(parentId => folderIds.includes(parentId));
    });
  }

  /**
   * Search folders within scope
   */
  private searchFoldersInScope(
    folderIds: string[],
    query: string
  ): DriveFolder[] {
    const scopedFolders = this.allFolders.filter(folder =>
      folderIds.includes(folder.id)
    );

    if (!query.trim()) return scopedFolders;

    const queryLower = query.toLowerCase();
    return scopedFolders.filter(folder =>
      folder.name.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Apply keyword boosting specific to the tab
   */
  private applyKeywordBoosting(
    files: DriveFile[],
    tabId: string,
    query: string
  ): DriveFile[] {
    const keywords = getSearchKeywordsForTab(tabId);
    if (keywords.length === 0) return files;

    const queryLower = query.toLowerCase();

    // Score files based on keyword matching
    const scoredFiles = files.map(file => {
      let score = 0;
      const fileName = file.name.toLowerCase();

      // Boost score for each matching keyword
      keywords.forEach(keyword => {
        if (fileName.includes(keyword.toLowerCase())) {
          score += 2; // Keyword match bonus
        }
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 1; // Query relevance bonus
        }
      });

      // Base relevance score (how well the query matches the filename)
      if (fileName.includes(queryLower)) {
        score += 5; // Direct query match
      }

      return { file, score };
    });

    // Sort by score (highest first) and return files
    return scoredFiles.sort((a, b) => b.score - a.score).map(item => item.file);
  }

  /**
   * Search static content for the tab
   */
  private async searchStaticContent(
    tabId: string,
    query: string
  ): Promise<any[]> {
    // For now, delegate to enhanced search for static content
    // This can be expanded when static content is fully implemented
    try {
      const results = await enhancedSearch.searchStaticContent(query);
      // Filter by tab category if possible
      return results.filter(
        (content: any) =>
          content.category &&
          this.isContentRelevantToTab(content.category, tabId)
      );
    } catch (error) {
      console.warn('Static content search not available:', error);
      return [];
    }
  }

  /**
   * Check if static content category is relevant to the tab
   */
  private isContentRelevantToTab(
    contentCategory: string,
    tabId: string
  ): boolean {
    const categoryMapping: Record<string, string[]> = {
      'sport-training': [
        'basic-skills',
        'passing',
        'shooting',
        'defense',
        'offense',
      ],
      fitness: ['fitness', 'conditioning', 'strength'],
      'game-situations': ['strategy', 'tactics', 'roles'],
      handbook: ['guide', 'theory', 'session', 'quick-ref'], // All categories for handbook
    };

    const relevantCategories = categoryMapping[tabId] || [];
    return relevantCategories.includes(contentCategory);
  }

  /**
   * Create empty result structure
   */
  private createEmptyResult(tabId: string): TabSearchResult {
    return {
      files: [],
      folders: [],
      staticContent: [],
      totalResults: 0,
      searchScope: 'hybrid',
      appliedFilters: [`tab:${tabId}`],
    };
  }

  /**
   * Get search statistics for a tab
   */
  getTabSearchStats(tabId: string): {
    availableFiles: number;
    availableFolders: number;
    scopedFolders: number;
    keywords: string[];
  } {
    if (!this.isInitialized) {
      return {
        availableFiles: 0,
        availableFolders: 0,
        scopedFolders: 0,
        keywords: [],
      };
    }

    const relevantFolderIds = getRelevantFolderIds(
      tabId,
      this.allFolders.map(f => ({
        id: f.id,
        name: f.name,
        parents: f.parents || [],
      }))
    );

    const scopedFiles = this.filterFilesByFolders(relevantFolderIds);
    const keywords = getSearchKeywordsForTab(tabId);

    return {
      availableFiles: scopedFiles.length,
      availableFolders: this.allFolders.length,
      scopedFolders: relevantFolderIds.length,
      keywords,
    };
  }

  /**
   * Debug: Get current folder mappings
   */
  debugGetFolderMappings(): Record<string, any> {
    const debug: Record<string, any> = {};

    ['handbook', 'sport-training', 'fitness', 'game-situations'].forEach(
      tabId => {
        const config = getFolderMappingsForTab(tabId);
        const stats = this.getTabSearchStats(tabId);

        debug[tabId] = {
          config,
          stats,
          relevantFolders: getRelevantFolderIds(
            tabId,
            this.allFolders.map(f => ({
              id: f.id,
              name: f.name,
              parents: f.parents || [],
            }))
          ),
        };
      }
    );

    return debug;
  }

  /**
   * Get all folder names for debugging
   */
  debugGetAllFolderNames(): Array<{
    id: string;
    name: string;
    parents?: string[];
  }> {
    return this.allFolders.map(f => ({
      id: f.id,
      name: f.name,
      parents: f.parents || [],
    }));
  }
}

// Export singleton instance
export const tabSearchService = new TabSearchService();
