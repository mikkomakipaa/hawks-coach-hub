/**
 * Search and filtering utilities - Legacy support + Enhanced integration
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';
import { enhancedSearch, type SearchResult } from './enhanced-search';

export class SearchService {
  /**
   * Enhanced search with fallback to basic search
   */
  filterFilesBySearch(files: DriveFile[], searchTerm: string): DriveFile[] {
    if (!searchTerm.trim()) {
      return files;
    }

    // Try enhanced search first
    try {
      const results = enhancedSearch.search(searchTerm);
      if (results.length > 0) {
        return results as DriveFile[];
      }
    } catch (error) {
      console.warn('Enhanced search failed, using fallback:', error);
    }

    // Fallback to basic search
    const term = searchTerm.toLowerCase().trim();
    return files.filter(file => file.name.toLowerCase().includes(term));
  }

  /**
   * Enhanced search with ranking and metadata
   */
  searchWithRanking(searchTerm: string): SearchResult[] {
    return enhancedSearch.search(searchTerm);
  }

  /**
   * Filter files by folder
   */
  filterFilesByFolder(
    files: DriveFile[],
    folderId: string | null,
    folderCache: Map<string, DriveFolder>
  ): DriveFile[] {
    if (!folderId) {
      return files;
    }

    const folderData = folderCache.get(folderId);
    return folderData ? folderData.files || [] : [];
  }

  /**
   * Combined search and folder filtering
   */
  filterFiles(
    allFiles: DriveFile[],
    searchTerm: string,
    folderId: string | null,
    folderCache: Map<string, DriveFolder>
  ): DriveFile[] {
    let baseFiles = allFiles;

    // First apply folder filter if active
    if (folderId) {
      baseFiles = this.filterFilesByFolder(allFiles, folderId, folderCache);
    }

    // Then apply search filter
    return this.filterFilesBySearch(baseFiles, searchTerm);
  }

  /**
   * Debounce function for search input
   */
  // eslint-disable-next-line no-unused-vars
  debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
  }
}
