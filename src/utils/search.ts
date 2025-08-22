/**
 * Search and filtering utilities
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';

export class SearchService {
  /**
   * Filter files by search term
   */
  filterFilesBySearch(files: DriveFile[], searchTerm: string): DriveFile[] {
    if (!searchTerm.trim()) {
      return files;
    }

    const term = searchTerm.toLowerCase().trim();
    return files.filter(file =>
      file.name.toLowerCase().includes(term)
    );
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
  debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
  }
}