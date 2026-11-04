/**
 * File List Manager
 * Handles file display, pagination, and UI updates
 */

import { domCache } from '@/utils/dom-cache';
import { appState } from '@/state/app-state';
import { FileDisplayService } from '@/components/file-display';
import type { StatusType } from '@/types/google-apis';

export class FileListManager {
  private fileDisplayService: FileDisplayService;
  private cleanup: Array<() => void> = [];

  constructor() {
    this.fileDisplayService = new FileDisplayService();
    this.setupStateListeners();
  }

  /**
   * Setup listeners for state changes
   */
  private setupStateListeners(): void {
    const unsubscribeState = appState.onStateChange(() => {
      this.displayFiles();
      this.updateFileCount();
      this.updatePagination();
    });

    const unsubscribeSession = appState.onSessionChange(() => {
      this.updateSessionDisplay();
      this.updatePlanningModeUI();
    });

    this.cleanup.push(unsubscribeState, unsubscribeSession);
  }

  /**
   * Update status display
   */
  updateStatus(message: string, type: StatusType = 'info'): void {
    //console.log(`Status: ${message} (${type})`);
    
    const loadingStatus = domCache.get('loadingStatus');
    const loadingText = domCache.get('loadingText');
    
    if (loadingStatus && loadingText) {
      if (type === 'loading') {
        loadingText.textContent = message;
        loadingStatus.style.display = 'flex';
        //console.log('✅ Loading indicator SHOWN:', message);
      } else {
        loadingStatus.style.display = 'none';
        //console.log('✅ Loading indicator HIDDEN');
      }
    } else {
      //console.log('❌ Loading status element not found');
    }
  }

  /**
   * Show/hide loading skeleton
   */
  showSkeletonLoading(): void {
    const filesList = domCache.get('filesList');
    if (!filesList) return;

    filesList.innerHTML = `
      <div class="skeleton-loading">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    `;
  }

  hideSkeletonLoading(): void {
    const skeletonElements = document.querySelectorAll('.skeleton-loading');
    skeletonElements.forEach(el => el.remove());
  }

  /**
   * Display files in the UI
   */
  displayFiles(): void {
    const filesList = domCache.get('filesList');
    if (!filesList) {
      console.error('Files list element not found');
      return;
    }

    filesList.innerHTML = '';

    const filteredFiles = appState.filteredFiles;
    
    if (filteredFiles.length === 0) {
      const searchInput = domCache.get('searchInput') as HTMLInputElement;
      const isSearching = searchInput?.value.trim() !== '';
      const emptyState = this.fileDisplayService.createEmptyState(
        isSearching,
        appState.allFiles.length > 0
      );
      filesList.appendChild(emptyState);
      this.updatePagination();
      return;
    }

    // Get current page items
    const pageItems = appState.getPageItems();

    pageItems.forEach(file => {
      const fileItem = this.fileDisplayService.createFileItem(file);
      filesList.appendChild(fileItem);
    });

    this.updatePagination();
    this.updateSessionDisplay(); // Update session buttons after rendering
  }

  /**
   * Update file count display
   */
  updateFileCount(): void {
    const totalFilesSpan = domCache.get('totalFiles');
    const totalFoldersSpan = domCache.get('totalFolders');
    const currentViewSpan = domCache.get('currentViewCount');
    const fileCountSpan = domCache.get('fileCount');

    if (totalFilesSpan) {
      totalFilesSpan.textContent = appState.allFiles.length.toString();
    }
    
    if (totalFoldersSpan) {
      totalFoldersSpan.textContent = appState.allFolders.length.toString();
    }
    
    if (currentViewSpan) {
      currentViewSpan.textContent = appState.filteredFiles.length.toString();
    }
    
    if (fileCountSpan) {
      const message = appState.filteredFiles.length === 1 
        ? '1 tiedosto löytyi' 
        : `${appState.filteredFiles.length} tiedostoa löytyi`;
      fileCountSpan.textContent = message;
    }
  }

  /**
   * Update pagination
   */
  updatePagination(): void {
    const paginationInfo = domCache.get('paginationInfo');
    const paginationControls = domCache.get('paginationControls');
    
    if (!paginationInfo || !paginationControls) return;

    const totalPages = appState.totalPages;
    const currentPage = appState.currentPage;
    const filteredFiles = appState.filteredFiles;

    if (totalPages <= 1) {
      paginationControls.style.display = 'none';
      paginationInfo.textContent = '';
      return;
    }

    paginationControls.style.display = 'flex';
    
    const itemsPerPage = appState.itemsPerPage;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredFiles.length);
    
