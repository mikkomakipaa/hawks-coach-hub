import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ServiceAccountDriveService } from '@/services/drive-service-account';
import { SearchService } from '@/utils/search';
import type { DriveFile, DriveFolder } from '@/types/google-apis';

/**
 * Integration tests for Drive API service and search functionality
 * These tests verify that components work together correctly
 */
describe('Drive API Integration Tests', () => {
  let mockServer: { close: () => void };
  let driveService: ServiceAccountDriveService;
  let searchService: SearchService;

  // Mock fetch for integration tests
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Setup mock server responses for integration testing
    global.fetch = vi.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (mockServer) {
      mockServer.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    driveService = new ServiceAccountDriveService();
    searchService = new SearchService();
  });

  describe('End-to-End File Loading and Search Workflow', () => {
    const mockApiResponse = {
      files: [
        {
          id: '1',
          name: 'Training Session Plan.pdf',
          parents: ['tactics_folder'],
          mimeType: 'application/pdf',
          size: '1024000',
          modifiedTime: '2023-12-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/1'
        },
        {
          id: '2', 
          name: 'Game Analysis Report.docx',
          parents: ['analysis_folder'],
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: '2048000',
          modifiedTime: '2023-12-02T14:30:00Z',
          webViewLink: 'https://drive.google.com/file/d/2'
        },
        {
          id: '3',
          name: 'Player Stats.xlsx',
          parents: ['stats_folder'],
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: '512000',
          modifiedTime: '2023-12-03T09:15:00Z',
          webViewLink: 'https://drive.google.com/file/d/3'
        }
      ],
      folders: [
        {
          id: 'tactics_folder',
          name: 'Tactics & Training',
          parents: ['root'],
          files: []
        },
        {
          id: 'analysis_folder', 
          name: 'Game Analysis',
          parents: ['root'],
          files: []
        },
        {
          id: 'stats_folder',
          name: 'Statistics',
          parents: ['root'],
          files: []
        }
      ],
      cached: false
    };

    it('should load files and enable search functionality', async () => {
      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      } as Response);

      // Load data from API
      const result = await driveService.loadAllFilesAndFolders();

      expect(result.files).toHaveLength(3);
      expect(result.folders).toHaveLength(3);

      // Test search functionality on loaded data
      const searchResults = searchService.filterFilesBySearch(result.files, 'training');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Training Session Plan.pdf');
    });

    it('should handle folder-based filtering with search', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      } as Response);

      const { files, folders } = await driveService.loadAllFilesAndFolders();
      
      // Create folder cache as would be done in the application
      const folderCache = new Map<string, DriveFolder>();
      folders.forEach(folder => {
        // Simulate populating folder with its files
        folder.files = files.filter(file => 
          file.parents && file.parents.includes(folder.id)
        );
        folderCache.set(folder.id, folder);
      });

      // Test combined folder and search filtering
      const results = searchService.filterFiles(files, 'analysis', 'analysis_folder', folderCache);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Game Analysis Report.docx');
    });

    it('should handle API errors gracefully in search workflow', async () => {
      // Mock API failure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      } as Response);

      await expect(driveService.loadAllFilesAndFolders()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );

      // Ensure search service can still work with empty data
      const emptyResults = searchService.filterFilesBySearch([], 'test');
      expect(emptyResults).toHaveLength(0);
    });

    it('should handle network failures and offline scenarios', async () => {
      // Mock network failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(driveService.loadAllFilesAndFolders()).rejects.toThrow(
        'Unable to connect to service account API'
      );
    });

    it('should maintain data consistency across multiple operations', async () => {
      // Mock cached response
      const cachedResponse = { ...mockApiResponse, cached: true };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cachedResponse)
      } as Response);

      const firstLoad = await driveService.loadAllFilesAndFolders();
      expect(firstLoad.cached).toBe(true);

      // Test that search operations don't mutate original data
      const originalFilesLength = firstLoad.files.length;
      searchService.filterFilesBySearch(firstLoad.files, 'nonexistent');
      
      expect(firstLoad.files).toHaveLength(originalFilesLength);
    });
  });

  describe('Folder Hierarchy and File Retrieval Integration', () => {
    const hierarchicalData = {
      files: [
        {
          id: 'f1',
          name: 'Top Level.pdf',
          parents: ['parent_folder'],
          mimeType: 'application/pdf',
          size: '1024',
          modifiedTime: '2023-12-01T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/f1'
        },
        {
          id: 'f2',
          name: 'Subfolder File.docx',
          parents: ['sub_folder'],
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: '2048',
          modifiedTime: '2023-12-02T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/f2'
        },
        {
          id: 'f3',
          name: 'Deep File.xlsx',
          parents: ['deep_folder'],
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: '512',
          modifiedTime: '2023-12-03T10:00:00Z',
          webViewLink: 'https://drive.google.com/file/d/f3'
        }
      ],
      folders: [
        {
          id: 'parent_folder',
          name: 'Parent Folder',
          parents: ['root']
        },
        {
          id: 'sub_folder',
          name: 'Sub Folder',
          parents: ['parent_folder']
        },
        {
          id: 'deep_folder',
          name: 'Deep Folder',
          parents: ['sub_folder']
        }
      ]
    };

    it('should correctly retrieve files from nested folder structure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(hierarchicalData)
      } as Response);

      const { files, folders } = await driveService.loadAllFilesAndFolders();
      
      // Test getting all files in parent folder (should include subfolders)
      const parentFiles = driveService.getFilesInFolder('parent_folder', files, folders);
      
      expect(parentFiles).toHaveLength(3); // All files in hierarchy
      expect(parentFiles.map(f => f.name)).toEqual([
        'Top Level.pdf',
        'Subfolder File.docx', 
        'Deep File.xlsx'
      ]);
    });

    it('should handle refresh parameter correctly', async () => {
      const freshResponse = { ...hierarchicalData, cached: false };
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(freshResponse)
      } as Response);

      await driveService.loadAllFilesAndFolders(true);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/drive?type=both&refresh=true',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset for performance testing
      const largeDataset = {
        files: Array.from({ length: 1000 }, (_, i) => ({
          id: `file_${i}`,
          name: `File ${i}.pdf`,
          parents: [`folder_${i % 10}`],
          mimeType: 'application/pdf',
          size: '1024',
          modifiedTime: '2023-12-01T10:00:00Z',
          webViewLink: `https://drive.google.com/file/d/file_${i}`
        })),
        folders: Array.from({ length: 10 }, (_, i) => ({
          id: `folder_${i}`,
          name: `Folder ${i}`,
          parents: ['root']
        }))
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeDataset)
      } as Response);

      const startTime = performance.now();
      const result = await driveService.loadAllFilesAndFolders();
      const loadTime = performance.now() - startTime;

      expect(result.files).toHaveLength(1000);
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second

      // Test search performance on large dataset
      const searchStartTime = performance.now();
      const searchResults = searchService.filterFilesBySearch(result.files, 'File 1');
      const searchTime = performance.now() - searchStartTime;

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100); // Should search within 100ms
    });

    it('should handle malformed API responses', async () => {
      // Test with missing fields
      const malformedResponse = {
        files: [
          {
            id: '1',
            // Missing name field
            parents: ['folder1'],
            mimeType: 'application/pdf'
            // Missing other required fields
          }
        ],
        folders: [
          {
            id: 'folder1'
            // Missing name and parents
          }
        ]
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(malformedResponse)
      } as Response);

      const result = await driveService.loadAllFilesAndFolders();
      
      // Should not crash, but handle gracefully
      expect(result.files).toBeDefined();
      expect(result.folders).toBeDefined();
    });
  });
});