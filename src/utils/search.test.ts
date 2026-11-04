import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from './search';
import type { DriveFile, DriveFolder } from '@/types/google-apis';

describe('SearchService', () => {
  let searchService: SearchService;
  let mockFiles: DriveFile[];
  let mockFolders: DriveFolder[];
  let folderCache: Map<string, DriveFolder>;

  beforeEach(() => {
    searchService = new SearchService();
    
    mockFiles = [
      {
        id: '1',
        name: 'Training Plan.pdf',
        parents: ['folder1'],
        mimeType: 'application/pdf',
        size: '1024000',
        modifiedTime: '2023-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/1'
      },
      {
        id: '2', 
        name: 'Game Strategy.doc',
        parents: ['folder1'],
        mimeType: 'application/msword',
        size: '512000',
        modifiedTime: '2023-01-02T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/2'
      },
      {
        id: '3',
        name: 'Equipment List.xlsx',
        parents: ['folder2'],
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: '256000',
        modifiedTime: '2023-01-03T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/3'
      }
    ];

    mockFolders = [
      {
        id: 'folder1',
        name: 'Tactics',
        parents: ['root'],
        files: [mockFiles[0], mockFiles[1]]
      },
      {
        id: 'folder2',
        name: 'Equipment',
        parents: ['root'],
        files: [mockFiles[2]]
      },
      {
        id: 'subfolder1',
        name: 'Advanced Tactics',
        parents: ['folder1'],
        files: []
      }
    ];

    folderCache = new Map();
    mockFolders.forEach(folder => folderCache.set(folder.id, folder));
  });

  describe('filterFilesBySearch', () => {
    it('should return all files when search term is empty', () => {
      const result = searchService.filterFilesBySearch(mockFiles, '');
      expect(result).toEqual(mockFiles);
    });

    it('should return all files when search term is only whitespace', () => {
      const result = searchService.filterFilesBySearch(mockFiles, '   ');
      expect(result).toEqual(mockFiles);
    });

    it('should filter files by name (case insensitive)', () => {
      const result = searchService.filterFilesBySearch(mockFiles, 'training');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Training Plan.pdf');
    });

    it('should filter files by partial name match', () => {
      const result = searchService.filterFilesBySearch(mockFiles, 'plan');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Training Plan.pdf');
    });

    it('should return multiple matches', () => {
      const result = searchService.filterFilesBySearch(mockFiles, 'a'); // matches 'Training' and 'Game'
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toEqual(['Training Plan.pdf', 'Game Strategy.doc']);
    });

    it('should return empty array when no matches found', () => {
      const result = searchService.filterFilesBySearch(mockFiles, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should handle special characters in search term', () => {
      mockFiles.push({
        id: '4',
        name: 'Test (2024).pdf',
        parents: ['folder1'],
        mimeType: 'application/pdf',
        size: '1024',
        modifiedTime: '2024-01-01T10:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/4'
      });
      
      const result = searchService.filterFilesBySearch(mockFiles, '(2024)');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test (2024).pdf');
    });
  });

  describe('filterFilesByFolder', () => {
    it('should return all files when folderId is null', () => {
      const result = searchService.filterFilesByFolder(mockFiles, null, folderCache);
      expect(result).toEqual(mockFiles);
    });

    it('should return files from specific folder', () => {
      const result = searchService.filterFilesByFolder(mockFiles, 'folder1', folderCache);
      expect(result).toHaveLength(2);
      expect(result.map(f => f.name)).toEqual(['Training Plan.pdf', 'Game Strategy.doc']);
    });

    it('should return empty array for non-existent folder', () => {
      const result = searchService.filterFilesByFolder(mockFiles, 'nonexistent', folderCache);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when folder has no files', () => {
      const result = searchService.filterFilesByFolder(mockFiles, 'subfolder1', folderCache);
      expect(result).toHaveLength(0);
    });

    it('should handle folder without files property', () => {
      folderCache.set('empty_folder', { id: 'empty_folder', name: 'Empty', parents: ['root'] });
      const result = searchService.filterFilesByFolder(mockFiles, 'empty_folder', folderCache);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterFiles', () => {
    it('should apply both folder and search filters', () => {
      const result = searchService.filterFiles(mockFiles, 'training', 'folder1', folderCache);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Training Plan.pdf');
    });

    it('should apply only search filter when no folder selected', () => {
      const result = searchService.filterFiles(mockFiles, 'strategy', null, folderCache);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Game Strategy.doc');
    });

    it('should apply only folder filter when no search term', () => {
      const result = searchService.filterFiles(mockFiles, '', 'folder2', folderCache);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Equipment List.xlsx');
    });

    it('should return empty array when filters exclude all files', () => {
      const result = searchService.filterFiles(mockFiles, 'nonexistent', 'folder1', folderCache);
      expect(result).toHaveLength(0);
    });

    it('should return all files when no filters applied', () => {
      const result = searchService.filterFiles(mockFiles, '', null, folderCache);
      expect(result).toEqual(mockFiles);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', (done) => {
      const mockFn = vi.fn();
      const debouncedFn = searchService.debounce(mockFn, 100);
      
      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledWith('test');
        done();
      }, 150);
    });

    it('should cancel previous calls', (done) => {
      const mockFn = vi.fn();
      const debouncedFn = searchService.debounce(mockFn, 100);
      
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('third');
        done();
      }, 150);
    });

    it('should preserve function arguments', (done) => {
      const mockFn = vi.fn();
      const debouncedFn = searchService.debounce(mockFn, 50);
      
      debouncedFn('arg1', 'arg2', 42);
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 42);
        done();
      }, 100);
    });
  });
});