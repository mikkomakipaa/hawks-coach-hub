/**
 * Hawks Coach Hub - Service Account Version (No Authentication Required)
 * Modern TypeScript implementation with backend API calls
 */

import type {
  DriveFile,
  DriveFolder,
  StatusType,
} from '@/types/google-apis';
import { getDOMElement } from '@/utils/dom';
import { AUTO_REFRESH_INTERVAL } from '@/utils/config';
import { initializeToastContainer, showToast } from '@/components/toast';
import { ServiceAccountDriveService } from '@/services/drive-service-account';
import { FileDisplayService } from '@/components/file-display';
import { SearchService } from '@/utils/search';
import {
  FolderBrowserService,
  type FolderTreeNode,
} from '@/components/folder-browser';
import { createElement } from '@/utils/dom';

// Simplified Application State (no auth needed)
interface AppState {
  allFiles: DriveFile[];
  filteredFiles: DriveFile[];
  allFolders: DriveFolder[];
  folderCache: Map<string, DriveFolder>;
  currentFolderFilter: string | null;
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

const state: AppState = {
  allFiles: [],
  filteredFiles: [],
  allFolders: [],
  folderCache: new Map(),
  currentFolderFilter: null,
  currentPage: 1,
  itemsPerPage: 50,
  totalPages: 0,
};

// Services
const driveService = new ServiceAccountDriveService();
const fileDisplayService = new FileDisplayService();
const searchService = new SearchService();
const folderBrowserService = new FolderBrowserService();

// Session Planning State
const sessionPlanningState = {
  isActive: false,
  selectedFiles: new Set<string>(),
  sessionName: '',
};

// Global FileActions for action buttons
declare global {
  interface Window {
    FileActions: {
      addToSession: (fileId: string) => void;
      downloadFile: (url: string) => void;
      togglePlanningMode: () => void;
      exportSession: () => void;
      removeFromSession: (fileId: string) => void;
    };
  }
}

window.FileActions = {
  addToSession: (fileId: string) => {
    if (sessionPlanningState.isActive) {
      sessionPlanningState.selectedFiles.add(fileId);
      updateSessionDisplay();
      showToast(
        'Tiedosto lisätty',
        'Materiaali lisätty harjoitussuunnitelmaan',
        'success',
        2000
      );
    } else {
      // Auto-enable planning mode and add file
      sessionPlanningState.isActive = true;
      sessionPlanningState.selectedFiles.add(fileId);
      updatePlanningModeUI();
      updateSessionDisplay();
      showToast(
        'Harjoitussuunnittelu aloitettu',
        'Ensimmäinen materiaali lisätty',
        'info',
        3000
      );
    }
  },

  downloadFile: (url: string) => {
    window.open(url, '_blank');
  },

  togglePlanningMode: () => {
    sessionPlanningState.isActive = !sessionPlanningState.isActive;
    if (!sessionPlanningState.isActive) {
      sessionPlanningState.selectedFiles.clear();
    }
    updatePlanningModeUI();
    updateSessionDisplay();
  },

  exportSession: () => {
    if (sessionPlanningState.selectedFiles.size === 0) {
      showToast(
        'Ei materiaaleja',
        'Lisää ensin materiaaleja harjoitukseen',
        'warning',
        3000
      );
      return;
    }

    const selectedFilesList = Array.from(sessionPlanningState.selectedFiles)
      .map(fileId => state.allFiles.find(f => f.id === fileId))
      .filter(Boolean)
      .map(file => `• ${file!.name}\n  🔗 ${file!.webViewLink}`)
      .join('\n\n');

    const sessionData = `HAWKS HARJOITUSSUUNNITELMA
Luotu: ${new Date().toLocaleDateString('fi-FI')}

MATERIAALIT (${sessionPlanningState.selectedFiles.size} kpl):
${selectedFilesList}

----
Luotu Hawks Valmennuskeskuksessa
📁 Kaikki materiaalit: https://drive.google.com/drive/folders/1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb`;

    navigator.clipboard
      .writeText(sessionData)
      .then(() => {
        showToast(
          'Suunnitelma kopioitu',
          'Harjoitussuunnitelma kopioitu leikepöydälle',
          'success',
          3000
        );
      })
      .catch(() => {
        showToast(
          'Virhe',
          'Harjoitussuunnitelma kopioitu leikepöydälle',
          'error',
          3000
        );
      });
  },

  removeFromSession: (fileId: string) => {
    sessionPlanningState.selectedFiles.delete(fileId);
    updateSessionDisplay();
    showToast(
      'Materiaali poistettu',
      'Materiaali poistettu harjoitussuunnitelmasta',
      'info',
      2000
    );
  },
};

// DOM Elements
const searchInput = getDOMElement('searchInput') as HTMLInputElement;
const refreshButton = getDOMElement('refreshButton') as HTMLButtonElement;
const filesList = getDOMElement('allFilesList') as HTMLDivElement;

/**
 * Update status display
 */
function updateStatus(message: string, type: StatusType = 'info'): void {
  console.log(`Status: ${message} (${type})`);
  
  const loadingStatus = document.getElementById('loadingStatus');
  const loadingText = loadingStatus?.querySelector('.loading-text');
  
  if (loadingStatus && loadingText) {
    if (type === 'loading') {
      loadingText.textContent = message;
      loadingStatus.style.display = 'flex';
      console.log('✅ Loading indicator SHOWN:', message);
    } else {
      loadingStatus.style.display = 'none';
      console.log('✅ Loading indicator HIDDEN');
    }
  } else {
    console.log('❌ Loading status element not found');
  }
}

/**
 * Show/hide loading skeleton
 */
function showSkeletonLoading(): void {
  const container = filesList;
  container.innerHTML = `
    <div class="skeleton-loading">
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>
    </div>
  `;
}

function hideSkeletonLoading(): void {
  const skeletonElements = document.querySelectorAll('.skeleton-loading');
  skeletonElements.forEach(el => el.remove());
}

/**
 * Load files and folders from service account backend
 */
const loadDriveFiles = async (refresh: boolean = false): Promise<void> => {
  updateStatus('Yhdistetään Google Drive APIin...', 'loading');
  showSkeletonLoading();

  try {
    const startTime = performance.now();
    
    // Show progress updates
    updateStatus('Ladataan harjoitusmateriaaleja...', 'loading');
    
    // Add timeout to show that something is happening
    const progressInterval = setInterval(() => {
      const elapsed = Math.round((performance.now() - startTime) / 1000);
      if (elapsed > 5) {
        updateStatus(`Ladataan... ${elapsed}s (haetaan ${state.allFiles.length || 104} tiedostoa)`, 'loading');
      }
    }, 2000);
    
    // Load both files and folders in one API call
    const data = await driveService.loadAllFilesAndFolders(refresh);
    
    clearInterval(progressInterval);
    
    const loadTime = performance.now() - startTime;
    console.log(`⚡ Loaded ${data.files.length} files, ${data.folders.length} folders in ${Math.round(loadTime)}ms ${data.cached ? '(cached)' : '(from Google Drive)'}`);

    // Update state
    state.allFiles = data.files;
    state.allFolders = data.folders;
    state.filteredFiles = [...data.files];

    // Cache folder structure immediately for better UX
    cacheFolderStructure();

    // Remove debug logging to improve performance

    hideSkeletonLoading();
    updateStatus('', 'info'); // Hide loading status
    displayFiles();
    displayFolderChips();
    updateFileCount();
    updateSessionDisplay();

    // Direct DOM update as fallback to ensure counts and chips are updated
    setTimeout(() => {
      console.log('🔧 Direct DOM update fallback - checking elements');
      
      // Check and fix the status bar counts
      const totalFilesSpan = document.getElementById('totalFiles');
      const totalFoldersSpan = document.getElementById('totalFolders');
      const currentViewSpan = document.getElementById('currentViewCount');
      
      console.log('🔍 DOM elements found:', {
        totalFiles: !!totalFilesSpan,
        totalFolders: !!totalFoldersSpan, 
        currentView: !!currentViewSpan
      });
      
      if (totalFilesSpan) {
        totalFilesSpan.textContent = state.allFiles.length.toString();
        console.log(`✅ Set totalFiles to: ${state.allFiles.length}`);
      }
      if (totalFoldersSpan) {
        totalFoldersSpan.textContent = state.allFolders.length.toString();
        console.log(`✅ Set totalFolders to: ${state.allFolders.length}`);
      }
      if (currentViewSpan) {
        currentViewSpan.textContent = state.filteredFiles.length.toString();
        console.log(`✅ Set currentView to: ${state.filteredFiles.length}`);
      }
      
      // Also try to force the updateFileCount function
      updateFileCount();
      
      console.log(`🔧 Direct update completed: ${state.allFiles.length} files, ${state.allFolders.length} folders`);
    }, 1000);

    if (files.length === 0 && folders.length === 0) {
      updateStatus('No training materials found', 'info');
      showToast(
        'No Content Found',
        'No training resources found in the Hawks folder',
        'info'
      );
    } else {
      updateStatus(
        `Successfully loaded ${files.length} files and ${folders.length} folders`,
        'success'
      );
      showToast(
        'Hawks Training Materials Loaded',
        `Found ${files.length} files and ${folders.length} folders`,
        'success'
      );
    }
  } catch (error) {
    console.error('Error loading files:', error);
    hideSkeletonLoading();
    
    updateStatus(`Error loading files: ${error.message}`, 'error');
    showToast(
      'Loading Error',
      'Failed to load training materials. Please try refreshing the page.',
      'error'
    );
  }
};

/**
 * Calculate hierarchy level for a folder (0 = top level under Hawks root)
 */
function calculateFolderLevel(folderId: string, allFolders: DriveFolder[]): number {
  const HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';
  
  if (folderId === HAWKS_FOLDER_ID) return -1; // Root folder itself
  
  const folder = allFolders.find(f => f.id === folderId);
  if (!folder || !folder.parents || folder.parents.length === 0) return 999; // Unknown/orphaned
  
  const parentId = folder.parents[0];
  if (parentId === HAWKS_FOLDER_ID) return 0; // Direct child of Hawks root
  
  // Recursively calculate parent level + 1
  return calculateFolderLevel(parentId, allFolders) + 1;
}

/**
 * Cache folder structure for quick lookups
 */
function cacheFolderStructure(): void {
  console.log('🗂️ Caching folder structure:', state.allFolders.length, 'folders,', state.allFiles.length, 'files');
  state.folderCache.clear();
  
  let foldersWithFiles = 0;
  state.allFolders.forEach((folder, index) => {
    // Simple file counting: files that have this folder as parent  
    const directFiles = state.allFiles.filter(file => 
      file.parents && file.parents.includes(folder.id)
    );
    
    // Calculate hierarchy level
    const hierarchyLevel = calculateFolderLevel(folder.id, state.allFolders);
    
    // Create extended folder object with file count and hierarchy level
    const extendedFolder = {
      ...folder,
      fileCount: directFiles.length,
      hierarchyLevel: hierarchyLevel
    };
    
    state.folderCache.set(folder.id, extendedFolder);
    
    if (directFiles.length > 0) {
      foldersWithFiles++;
    }
  });

  console.log(`✅ Cached ${state.allFolders.length} folders, ${foldersWithFiles} have files`);
}

/**
 * Display files in the UI
 */
function displayFiles(): void {
  filesList.innerHTML = '';

  if (state.filteredFiles.length === 0) {
    const isSearching = searchInput.value.trim() !== '';
    const emptyState = fileDisplayService.createEmptyState(
      isSearching,
      state.allFiles.length > 0
    );
    filesList.appendChild(emptyState);
    updatePagination();
    return;
  }

  // Get current page items
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageItems = state.filteredFiles.slice(startIndex, endIndex);

  pageItems.forEach(file => {
    const fileItem = fileDisplayService.createFileItem(file);
    filesList.appendChild(fileItem);
  });

  updatePagination();
}

/**
 * Display folder chips
 */
function displayFolderChips(): void {
  const folderChipsBar = document.getElementById('folderChipsBar');
  const folderChips = document.getElementById('folderChips');
  
  if (!folderChipsBar || !folderChips) return;

  if (state.allFolders.length === 0) {
    folderChipsBar.style.display = 'none';
    return;
  }

  folderChipsBar.style.display = 'block';
  
  // Clear existing chips
  folderChips.innerHTML = '';
  
  // Create "All Files" chip
  const allFilesChip = document.createElement('button');
  allFilesChip.className = `folder-chip ${state.currentFolderFilter === null ? 'active' : ''}`;
  allFilesChip.setAttribute('data-folder-id', '');
  allFilesChip.innerHTML = `
    <span class="folder-chip-icon">📁</span>
    <span>Kaikki tiedostot</span>
    <span class="folder-chip-count">${state.allFiles.length}</span>
  `;
  allFilesChip.onclick = () => filterByFolder(null);
  folderChips.appendChild(allFilesChip);
  
  // Create real folder chips from cached folders
  
  // Get folders with files and prioritize meaningful folder names for coaches
  const allFoldersWithFiles = Array.from(state.folderCache.values())
    .filter(folder => folder.fileCount && folder.fileCount > 0);
  
  // Prioritize folders with coaching-related terms (Finnish and English)
  const priorityTerms = [
    'harjoitus', 'practice', 'drill', 'exercise', 'treeni', 
    'suunnittelu', 'planning', 'plan', 'opetus', 'teaching',
    'taito', 'skill', 'tekniikka', 'technique', 'taktii', 'tactic'
  ];
  
  const prioritizedFolders = allFoldersWithFiles.sort((a, b) => {
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
    return b.fileCount - a.fileCount;
  });
  
  const foldersWithFiles = prioritizedFolders.slice(0, 8); // Show top 8 prioritized folders
  
  console.log(`🏒 Displaying ${foldersWithFiles.length} folder chips`);
  
  foldersWithFiles.forEach(folder => {
    const chip = document.createElement('button');
    chip.className = `folder-chip ${state.currentFolderFilter === folder.id ? 'active' : ''}`;
    chip.setAttribute('data-folder-id', folder.id);
    chip.innerHTML = `
      <span class="folder-chip-icon">📂</span>
      <span>${folder.name}</span>
      <span class="folder-chip-count">${folder.fileCount}</span>
    `;
    chip.onclick = () => filterByFolder(folder.id);
    folderChips.appendChild(chip);
  });
}

/**
 * Filter files by folder
 */
function filterByFolder(folderId: string | null): void {
  state.currentFolderFilter = folderId;
  state.currentPage = 1;

  if (!folderId) {
    // Show all files
    state.filteredFiles = [...state.allFiles];
    updateStatus(`Näytetään kaikki tiedostot (${state.allFiles.length} tiedostoa)`, 'info');
  } else {
    // Show files in specific folder and its subfolders
    console.log(`🔍 Filtering by folder ${folderId}`);
    console.log(`📊 Available: ${state.allFiles.length} files, ${state.allFolders.length} folders`);
    
    const filesInFolder = driveService.getFilesInFolder(folderId, state.allFiles, state.allFolders);
    state.filteredFiles = filesInFolder;
    
    console.log(`📄 Found ${filesInFolder.length} files in folder`);
    if (filesInFolder.length > 0) {
      console.log(`📝 Sample files:`, filesInFolder.slice(0, 3).map(f => f.name));
    }
    
    const folder = state.folderCache.get(folderId);
    const folderName = folder?.name || 'Unknown Folder';
    console.log(`📁 Folder name: ${folderName}`);
    
    updateStatus(
      `Näytetään kansio: ${folderName} ja alikansiot (${filesInFolder.length} tiedostoa)`,
      'info'
    );
  }

  displayFiles();
  displayFolderChips();
  updateFileCount();
  updateSessionDisplay();
}

/**
 * Handle search functionality
 */
function handleSearch(): void {
  const query = searchInput.value.trim().toLowerCase();
  
  if (!query) {
    filterByFolder(state.currentFolderFilter);
    return;
  }

  const baseFiles = state.currentFolderFilter 
    ? driveService.getFilesInFolder(state.currentFolderFilter, state.allFiles, state.allFolders)
    : state.allFiles;
  
  state.filteredFiles = searchService.filterFilesBySearch(baseFiles, query);
  state.currentPage = 1;
  
  updateStatus(`Hakutulokset: ${state.filteredFiles.length} tiedostoa löytyi`, 'info');
  displayFiles();
  updateFileCount();
  updateSessionDisplay();
}

/**
 * Update file count display
 */
function updateFileCount(): void {
  const totalFilesSpan = document.getElementById('totalFiles');
  const totalFoldersSpan = document.getElementById('totalFolders');
  const currentViewSpan = document.getElementById('currentViewCount');
  const fileCountSpan = document.getElementById('fileCount');

  if (totalFilesSpan) {
    totalFilesSpan.textContent = state.allFiles.length.toString();
  }
  
  if (totalFoldersSpan) {
    totalFoldersSpan.textContent = state.allFolders.length.toString();
  }
  
  if (currentViewSpan) {
    currentViewSpan.textContent = state.filteredFiles.length.toString();
  }
  
  if (fileCountSpan) {
    const message = state.filteredFiles.length === 1 
      ? '1 tiedosto löytyi' 
      : `${state.filteredFiles.length} tiedostoa löytyi`;
    fileCountSpan.textContent = message;
  }
}

/**
 * Update pagination
 */
function updatePagination(): void {
  state.totalPages = Math.ceil(state.filteredFiles.length / state.itemsPerPage);
  
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationControls = document.getElementById('paginationControls');
  
  if (!paginationInfo || !paginationControls) return;

  if (state.totalPages <= 1) {
    paginationControls.style.display = 'none';
    paginationInfo.textContent = '';
    return;
  }

  paginationControls.style.display = 'flex';
  
  const startItem = (state.currentPage - 1) * state.itemsPerPage + 1;
  const endItem = Math.min(state.currentPage * state.itemsPerPage, state.filteredFiles.length);
  
  paginationInfo.textContent = `${startItem}-${endItem} / ${state.filteredFiles.length}`;

  // Update pagination buttons
  const prevButton = document.getElementById('prevPage') as HTMLButtonElement;
  const nextButton = document.getElementById('nextPage') as HTMLButtonElement;
  
  if (prevButton) {
    prevButton.disabled = state.currentPage === 1;
    prevButton.onclick = () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        displayFiles();
      }
    };
  }
  
  if (nextButton) {
    nextButton.disabled = state.currentPage === state.totalPages;
    nextButton.onclick = () => {
      if (state.currentPage < state.totalPages) {
        state.currentPage++;
        displayFiles();
      }
    };
  }
}

