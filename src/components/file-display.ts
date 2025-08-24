/**
 * File Display Components
 */

import type {
  DriveFile,
  FileCategory,
  CategoryName,
} from '@/types/google-apis';
import { createElement } from '@/utils/dom';

export class FileDisplayService {
  /**
   * Get appropriate icon for file type
   */
  getFileIcon(mimeType: string): string {
    const iconClass = this.getFileIconClass(mimeType);
    return `<div class="file-type-icon ${iconClass}"></div>`;
  }

  /**
   * Get CSS class for file type icon
   */
  private getFileIconClass(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'icon-pdf';
    if (mimeType.includes('document')) return 'icon-document';
    if (mimeType.includes('spreadsheet')) return 'icon-spreadsheet';
    if (mimeType.includes('presentation')) return 'icon-presentation';
    if (mimeType.includes('video')) return 'icon-video';
    if (mimeType.includes('image')) return 'icon-image';
    if (mimeType.includes('folder')) return 'icon-folder';
    if (mimeType.includes('text')) return 'icon-text';
    return 'icon-file';
  }

  /**
   * Detect content type for coaching context
   */
  private detectContentType(fileName: string): string {
    const name = fileName.toLowerCase();

    // Coaching-specific content detection
    if (
      name.includes('drill') ||
      name.includes('harjoitus') ||
      name.includes('exercise')
    ) {
      return 'drill';
    }
    if (
      name.includes('tactic') ||
      name.includes('taktiikka') ||
      name.includes('strategy')
    ) {
      return 'tactic';
    }
    if (
      name.includes('plan') ||
      name.includes('ohjelma') ||
      name.includes('session') ||
      name.includes('practice')
    ) {
      return 'plan';
    }
    if (
      name.includes('video') ||
      name.includes('demo') ||
      name.includes('example')
    ) {
      return 'video';
    }

    return 'general';
  }

  /**
   * Check if file was recently accessed (mock implementation)
   */
  private isRecentlyAccessed(file: DriveFile): boolean {
    // Mock logic - in real implementation would check localStorage or usage analytics
    const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    return recentFiles.includes(file.id);
  }

  /**
   * Get localized content type label
   */
  private getContentTypeLabel(contentType: string): string {
    const labels: Record<string, string> = {
      drill: 'Harjoitus',
      tactic: 'Taktiikka',
      plan: 'Suunnitelma',
      video: 'Video',
      general: 'Materiaali',
    };
    return labels[contentType] || 'Materiaali';
  }

  /**
   * Create action buttons for file
   */
  private createActionButtons(file: DriveFile): string {
    return `
      <div class="file-actions">
        <button class="action-btn session-add-btn" onclick="FileActions.addToSession('${file.id}')" title="Lisää harjoitukseen">
          + Harjoitus
        </button>
      </div>
    `;
  }

  /**
   * Create a file item element with enhanced UX
   */
  createFileItem(file: DriveFile): HTMLElement {
    const fileItem = createElement('div', 'file-item');

    const contentType = this.detectContentType(file.name);
    const isRecent = this.isRecentlyAccessed(file);
    const icon = this.getFileIcon(file.mimeType);
    const actionButtons = this.createActionButtons(file);

    // Add data attributes for styling
    fileItem.setAttribute('data-type', contentType);
    if (isRecent) {
      fileItem.classList.add('recently-accessed');
    }

    fileItem.innerHTML = `
      <div class="file-icon">${icon}</div>
      <div class="file-info">
        <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="file-name">
          ${file.name}
        </a>
        <!-- Simplified file meta - removed unnecessary date and category info -->
      </div>
      ${actionButtons}
    `;

    return fileItem;
  }

  /**
   * Create skeleton loading item
   */
  createSkeletonItem(): HTMLElement {
    const skeleton = createElement('div', 'file-item skeleton-item');
    skeleton.innerHTML = `
      <div class="file-icon skeleton-circle"></div>
      <div class="file-info">
        <div class="skeleton-text skeleton-title"></div>
        <div class="skeleton-text skeleton-date"></div>
      </div>
    `;
    return skeleton;
  }

