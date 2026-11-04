/**
 * Folder Navigation Manager
 * Handles folder chips display and navigation functionality
 */

import { domCache } from '@/utils/dom-cache';
import { appState } from '@/state/app-state';
import { ServiceAccountDriveService } from '@/services/drive-service-account';

export class FolderNavigationManager {
  private driveService: ServiceAccountDriveService;
  private cleanup: Array<() => void> = [];

  constructor() {
    this.driveService = new ServiceAccountDriveService();
    this.setupStateListeners();
  }

  /**
   * Setup listeners for state changes
   */
  private setupStateListeners(): void {
    const unsubscribe = appState.onStateChange(() => {
      this.displayFolderChips();
    });

    this.cleanup.push(unsubscribe);
  }

  /**
   * Display folder chips navigation
   */
  displayFolderChips(): void {
    const folderChipsBar = domCache.get('folderChipsBar');
    const folderChips = domCache.get('folderChips');
    
    if (!folderChipsBar || !folderChips) return;

    if (appState.allFolders.length === 0) {
      folderChipsBar.style.display = 'none';
      return;
    }

    folderChipsBar.style.display = 'block';
    
    // Clear existing chips
    folderChips.innerHTML = '';
    
    // Create "All Files" chip
    this.createAllFilesChip(folderChips);
    
    // Create folder chips
    this.createFolderChips(folderChips);
  }

  /**
   * Create "All Files" chip
   */
  private createAllFilesChip(container: HTMLElement): void {
    const allFilesChip = document.createElement('button');
    allFilesChip.className = `folder-chip ${appState.currentFolderFilter === null ? 'active' : ''}`;
    allFilesChip.setAttribute('data-folder-id', '');
    allFilesChip.innerHTML = `
      <span class="folder-chip-icon">📁</span>
      <span>Kaikki tiedostot</span>
      <span class="folder-chip-count">${appState.allFiles.length}</span>
    `;
    allFilesChip.onclick = () => this.filterByFolder(null);
    container.appendChild(allFilesChip);
  }

  /**
   * Create folder chips from cached folders
   */
  private createFolderChips(container: HTMLElement): void {
    // Get folders with files and prioritize meaningful folder names for coaches
    const allFoldersWithFiles = Array.from(appState.folderCache.values())
      .filter(folder => folder.fileCount && folder.fileCount > 0);
    
    // Prioritize folders with coaching-related terms (Finnish and English)
    const priorityTerms = [
      'harjoitus', 'practice', 'drill', 'exercise', 'treeni', 
      'suunnittelu', 'planning', 'plan', 'opetus', 'teaching',
      'taito', 'skill', 'tekniikka', 'technique', 'taktii', 'tactic'
    ];
    
    const prioritizedFolders = this.prioritizeFolders(allFoldersWithFiles, priorityTerms);
    const foldersWithFiles = prioritizedFolders.slice(0, 8); // Show top 8 prioritized folders
    
    //console.log(`🏒 Displaying ${foldersWithFiles.length} folder chips`);
    
    foldersWithFiles.forEach(folder => {
      const chip = this.createFolderChip(folder);
      container.appendChild(chip);
    });
  }

  /**
   * Prioritize folders based on hierarchy and coaching terms
   */
  private prioritizeFolders(
    folders: Array<any>, 
    priorityTerms: string[]
  ): Array<any> {
    return folders.sort((a, b) => {
      // 1. First priority: hierarchy level (top-level folders first)
      const aLevel = (a as any).hierarchyLevel || 999;
      const bLevel = (b as any).hierarchyLevel || 999;
      if (aLevel !== bLevel) {
        return aLevel - bLevel; // Lower level = higher priority
      }
      
      // 2. Second priority: Check if folder name contains coaching terms
      const aHasPriority = priorityTerms.some(term => 
        a.name.toLowerCase().includes(term.toLowerCase())
      );
      const bHasPriority = priorityTerms.some(term => 
        b.name.toLowerCase().includes(term.toLowerCase())
      );
      
      // If one has priority and other doesn't, prioritize the one with priority terms
      if (aHasPriority && !bHasPriority) return -1;
      if (!aHasPriority && bHasPriority) return 1;
      
      // 3. Third priority: sort by file count (more files = higher priority)
      return (b.fileCount || 0) - (a.fileCount || 0);
    });
  }