/**
 * Update planning mode UI
 */
const updatePlanningModeUI = (): void => {
  const planningBar = document.getElementById('session-planning-bar');
  if (!planningBar) return;

  planningBar.style.display = sessionPlanningState.isActive ? 'flex' : 'none';

  // Update planning mode toggle button if it exists
  const toggleBtn = document.querySelector('.planning-toggle-btn');
  if (toggleBtn) {
    toggleBtn.textContent = sessionPlanningState.isActive
      ? 'Lopeta suunnittelu'
      : 'Aloita harjoitussuunnittelu';
    toggleBtn.classList.toggle('active', sessionPlanningState.isActive);
  }

  // Add visual indicators to file items
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.toggle('planning-mode', sessionPlanningState.isActive);
  });
};

/**
 * Update session display
 */
const updateSessionDisplay = (): void => {
  const sessionCount = document.getElementById('session-count');
  const sessionList = document.getElementById('session-materials-list');

  if (sessionCount) {
    sessionCount.textContent =
      sessionPlanningState.selectedFiles.size.toString();
  }

  if (sessionList) {
    sessionList.innerHTML = '';

    if (sessionPlanningState.selectedFiles.size === 0) {
      sessionList.innerHTML =
        '<div class="session-empty">Ei materiaaleja valittuna</div>';
    } else {
      Array.from(sessionPlanningState.selectedFiles).forEach(fileId => {
        const file = state.allFiles.find(f => f.id === fileId);
        if (file) {
          const item = createElement('div', 'session-material-item');
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
    const addBtn = item.querySelector('.add-to-session-btn');
    if (addBtn) {
      const fileId = addBtn.getAttribute('data-file-id');
      const isSelected =
        fileId && sessionPlanningState.selectedFiles.has(fileId);
      item.classList.toggle('in-session', !!isSelected);
      if (addBtn) {
        addBtn.textContent = isSelected ? '✓ Lisätty' : '+ Harjoitus';
        addBtn.classList.toggle('added', !!isSelected);
      }
    }
  });
};

/**
 * Initialize event listeners
 */
function initializeEventListeners(): void {
  // Search functionality
  searchInput.addEventListener('input', handleSearch);
  
  // Refresh button - force refresh with bypass cache
  refreshButton.addEventListener('click', () => loadDriveFiles(true));

  // Auto-refresh (optional)
  if (AUTO_REFRESH_INTERVAL > 0) {
    setInterval(loadDriveFiles, AUTO_REFRESH_INTERVAL);
  }

  console.log('Event listeners initialized');
}

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  console.log('🏒 Hawks Coach Hub - Service Account Version initializing...');
  
  // Initialize toast notifications
  initializeToastContainer();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Remove auth-related UI elements
  const authElements = document.querySelectorAll('#authorize_div, #signout_div');
  authElements.forEach(el => el.style.display = 'none');
  
  // Load files immediately (no auth required)
  await loadDriveFiles();
  
  console.log('✅ Hawks Coach Hub initialized successfully');
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);