    paginationInfo.textContent = `${startItem}-${endItem} / ${filteredFiles.length}`;

    // Update pagination buttons
    const prevButton = domCache.get('prevPage') as HTMLButtonElement;
    const nextButton = domCache.get('nextPage') as HTMLButtonElement;
    
    if (prevButton) {
      prevButton.disabled = currentPage === 1;
      prevButton.onclick = () => {
        if (currentPage > 1) {
          appState.setCurrentPage(currentPage - 1);
        }
      };
    }
    
    if (nextButton) {
      nextButton.disabled = currentPage === totalPages;
      nextButton.onclick = () => {
        if (currentPage < totalPages) {
          appState.setCurrentPage(currentPage + 1);
        }
      };
    }
  }

  /**
   * Update planning mode UI
   */
  updatePlanningModeUI(): void {
    const planningBar = domCache.get('sessionPlanningBar');
    if (!planningBar) return;

    const isActive = appState.isSessionActive;
    planningBar.style.display = isActive ? 'flex' : 'none';

    // Update planning mode toggle button if it exists
    const toggleBtn = document.querySelector('.planning-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isActive
        ? 'Lopeta suunnittelu'
        : 'Aloita harjoitussuunnittelu';
      toggleBtn.classList.toggle('active', isActive);
    }

    // Add visual indicators to file items
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.toggle('planning-mode', isActive);
    });
  }

  /**
   * Update session display
   */
  updateSessionDisplay(): void {
    const sessionCount = domCache.get('sessionCount');
    const sessionList = domCache.get('sessionMaterialsList');

    if (sessionCount) {
      sessionCount.textContent = appState.selectedFiles.size.toString();
    }

    if (sessionList) {
      sessionList.innerHTML = '';

      if (appState.selectedFiles.size === 0) {
        sessionList.innerHTML = '<div class="session-empty">Ei materiaaleja valittuna</div>';
      } else {
        Array.from(appState.selectedFiles).forEach(fileId => {
          const file = appState.getFileById(fileId);
          if (file) {
            const item = document.createElement('div');
            item.className = 'session-material-item';
            item.innerHTML = `
              <span class="material-name">${file.name}</span>
              <button class="remove-material-btn" onclick="window.FileActions.removeFromSession('${fileId}')" title="Poista">×</button>
            `;
            sessionList.appendChild(item);
          }
        });
      }
    }

    // Update add buttons in file list
    document.querySelectorAll('.file-item').forEach(item => {
      const addBtn = item.querySelector('.add-to-session-btn') as HTMLElement;
      if (addBtn) {
        const fileId = addBtn.getAttribute('data-file-id');
        const isSelected = fileId && appState.selectedFiles.has(fileId);
        item.classList.toggle('in-session', !!isSelected);
        addBtn.textContent = isSelected ? '✓ Lisätty' : '+ Harjoitus';
        addBtn.classList.toggle('added', !!isSelected);
      }
    });
  }

  /**
   * Refresh display (force re-render)
   */
  refresh(): void {
    this.displayFiles();
    this.updateFileCount();
    this.updatePagination();
    this.updateSessionDisplay();
    this.updatePlanningModeUI();
  }

  /**
   * Handle search results display
   */
  displaySearchResults(query: string, resultCount: number): void {
    this.updateStatus(`Hakutulokset: ${resultCount} tiedostoa löytyi hakusanalla "${query}"`, 'info');
    this.displayFiles();
    this.updateFileCount();
  }

  /**
   * Handle empty results display
   */
  displayEmptyResults(isSearch: boolean): void {
    if (isSearch) {
      this.updateStatus('Ei hakutuloksia', 'info');
    } else {
      this.updateStatus('Ei tiedostoja', 'info');
    }
    this.displayFiles();
  }

  /**
   * Performance monitoring helpers
   */
  getPerformanceStats(): { 
    elementsFound: number; 
    totalElements: number; 
    renderTime?: number 
  } {
    const cacheStats = domCache.getStats();
    return {
      elementsFound: cacheStats.found,
      totalElements: cacheStats.total,
    };
  }

  /**
   * Measure render performance
   */
  async measureRenderTime(operation: () => void | Promise<void>): Promise<number> {
    const start = performance.now();
    await operation();
    const end = performance.now();
    const renderTime = end - start;
    
    //console.log(`📊 Render operation took: ${renderTime.toFixed(2)}ms`);
    return renderTime;
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(): void {
    this.cleanup.forEach(cleanupFn => cleanupFn());
    this.cleanup = [];
  }
}