  /**
   * Create individual folder chip element
   */
  private createFolderChip(folder: any): HTMLElement {
    const chip = document.createElement('button');
    chip.className = `folder-chip ${appState.currentFolderFilter === folder.id ? 'active' : ''}`;
    chip.setAttribute('data-folder-id', folder.id);
    chip.innerHTML = `
      <span class="folder-chip-icon">📂</span>
      <span>${folder.name}</span>
      <span class="folder-chip-count">${folder.fileCount}</span>
    `;
    chip.onclick = () => this.filterByFolder(folder.id);
    return chip;
  }

  /**
   * Filter files by folder
   */
  filterByFolder(folderId: string | null): void {
    appState.setCurrentFolderFilter(folderId);

    if (!folderId) {
      // Show all files
      appState.setFilteredFiles([...appState.allFiles]);
      this.updateStatus(`Näytetään kaikki tiedostot (${appState.allFiles.length} tiedostoa)`, 'info');
    } else {
      // Show files in specific folder and its subfolders
      //console.log(`🔍 Filtering by folder ${folderId}`);
      //console.log(`📊 Available: ${appState.allFiles.length} files, ${appState.allFolders.length} folders`);
      
      const filesInFolder = this.driveService.getFilesInFolder(
        folderId, 
        appState.allFiles, 
        appState.allFolders
      );
      
      appState.setFilteredFiles(filesInFolder);
      
      //console.log(`📄 Found ${filesInFolder.length} files in folder`);
      if (filesInFolder.length > 0) {
        //console.log(`📝 Sample files:`, filesInFolder.slice(0, 3).map(f => f.name));
      }
      
      const folder = appState.getFolderById(folderId);
      const folderName = folder?.name || 'Unknown Folder';
      //console.log(`📁 Folder name: ${folderName}`);
      
      this.updateStatus(
        `Näytetään kansio: ${folderName} ja alikansiot (${filesInFolder.length} tiedostoa)`,
        'info'
      );
    }

    // Update chips to show active state
    this.updateActiveChip(folderId);
  }

  /**
   * Update active chip styling
   */
  private updateActiveChip(activeFolderId: string | null): void {
    const folderChips = domCache.get('folderChips');
    if (!folderChips) return;

    // Remove active class from all chips
    folderChips.querySelectorAll('.folder-chip').forEach(chip => {
      chip.classList.remove('active');
    });

    // Add active class to the selected chip
    const targetId = activeFolderId || '';
    const activeChip = folderChips.querySelector(`[data-folder-id="${targetId}"]`);
    if (activeChip) {
      activeChip.classList.add('active');
    }
  }

  /**
   * Update status (delegated to file list manager in practice, but available here)
   */
  private updateStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    //console.log(`Navigation Status: ${message} (${type})`);
    
    // In practice, this would be handled by FileListManager
    // but we keep the interface consistent
    const event = new CustomEvent('navigationStatus', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get navigation statistics
   */
  getNavigationStats(): {
    totalFolders: number;
    foldersWithFiles: number;
    displayedChips: number;
    activeFilter: string | null;
  } {
    const foldersWithFiles = Array.from(appState.folderCache.values())
      .filter(folder => folder.fileCount && folder.fileCount > 0);

    const folderChips = domCache.get('folderChips');
    const displayedChips = folderChips ? folderChips.children.length : 0;

    return {
      totalFolders: appState.allFolders.length,
      foldersWithFiles: foldersWithFiles.length,
      displayedChips,
      activeFilter: appState.currentFolderFilter,
    };
  }

  /**
   * Refresh navigation (force re-render)
   */
  refresh(): void {
    this.displayFolderChips();
  }

  /**
   * Handle keyboard navigation (optional enhancement)
   */
  setupKeyboardNavigation(): void {
    const folderChips = domCache.get('folderChips');
    if (!folderChips) return;

    folderChips.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('folder-chip')) return;

      const chips = Array.from(folderChips.querySelectorAll('.folder-chip'));
      const currentIndex = chips.indexOf(target);

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = Math.max(0, currentIndex - 1);
          event.preventDefault();
          break;
        case 'ArrowRight':
          nextIndex = Math.min(chips.length - 1, currentIndex + 1);
          event.preventDefault();
          break;
        case 'Home':
          nextIndex = 0;
          event.preventDefault();
          break;
        case 'End':
          nextIndex = chips.length - 1;
          event.preventDefault();
          break;
        default:
          return;
      }

      if (nextIndex !== currentIndex) {
        (chips[nextIndex] as HTMLElement).focus();
      }
    });
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(): void {
    this.cleanup.forEach(cleanupFn => cleanupFn());
    this.cleanup = [];
  }
}