  /**
   * Create skeleton category section
   */
  createCategorySkeleton(): HTMLElement {
    const skeleton = createElement('div', 'category skeleton-category');
    skeleton.innerHTML = `
      <div class="skeleton-text skeleton-category-title"></div>
      <div class="skeleton-text skeleton-category-item"></div>
      <div class="skeleton-text skeleton-category-item"></div>
      <div class="skeleton-text skeleton-category-item"></div>
    `;
    return skeleton;
  }

  /**
   * Create empty state element
   */
  createEmptyState(isSearching: boolean, hasFiles: boolean): HTMLElement {
    const emptyDiv = createElement('div', 'empty-state');

    if (isSearching) {
      emptyDiv.innerHTML = `
        <div class="empty-icon">🔍</div>
        <h3>No training resources found</h3>
        <p>Try adjusting your search terms or browse by category instead.</p>
        <button class="empty-action" onclick="searchInput.value=''; handleSearch();">
          Clear Search
        </button>
      `;
    } else if (!hasFiles) {
      emptyDiv.innerHTML = `
        <div class="empty-icon">📁</div>
        <h3>Welcome to Hawks Coach Hub</h3>
        <p>Sign in with Google Drive to access your training resources, drills, and tactical materials.</p>
        <div class="empty-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span>Click "Sign In" above</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span>Authorize Google Drive access</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span>Start browsing your files</span>
          </div>
        </div>
      `;
    } else {
      emptyDiv.innerHTML = `
        <div class="empty-icon">📋</div>
        <h3>No files in this category</h3>
        <p>This category is currently empty. Files will appear here when they match the category criteria.</p>
      `;
    }

    return emptyDiv;
  }

  /**
   * Group files by category
   */
  groupFilesByCategory(files: DriveFile[]): FileCategory {
    const categories: FileCategory = {
      'Floorball Drills': [],
      'Tactics & Strategy': [],
      'Training Plans': [],
      'Video Resources': [],
      'Diagrams & Images': [],
      Documents: [],
      Other: [],
    };

    files.forEach(file => {
      const name = file.name.toLowerCase();
      const mimeType = file.mimeType;

      // Floorball-specific categorization
      if (
        name.includes('drill') ||
        name.includes('exercise') ||
        name.includes('training') ||
        name.includes('floorball')
      ) {
        categories['Floorball Drills'].push(file);
      } else if (
        name.includes('tactic') ||
        name.includes('strategy') ||
        name.includes('formation')
      ) {
        categories['Tactics & Strategy'].push(file);
      } else if (
        name.includes('plan') ||
        name.includes('program') ||
        name.includes('schedule') ||
        name.includes('season')
      ) {
        categories['Training Plans'].push(file);
      } else if (
        mimeType.includes('video') ||
        name.includes('.mp4') ||
        name.includes('.mov')
      ) {
        categories['Video Resources'].push(file);
      } else if (
        mimeType.includes('image') ||
        name.includes('.jpg') ||
        name.includes('.png')
      ) {
        categories['Diagrams & Images'].push(file);
      } else if (
        mimeType.includes('document') ||
        mimeType.includes('pdf') ||
        mimeType.includes('text')
      ) {
        categories['Documents'].push(file);
      } else {
        categories['Other'].push(file);
      }
    });

    return categories;
  }

  /**
   * Create a category section
   */
  createCategorySection(
    categoryName: CategoryName,
    files: DriveFile[]
  ): HTMLElement {
    const categoryDiv = createElement('div', 'category');

    const categoryHeader = createElement('h3');
    categoryHeader.textContent = `${categoryName} (${files.length})`;
    categoryDiv.appendChild(categoryHeader);

    const fileList = createElement('div', 'file-list');

    files.forEach(file => {
      const fileItem = this.createFileItem(file);
      fileList.appendChild(fileItem);
    });

    categoryDiv.appendChild(fileList);
    return categoryDiv;
  }
}
