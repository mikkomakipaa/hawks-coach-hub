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

// DOM Elements
const searchInput = getDOMElement('searchInput') as HTMLInputElement;
const refreshButton = getDOMElement('refreshButton') as HTMLButtonElement;
const filesList = getDOMElement('allFilesList') as HTMLDivElement;

/**
 * Update status display
 */
function updateStatus(message: string, type: StatusType = 'info'): void {
  console.log(`Status: ${message} (${type})`);
  
  // Status display elements might not exist in simplified version
  const statusElements = document.querySelectorAll('[id*="status"], .status');
  statusElements.forEach(element => {
    if (element instanceof HTMLElement) {
      element.textContent = message;
      element.className = `status ${type}`;
    }
  });
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
const loadDriveFiles = async (): Promise<void> => {
  updateStatus('Loading Hawks training materials...', 'loading');
  showSkeletonLoading();

  try {
    // Load both files and folders in one API call
    const { files, folders } = await driveService.loadAllFilesAndFolders();

    console.log(`Loaded ${files.length} files and ${folders.length} folders`);

    // Update state
    state.allFiles = files;
    state.allFolders = folders;
    state.filteredFiles = [...files];

    // Debug state update
    console.log('🔄 State updated:', {
      allFiles: state.allFiles.length,
      allFolders: state.allFolders.length,
      filteredFiles: state.filteredFiles.length
    });

    // Debug logging
    console.log(`🏒 Loaded from Hawks backend:`, {
      files: files.length,
      folders: folders.length,
      sampleFiles: files.slice(0, 3).map(f => f.name),
      sampleFolders: folders.slice(0, 3).map(f => f.name)
    });

    // Debug file parent structure  
    console.log('📄 Sample file parents:', files.slice(0, 5).map(f => ({ 
      name: f.name, 
      parents: f.parents 
    })));
    
    // Debug folder structure
    console.log('📁 Sample folder info:', folders.slice(0, 5).map(f => ({ 
      name: f.name, 
      id: f.id,
      parents: f.parents
    })));

    // Cache folder structure with file counts
    cacheFolderStructure();

    hideSkeletonLoading();
    displayFiles();
    displayFolderChips();
    updateFileCount();

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
 * Cache folder structure for quick lookups
 */
function cacheFolderStructure(): void {
  console.log('🗂️ Starting folder caching for ALL folders...');
  state.folderCache.clear();
  
  console.log(`📊 Processing ${state.allFolders.length} folders and ${state.allFiles.length} files`);
  
  let foldersWithFiles = 0;
  state.allFolders.forEach((folder, index) => {
    // Simple file counting: files that have this folder as parent  
    const directFiles = state.allFiles.filter(file => 
      file.parents && file.parents.includes(folder.id)
    );
    
    // Create extended folder object with file count
    const extendedFolder = {
      ...folder,
      fileCount: directFiles.length
    };
    
    state.folderCache.set(folder.id, extendedFolder);
    
    if (directFiles.length > 0) {
      foldersWithFiles++;
      console.log(`📁 [${index + 1}] ${folder.name}: ${directFiles.length} files`);
      if (index < 10) { // Only show first 10 to avoid spam
        console.log(`   📄 Sample files: ${directFiles.slice(0, 2).map(f => f.name).join(', ')}`);
      }
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
  console.log('📁 displayFolderChips called, allFolders.length:', state.allFolders.length);
  
  const folderChipsBar = document.getElementById('folderChipsBar');
  const folderChips = document.getElementById('folderChips');
  
  if (!folderChipsBar || !folderChips) {
    console.log('❌ folderChipsBar or folderChips element not found');
    return;
  }

  if (state.allFolders.length === 0) {
    console.log('ℹ️ No folders to display, hiding chips bar');
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
  console.log('🗂️ Creating real folder chips from cache');
  console.log(`📊 Available cached folders: ${state.folderCache.size}`);
  
  // Get folders with file counts > 0 and sort by file count (most files first)
  const foldersWithFiles = Array.from(state.folderCache.values())
    .filter(folder => folder.fileCount && folder.fileCount > 0)
    .sort((a, b) => b.fileCount - a.fileCount) // Sort by file count descending
    .slice(0, 8); // Show top 8 folders with most files
  
  console.log(`🔍 Found ${foldersWithFiles.length} folders with files:`, 
    foldersWithFiles.map(f => `${f.name}: ${f.fileCount}`));
  
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
    
    console.log(`✅ Created chip: ${folder.name} (${folder.fileCount} files)`);
  });
  
  console.log(`📋 Created ${foldersWithFiles.length} real folder chips`);
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
}

/**
 * Handle search functionality
 */
function handleSearch(): void {
  const query = searchInput.value.trim().toLowerCase();
  console.log(`🔍 Search query: "${query}"`);
  
  if (!query) {
    // If search is cleared, apply current folder filter
    console.log('🔄 Search cleared, restoring folder filter');
    filterByFolder(state.currentFolderFilter);
    return;
  }

  const baseFiles = state.currentFolderFilter 
    ? driveService.getFilesInFolder(state.currentFolderFilter, state.allFiles, state.allFolders)
    : state.allFiles;

  console.log(`📊 Searching in ${baseFiles.length} files`);
  
  state.filteredFiles = searchService.filterFilesBySearch(baseFiles, query);
  state.currentPage = 1;
  
  console.log(`📄 Found ${state.filteredFiles.length} matching files`);
  
  updateStatus(`Hakutulokset: ${state.filteredFiles.length} tiedostoa löytyi`, 'info');
  displayFiles();
  updateFileCount();
}

/**
 * Update file count display
 */
function updateFileCount(): void {
  console.log('🔢 Updating file count:', {
    allFiles: state.allFiles.length,
    allFolders: state.allFolders.length,
    filteredFiles: state.filteredFiles.length
  });

  const totalFilesSpan = document.getElementById('totalFiles');
  const totalFoldersSpan = document.getElementById('totalFolders');
  const currentViewSpan = document.getElementById('currentViewCount');
  const fileCountSpan = document.getElementById('fileCount');

  if (totalFilesSpan) {
    totalFilesSpan.textContent = state.allFiles.length.toString();
    console.log('✅ Updated totalFiles to:', state.allFiles.length);
  } else {
    console.log('❌ totalFiles element not found');
  }
  
  if (totalFoldersSpan) {
    totalFoldersSpan.textContent = state.allFolders.length.toString();
    console.log('✅ Updated totalFolders to:', state.allFolders.length);
  } else {
    console.log('❌ totalFolders element not found');
  }
  
  if (currentViewSpan) {
    currentViewSpan.textContent = state.filteredFiles.length.toString();
    console.log('✅ Updated currentViewCount to:', state.filteredFiles.length);
  } else {
    console.log('❌ currentViewCount element not found');
  }
  
  if (fileCountSpan) {
    const message = state.filteredFiles.length === 1 
      ? '1 tiedosto löytyi' 
      : `${state.filteredFiles.length} tiedostoa löytyi`;
    fileCountSpan.textContent = message;
    console.log('✅ Updated fileCount to:', message);
  } else {
    console.log('❌ fileCount element not found');
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
 * Initialize event listeners
 */
function initializeEventListeners(): void {
  // Search functionality
  searchInput.addEventListener('input', handleSearch);
  
  // Refresh button
  refreshButton.addEventListener('click', loadDriveFiles);

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