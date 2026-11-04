import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for Hawks Coach Hub core user flows
 * These tests verify critical user journeys work correctly across browsers
 */

test.describe('Hawks Coach Hub - Core User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent e2e testing
    await page.route('/api/drive*', async route => {
      const mockResponse = {
        files: [
          {
            id: '1',
            name: 'Training Session Plan - Week 1.pdf',
            parents: ['tactics_folder'],
            mimeType: 'application/pdf',
            size: '1024000',
            modifiedTime: '2023-12-01T10:00:00Z',
            webViewLink: 'https://drive.google.com/file/d/1'
          },
          {
            id: '2',
            name: 'Game Strategy Analysis.docx',
            parents: ['analysis_folder'],
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: '2048000',
            modifiedTime: '2023-12-02T14:30:00Z',
            webViewLink: 'https://drive.google.com/file/d/2'
          },
          {
            id: '3',
            name: 'Player Performance Stats.xlsx',
            parents: ['stats_folder'],
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: '512000',
            modifiedTime: '2023-12-03T09:15:00Z',
            webViewLink: 'https://drive.google.com/file/d/3'
          },
          {
            id: '4',
            name: 'Team Roster 2024.pdf',
            parents: ['roster_folder'],
            mimeType: 'application/pdf',
            size: '256000',
            modifiedTime: '2023-12-04T16:20:00Z',
            webViewLink: 'https://drive.google.com/file/d/4'
          }
        ],
        folders: [
          {
            id: 'tactics_folder',
            name: 'Tactics & Training',
            parents: ['root']
          },
          {
            id: 'analysis_folder',
            name: 'Game Analysis',
            parents: ['root']
          },
          {
            id: 'stats_folder',
            name: 'Performance Data',
            parents: ['root']
          },
          {
            id: 'roster_folder',
            name: 'Team Management',
            parents: ['root']
          }
        ],
        cached: false
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    await page.goto('/');
  });

  test.describe('Initial Page Load', () => {
    test('should load the main page successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/Hawks Coach Hub/i);
      
      // Check for main heading
      await expect(page.locator('h1')).toContainText(/Hawks/i);
    });

    test('should display loading state initially', async ({ page }) => {
      // Should show loading indicator before API call completes
      const loadingText = page.locator('text=Loading').first();
      
      // Wait for loading to appear (might be brief)
      await expect(loadingText.or(page.locator('text=files loaded'))).toBeVisible({ timeout: 5000 });
    });

    test('should load files from API successfully', async ({ page }) => {
      // Wait for files to be loaded and displayed
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Should display file count
      await expect(page.getByText('4 files loaded')).toBeVisible();
      
      // Should display at least one file
      await expect(page.locator('.file-item').first()).toBeVisible();
    });
  });

  test.describe('File Display and Navigation', () => {
    test('should display file list with correct information', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Check that files are displayed
      const fileItems = page.locator('.file-item');
      await expect(fileItems).toHaveCount(4);
      
      // Check first file has correct information
      const firstFile = fileItems.first();
      await expect(firstFile).toContainText('Training Session Plan - Week 1.pdf');
      await expect(firstFile).toContainText('PDF');
      await expect(firstFile).toContainText('1.0 MB');
    });

    test('should open files in new tab when clicked', async ({ page, context }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Set up new page listener
      const pagePromise = context.waitForEvent('page');
      
      // Click on a file link
      await page.locator('.file-link').first().click();
      
      const newPage = await pagePromise;
      
      // Verify file opens in Google Drive (mocked URL)
      await expect(newPage).toHaveURL(/drive\.google\.com/);
    });

    test('should display file type icons correctly', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Check for different file type displays
      await expect(page.locator('text=PDF').first()).toBeVisible();
      await expect(page.locator('text=DOC')).toBeVisible();
      await expect(page.locator('text=XLS')).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter files by search term', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Initial state - all files visible
      await expect(page.locator('.file-item')).toHaveCount(4);
      
      // Search for specific term
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('training');
        
        // Should show only matching files
        await expect(page.locator('.file-item')).toHaveCount(1);
        await expect(page.locator('text=Training Session Plan')).toBeVisible();
      }
    });

    test('should clear search results', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        // Search and verify filtered results
        await searchInput.fill('strategy');
        await expect(page.locator('.file-item')).toHaveCount(1);
        
        // Clear search
        await searchInput.clear();
        
        // Should show all files again
        await expect(page.locator('.file-item')).toHaveCount(4);
      }
    });

    test('should handle no search results gracefully', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('nonexistent-file-name');
        
        // Should show no files
        await expect(page.locator('.file-item')).toHaveCount(0);
        
        // Should show appropriate message
        const noResultsMessage = page.locator('text=No files found, text=no results, text=0 files');
        await expect(noResultsMessage.first()).toBeVisible();
      }
    });
  });

  test.describe('Folder Navigation', () => {
    test('should display folder navigation if implemented', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Check if folder navigation exists
      const folderNav = page.locator('.folder-nav, .breadcrumb, .folder-list');
      
      if (await folderNav.isVisible()) {
        // If folder navigation exists, test it
        const folderButtons = page.locator('button:has-text("Tactics"), button:has-text("Analysis")');
        
        if (await folderButtons.first().isVisible()) {
          await folderButtons.first().click();
          
          // Should filter files by folder
          await expect(page.locator('.file-item')).toHaveCountBetween(0, 4);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Override route to simulate API error
      await page.route('/api/drive*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto('/');
      
      // Should display error message
      const errorMessage = page.locator('text=error, text=failed, text=unable to load');
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
      
      // Should not show file count
      await expect(page.locator('text=files loaded')).not.toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('/api/drive*', async route => {
        await route.abort('failed');
      });

      await page.goto('/');
      
      // Should display appropriate error message
      const errorMessage = page.locator('text=network, text=connection, text=unable to connect');
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Should maintain functionality on mobile
      await expect(page.locator('.file-item')).toHaveCount(4);
      
      // File items should be properly sized for mobile
      const fileItem = page.locator('.file-item').first();
      const boundingBox = await fileItem.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400); // Should fit mobile width
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      // Should display all files on tablet
      await expect(page.locator('.file-item')).toHaveCount(4);
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should handle rapid interactions', async ({ page }) => {
      await expect(page.locator('text=files loaded')).toBeVisible({ timeout: 10000 });
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        // Rapid typing simulation
        await searchInput.fill('t');
        await searchInput.fill('tr');
        await searchInput.fill('tra');
        await searchInput.fill('train');
        await searchInput.fill('training');
        
        // Should handle rapid changes without breaking
        await expect(page.locator('.file-item')).toHaveCountBetween(0, 4);
      }
    });
  });
});