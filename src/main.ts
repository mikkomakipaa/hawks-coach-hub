/**
 * Hawks Coach Hub - Main Application Entry Point
 * Modern TypeScript implementation with ES modules
 */

import type {
  DriveFile,
  DriveFolder,
  TokenClient,
  StatusType,
} from '@/types/google-apis';
import { getDOMElement, createElement } from '@/utils/dom';
import {
  CLIENT_ID,
  API_KEY,
  SCOPES,
  AUTO_REFRESH_INTERVAL,
  API_LOADING_TIMEOUT,
  API_LOADING_INTERVAL,
  isCredentialsConfigured,
  validateAPIKey,
} from '@/utils/config';
import { initializeToastContainer, showToast } from '@/components/toast';
import { DriveApiService } from '@/services/drive-api';
import { FileDisplayService } from '@/components/file-display';
import { SearchService } from '@/utils/search';
import {
  FolderBrowserService,
  type FolderTreeNode,
} from '@/components/folder-browser';

// Application State
interface AppState {
  tokenClient: TokenClient | null;
  gapiInited: boolean;
  gisInited: boolean;
  accessToken: string;
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
  tokenClient: null,
  gapiInited: false,
  gisInited: false,
  accessToken: '',
  allFiles: [],
  filteredFiles: [],
  allFolders: [],
  folderCache: new Map(),
  currentFolderFilter: null,
  currentPage: 1,
  itemsPerPage: 50,
  totalPages: 1,
};

// Services
const driveApiService = new DriveApiService();
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
  // eslint-disable-next-line no-unused-vars
  interface Window {
    FileActions: {
      // eslint-disable-next-line no-unused-vars
      addToSession: (fileId: string) => void;
      // eslint-disable-next-line no-unused-vars
      downloadFile: (url: string) => void;
      togglePlanningMode: () => void;
      exportSession: () => void;
      // eslint-disable-next-line no-unused-vars
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
    // Track recent access
    const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    const fileId = url.split('/d/')[1]?.split('/')[0];
    if (fileId && !recentFiles.includes(fileId)) {
      recentFiles.unshift(fileId);
      if (recentFiles.length > 10) recentFiles.pop(); // Keep only 10 recent files
      localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
    }

    window.open(url, '_blank');
    showToast(
      'Avataan tiedosto',
      'Tiedosto avautuu uudessa välilehdessä',
      'info',
      2000
    );
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
      .map(file => `• ${file!.name}`)
      .join('\n');

    const sessionData = `HAWKS HARJOITUSSUUNNITELMA
Luotu: ${new Date().toLocaleDateString('fi-FI')}

MATERIAALIT (${sessionPlanningState.selectedFiles.size} kpl):
${selectedFilesList}

---
Luotu Hawks Valmennuskeskuksessa`;

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
        // Fallback for browsers that don't support clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = sessionData;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(
          'Suunnitelma kopioitu',
          'Harjoitussuunnitelma kopioitu leikepöydälle',
          'success',
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

// Session planning UI helper functions
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

  // Update file items visual state
  document.querySelectorAll('.file-item').forEach(item => {
    const addBtn = item.querySelector('.session-add-btn') as HTMLButtonElement;
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

// DOM Elements
let authorizeDiv: HTMLElement;
let signoutDiv: HTMLElement;
let authorizeButton: HTMLButtonElement;
let signoutButton: HTMLButtonElement;
let statusDiv: HTMLElement;
let statusText: HTMLElement;
let searchInput: HTMLInputElement;
let refreshButton: HTMLButtonElement;
let allFilesList: HTMLElement;
let fileCountBadge: HTMLElement;
let mainSectionTitle: HTMLElement;
let currentViewCountEl: HTMLElement;
let folderChipsBar: HTMLElement;
let folderChips: HTMLElement;
// Pagination elements
let paginationInfo: HTMLElement;
let paginationControls: HTMLElement;
let prevPageBtn: HTMLButtonElement;
let nextPageBtn: HTMLButtonElement;
let paginationPages: HTMLElement;

const initializeDOMElements = (): void => {
  try {
    authorizeDiv = getDOMElement('authorize_div');
    signoutDiv = getDOMElement('signout_div');
    authorizeButton = getDOMElement('authorize_button');
    signoutButton = getDOMElement('signout_button');
    statusDiv = getDOMElement('statusText')?.parentElement || document.body;
    statusText = getDOMElement('statusText');
    searchInput = getDOMElement('searchInput');
    refreshButton = getDOMElement('refreshButton');
    allFilesList = getDOMElement('allFilesList');
    fileCountBadge = getDOMElement('fileCount');
    mainSectionTitle = getDOMElement('mainSectionTitle');
    currentViewCountEl = getDOMElement('currentViewCount');
    folderChipsBar = getDOMElement('folderChipsBar');
    folderChips = getDOMElement('folderChips');
    // Pagination elements
    paginationInfo = getDOMElement('paginationInfo');
    paginationControls = getDOMElement('paginationControls');
    prevPageBtn = getDOMElement('prevPage');
    nextPageBtn = getDOMElement('nextPage');
    paginationPages = getDOMElement('paginationPages');

    initializeToastContainer();
  } catch (error) {
    console.error('Failed to initialize DOM elements:', error);
    throw error;
  }
};

const updateStatus = (message: string, type: StatusType = 'info'): void => {
  if (statusText) {
    statusText.textContent = message;
  }

  if (statusDiv) {
    statusDiv.classList.remove(
      'loading',
      'success',
      'error',
      'info',
      'warning'
    );
    statusDiv.classList.add(type);
  }
};

const setupEventListeners = (): void => {
  authorizeButton.addEventListener('click', handleAuthClick);
  signoutButton.addEventListener('click', handleSignoutClick);
  refreshButton.addEventListener('click', refreshFiles);
  searchInput.addEventListener('input', handleSearch);

  // Folder chips event delegation
  folderChips.addEventListener('click', handleFolderChipClick);

  // Pagination event listeners
  prevPageBtn.addEventListener('click', () => goToPage(state.currentPage - 1));
  nextPageBtn.addEventListener('click', () => goToPage(state.currentPage + 1));
  paginationPages.addEventListener('click', handlePageClick);
};

const setupAutoRefresh = (): void => {
  setInterval(() => {
    if (state.accessToken) {
      void refreshFiles();
    }
  }, AUTO_REFRESH_INTERVAL);
};

const checkAPIsLoaded = (): void => {
  let attempts = 0;

  updateStatus('Loading Google APIs...', 'loading');

  const checkInterval = setInterval(() => {
    attempts++;

    console.log(`API loading check ${attempts}/${API_LOADING_TIMEOUT}:`, {
      gapi: typeof gapi !== 'undefined',
      google: typeof google !== 'undefined',
      accounts: typeof google !== 'undefined' && google.accounts,
    });

    if (
      typeof gapi !== 'undefined' &&
      typeof google !== 'undefined' &&
      google.accounts
    ) {
      clearInterval(checkInterval);
      console.log('All Google APIs loaded successfully');
      void initializeGoogleAPIs();
    } else if (attempts >= API_LOADING_TIMEOUT) {
      clearInterval(checkInterval);
      const errorMsg = `Failed to load Google APIs after ${(API_LOADING_TIMEOUT * API_LOADING_INTERVAL) / 1000} seconds. Please check your internet connection and refresh the page.`;
      updateStatus(errorMsg, 'error');
      showToast('Loading Timeout', errorMsg, 'error');

      setTimeout(() => {
        showToast(
          'Retry Available',
          'Click refresh to retry loading Google APIs',
          'info',
          0
        );
      }, 2000);
    }
  }, API_LOADING_INTERVAL);
};

const initializeGoogleAPIs = async (): Promise<void> => {
  try {
    if (!isCredentialsConfigured()) {
      const credentialsMsg =
        'Please configure your Google API credentials. See README.md for setup instructions.';
      updateStatus(credentialsMsg, 'error');
      showToast('Configuration Required', credentialsMsg, 'warning', 0);
      return;
    }

    updateStatus('Initializing Google Drive API...', 'loading');

    // Initialize GAPI client
    await new Promise<void>((resolve, reject) => {
      if (typeof gapi === 'undefined') {
        reject(new Error('Google API library not loaded'));
        return;
      }

      gapi.load('client', {
        callback: () => {
          console.log('GAPI client loaded successfully');
          resolve();
        },
        onerror: (error: any) => {
          console.error('GAPI client load error:', error);
          reject(new Error('Failed to load GAPI client'));
        },
      });
    });

    // Validate API key format
    if (!validateAPIKey(API_KEY)) {
      throw new Error(
        'Invalid API key format. Please check your Google Cloud Console configuration.'
      );
    }

    // Initialize without discovery docs first (more reliable)
    await gapi.client.init({
      apiKey: API_KEY,
    });

    // Load the Drive API manually
    await gapi.client.load('drive', 'v3');

    state.gapiInited = true;
    console.log('GAPI client initialized successfully');

    // Initialize Google Identity Services
    if (typeof google === 'undefined' || !google.accounts) {
      throw new Error('Google Identity Services not loaded');
    }

    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      throw new Error(
        'CLIENT_ID not configured. Please set your Google Client ID.'
      );
    }

    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
    });

    state.gisInited = true;
    console.log('Google Identity Services initialized successfully');

    maybeEnableButtons();
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    const errorMsg = `Failed to initialize Google APIs: ${(error as Error).message}`;
    updateStatus(errorMsg, 'error');
    showToast('Initialization Failed', errorMsg, 'error');

    // Provide more specific error guidance
    const message = (error as Error).message;
    if (message.includes('API key') || message.includes('Invalid')) {
      const keyMsg =
        'Invalid API key. Please check your Google Cloud Console configuration and ensure the API key is enabled for Google Drive API.';
      showToast('Configuration Error', keyMsg, 'error');
    } else if (
      message.includes('load') ||
      message.includes('network') ||
      message.includes('discovery')
    ) {
      const networkMsg =
        'Network error loading Google APIs. Please check your internet connection and try refreshing.';
      showToast('Connection Issue', networkMsg, 'error');
    } else if (message.includes('CORS') || message.includes('origin')) {
      const corsMsg =
        'Domain not authorized. Please add your domain to authorized JavaScript origins in Google Cloud Console.';
      showToast('Authorization Error', corsMsg, 'error');
    }
  }
};

const maybeEnableButtons = (): void => {
  console.log('Checking if APIs are ready:', {
    gapiInited: state.gapiInited,
    gisInited: state.gisInited,
  });

  if (state.gapiInited && state.gisInited) {
    console.log('Both APIs initialized - enabling sign-in button');
    authorizeDiv.style.display = 'block';
    signoutDiv.style.display = 'none';
    updateStatus('Ready to sign in with Google Drive', 'info');
    showToast(
      'Ready to Sign In',
      'Google APIs loaded successfully',
      'success',
      3000
    );
  } else {
    updateStatus('Initializing Google APIs...', 'loading');
  }
};

const handleAuthClick = (): void => {
  console.log('Sign in button clicked');

  if (!state.gapiInited || !state.gisInited) {
    const errorMsg =
      'Google APIs not fully initialized yet. Please wait or refresh the page.';
    updateStatus(errorMsg, 'error');
    showToast('Not Ready', errorMsg, 'warning');
    return;
  }

  if (!state.tokenClient) {
    const errorMsg =
      'Authentication client not initialized. Please refresh the page.';
    updateStatus(errorMsg, 'error');
    showToast('Authentication Error', errorMsg, 'error');
    return;
  }

  console.log('Starting authentication flow...');
  updateStatus('Starting sign-in process...', 'loading');

  state.tokenClient.callback = async resp => {
    console.log('Authentication response received:', resp);

    if (resp.error) {
      console.error('Authentication error:', resp.error);
      const errorMsg = `Authorization failed: ${resp.error}`;
      updateStatus(errorMsg, 'error');
      showToast('Authentication Failed', errorMsg, 'error');
      return;
    }

    console.log('Authentication successful, loading files...');
    state.accessToken = resp.access_token;
    signoutDiv.style.display = 'block';
    authorizeDiv.style.display = 'none';
    showToast(
      'Authentication Successful',
      'Successfully connected to Google Drive',
      'success'
    );

    try {
      await loadDriveFiles();
    } catch (error) {
      console.error('Error loading files after authentication:', error);
      updateStatus(
        `Authentication successful but failed to load files: ${(error as Error).message}`,
        'error'
      );
    }
  };

  try {
    const existingToken = gapi.client.getToken();
    if (existingToken === null) {
      console.log(
        'No existing token, requesting new access token with consent'
      );
      state.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      console.log('Existing token found, requesting access token');
      state.tokenClient.requestAccessToken({ prompt: '' });
    }
  } catch (error) {
    console.error('Error requesting access token:', error);
    updateStatus(
      `Error starting authentication: ${(error as Error).message}`,
      'error'
    );
    showToast(
      'Authentication Error',
      'Failed to start sign-in process',
      'error'
    );
  }
};

const handleSignoutClick = (): void => {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
  state.accessToken = '';
  signoutDiv.style.display = 'none';
  authorizeDiv.style.display = 'block';
  clearFilesList();
  updateStatus('Signed out', 'info');
  showToast(
    'Signed Out',
    'Successfully disconnected from Google Drive',
    'info'
  );
};

const loadDriveFiles = async (): Promise<void> => {
  updateStatus('Loading files from Google Drive...', 'loading');
  showSkeletonLoading();

  try {
    // Load files and folders in parallel
    const [files, folders] = await Promise.all([
      driveApiService.loadAllFiles(),
      driveApiService.loadAllFolders(),
    ]);

    console.log(`Loaded ${files.length} files and ${folders.length} folders`);

    state.allFiles = files;
    state.allFolders = folders;
    state.filteredFiles = [...files];

    // Cache folder structure with file counts
    cacheFolderStructure();

    hideSkeletonLoading();
    displayFiles();
    displayFolderChips();
    updateFileCount();

    if (files.length === 0 && folders.length === 0) {
      updateStatus('No files or folders found', 'info');
      showToast(
        'No Content Found',
        'No training resources found in your Google Drive',
        'info'
      );
    } else {
      updateStatus(
        `Successfully loaded ${files.length} files and ${folders.length} folders`,
        'success'
      );
      showToast(
        'Content Loaded',
        `Found ${files.length} files and ${folders.length} folders`,
        'success'
      );
    }
  } catch (error) {
    console.error('Error loading files:', error);
    hideSkeletonLoading();
    const errorMsg = `Error loading files: ${(error as Error).message}`;
    updateStatus(errorMsg, 'error');
    showToast('Loading Failed', errorMsg, 'error');
  }
};

const clearFilesList = (): void => {
  allFilesList.innerHTML = '';

  state.allFiles = [];
  state.filteredFiles = [];
  state.allFolders = [];
  state.folderCache.clear();
  state.currentFolderFilter = null;
  state.currentPage = 1;
};

const performSearch = (): void => {
  const searchTerm = searchInput.value.trim();

  state.filteredFiles = searchService.filterFiles(
    state.allFiles,
    searchTerm,
    state.currentFolderFilter,
    state.folderCache
  );

  // Reset to first page when search changes
  state.currentPage = 1;
  displayFiles();
  updateFileCount();
};

// Create debounced search handler
const debouncedSearch = searchService.debounce(performSearch, 300);

const handleSearch = (): void => {
  debouncedSearch();
};

const refreshFiles = async (): Promise<void> => {
  if (!state.gapiInited || !state.gisInited) {
    showToast(
      'Reinitializing',
      'Attempting to reload Google APIs...',
      'info',
      3000
    );
    updateStatus('Reinitializing Google APIs...', 'loading');

    state.gapiInited = false;
    state.gisInited = false;
    checkAPIsLoaded();
    return;
  }

  if (state.accessToken) {
    showToast(
      'Refreshing Files',
      'Updating your training resources...',
      'info',
      2000
    );
    updateStatus('Refreshing files...', 'loading');
    await loadDriveFiles();
  } else {
    showToast(
      'Not Authenticated',
      'Please sign in to refresh files',
      'warning'
    );
    updateStatus('Please sign in to access your files', 'info');
  }
};

// Application initialization
const initializeApp = (): void => {
  console.log('Initializing Hawks Coach Hub...');

  try {
    initializeDOMElements();
    setupEventListeners();
    setupAutoRefresh();
    updateStatus('Loading Google APIs...', 'loading');

    // Reset initialization flags
    state.gapiInited = false;
    state.gisInited = false;

    // Wait for APIs to load
    checkAPIsLoaded();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    updateStatus('Failed to initialize application', 'error');
    showToast(
      'Initialization Error',
      'Application failed to start properly',
      'error'
    );
  }
};

// Display functions
const showSkeletonLoading = (): void => {
  allFilesList.innerHTML = '';

  // Create skeleton items for main list
  for (let i = 0; i < 8; i++) {
    const skeleton = fileDisplayService.createSkeletonItem();
    allFilesList.appendChild(skeleton);
  }
};

const hideSkeletonLoading = (): void => {
  const skeletons = document.querySelectorAll(
    '.skeleton-item, .skeleton-category'
  );
  skeletons.forEach(skeleton => skeleton.remove());
};

// Pagination functions
const updatePagination = (): void => {
  const totalItems = state.filteredFiles.length;
  state.totalPages = Math.ceil(totalItems / state.itemsPerPage);

  // Reset to page 1 if current page is beyond total pages
  if (state.currentPage > state.totalPages && state.totalPages > 0) {
    state.currentPage = 1;
  }

  updatePaginationInfo();
  updatePaginationControls();
};

const updatePaginationInfo = (): void => {
  const totalItems = state.filteredFiles.length;
  const startItem =
    totalItems > 0 ? (state.currentPage - 1) * state.itemsPerPage + 1 : 0;
  const endItem = Math.min(state.currentPage * state.itemsPerPage, totalItems);

  if (paginationInfo) {
    const infoText =
      totalItems > 0 ? `Näytetään ${startItem}-${endItem} / ${totalItems}` : '';
    paginationInfo.textContent = infoText;
  }
};

const updatePaginationControls = (): void => {
  if (!paginationControls) return;

  // Show/hide pagination controls
  if (state.totalPages <= 1) {
    paginationControls.style.display = 'none';
    return;
  }

  paginationControls.style.display = 'flex';

  // Update prev/next buttons
  prevPageBtn.disabled = state.currentPage <= 1;
  nextPageBtn.disabled = state.currentPage >= state.totalPages;

  // Update page numbers
  updatePageNumbers();
};

const updatePageNumbers = (): void => {
  if (!paginationPages) return;

  paginationPages.innerHTML = '';

  const maxVisiblePages = 5;
  let startPage = Math.max(
    1,
    state.currentPage - Math.floor(maxVisiblePages / 2)
  );
  const endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);

  // Adjust start if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add first page if not visible
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      addPageEllipsis();
    }
  }

  // Add visible pages
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  // Add last page if not visible
  if (endPage < state.totalPages) {
    if (endPage < state.totalPages - 1) {
      addPageEllipsis();
    }
    addPageButton(state.totalPages);
  }
};

const addPageButton = (pageNum: number): void => {
  const button = createElement('button', 'pagination-page');
  button.textContent = pageNum.toString();
  if (pageNum === state.currentPage) {
    button.classList.add('active');
  }
  button.setAttribute('data-page', pageNum.toString());
  paginationPages.appendChild(button);
};

const addPageEllipsis = (): void => {
  const ellipsis = createElement('span', 'pagination-ellipsis');
  ellipsis.textContent = '...';
  ellipsis.style.padding = '0.5rem 0.25rem';
  ellipsis.style.color = 'var(--neutral-medium)';
  paginationPages.appendChild(ellipsis);
};

const goToPage = (page: number): void => {
  if (page < 1 || page > state.totalPages) return;

  state.currentPage = page;
  displayFiles();
  updatePaginationControls();
  updateFileCount();

  // Scroll to top of file list
  allFilesList.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const handlePageClick = (event: Event): void => {
  const target = event.target as HTMLElement;
  if (target.classList.contains('pagination-page')) {
    const page = parseInt(target.getAttribute('data-page') || '1', 10);
    goToPage(page);
  }
};

const displayFiles = (): void => {
  allFilesList.innerHTML = '';

  if (state.filteredFiles.length === 0) {
    const isSearching = searchInput.value.trim() !== '';
    const emptyState = fileDisplayService.createEmptyState(
      isSearching,
      state.allFiles.length > 0
    );
    allFilesList.appendChild(emptyState);
    updatePagination();
    return;
  }

  // Get current page items
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageItems = state.filteredFiles.slice(startIndex, endIndex);

  pageItems.forEach(file => {
    const fileItem = fileDisplayService.createFileItem(file);
    allFilesList.appendChild(fileItem);
  });

  updatePagination();
};

const displayFolderChips = (): void => {
  if (!folderChips || !folderChipsBar) return;

  // Build folder tree to get organized hierarchy
  folderBrowserService.initialize(state.allFolders, state.folderCache);
  const folderTree = folderBrowserService.buildFolderTree();

  // Clear existing chips
  folderChips.innerHTML = '';

  // Create "All Files" chip
  const allFilesChip = createElement(
    'button',
    `folder-chip ${state.currentFolderFilter === null ? 'active' : ''}`
  );
  allFilesChip.setAttribute('data-folder-id', '');
  allFilesChip.innerHTML = `
    <span class="folder-chip-icon">📁</span>
    <span>Kaikki tiedostot</span>
    <span class="folder-chip-count">${state.allFiles.length}</span>
  `;
  folderChips.appendChild(allFilesChip);

  // Add chips for root folders and their immediate children
  const addFolderChips = (folders: FolderTreeNode[], level = 0) => {
    if (level > 1) return; // Limit to 2 levels for horizontal space

    folders.forEach(folder => {
      const chip = createElement(
        'button',
        `folder-chip ${state.currentFolderFilter === folder.id ? 'active' : ''}`
      );
      chip.setAttribute('data-folder-id', folder.id);

      const folderData = state.folderCache.get(folder.id);
      const fileCount = folderData?.fileCount || 0;
      const indent = level > 0 ? '└ ' : '';

      chip.innerHTML = `
        <span class="folder-chip-icon">${level > 0 ? '📄' : '📁'}</span>
        <span>${indent}${folder.name}</span>
        <span class="folder-chip-count">${fileCount}</span>
      `;

      folderChips.appendChild(chip);

      // Add immediate children for root folders
      if (level === 0 && folder.children.length > 0) {
        addFolderChips(folder.children.slice(0, 3), level + 1); // Limit to 3 children
      }
    });
  };

  addFolderChips(folderTree);

  // Show the chips bar
  folderChipsBar.style.display = 'block';

  console.log(`Displayed ${folderTree.length} folder chips`);
};

const getRecursiveFileCountForFolder = (folderId: string): number => {
  // Get direct files in this folder
  const directFiles = driveApiService.getFilesInFolder(
    folderId,
    state.allFiles,
    state.allFolders
  );

  // Get all child folder IDs recursively
  const getChildFolderIds = (parentId: string): string[] => {
    const childIds: string[] = [];
    state.allFolders.forEach(folder => {
      if (folder.parents && folder.parents.includes(parentId)) {
        childIds.push(folder.id);
        // Recursively get grandchildren
        childIds.push(...getChildFolderIds(folder.id));
      }
    });
    return childIds;
  };

  // Count files in all child folders
  const childFolderIds = getChildFolderIds(folderId);
  let childFileCount = 0;
  childFolderIds.forEach(childId => {
    const childFiles = driveApiService.getFilesInFolder(
      childId,
      state.allFiles,
      state.allFolders
    );
    childFileCount += childFiles.length;
  });

  return directFiles.length + childFileCount;
};

const cacheFolderStructure = (): void => {
  state.folderCache.clear();

  state.allFolders.forEach(folder => {
    const folderFiles = driveApiService.getFilesInFolder(
      folder.id,
      state.allFiles,
      state.allFolders
    );

    // Calculate recursive file count for display purposes
    const recursiveFileCount = getRecursiveFileCountForFolder(folder.id);

    state.folderCache.set(folder.id, {
      ...folder,
      fileCount: recursiveFileCount, // Show total files including subfolders
      files: folderFiles, // Keep direct files for compatibility
    });
  });

  console.log(
    `Cached ${state.folderCache.size} folders with recursive file counts`
  );
};

const updateFileCount = (): void => {
  const count = state.filteredFiles.length;
  if (fileCountBadge) {
    fileCountBadge.textContent = `${count} tiedosto${count !== 1 ? 'a' : ''} löytyi`;
  }

  // Update current view count
  if (currentViewCountEl) {
    currentViewCountEl.textContent = count.toString();
  }
};

const handleFolderChipClick = (event: Event): void => {
  const target = event.target as HTMLElement;
  const chip = target.closest('.folder-chip') as HTMLElement;

  if (chip) {
    event.preventDefault();
    const folderId = chip.getAttribute('data-folder-id');
    selectFolder(folderId === '' ? null : folderId);
  }
};

const getFilesInFolderRecursive = (folderId: string): DriveFile[] => {
  const files: DriveFile[] = [];

  // Get direct files in this folder
  const folderData = state.folderCache.get(folderId);
  if (folderData?.files) {
    files.push(...folderData.files);
  }

  // Get files from all child folders recursively
  const getChildFolderIds = (parentId: string): string[] => {
    const childIds: string[] = [];
    state.allFolders.forEach(folder => {
      if (folder.parents && folder.parents.includes(parentId)) {
        childIds.push(folder.id);
        // Recursively get grandchildren
        childIds.push(...getChildFolderIds(folder.id));
      }
    });
    return childIds;
  };

  const childFolderIds = getChildFolderIds(folderId);
  childFolderIds.forEach(childId => {
    const childFolderData = state.folderCache.get(childId);
    if (childFolderData?.files) {
      files.push(...childFolderData.files);
    }
  });

  return files;
};

const selectFolder = (folderId: string | null): void => {
  if (folderId) {
    const folderData = state.folderCache.get(folderId);
    const folderName = folderData?.name || 'Kansio';

    state.currentFolderFilter = folderId;
    folderBrowserService.setCurrentFolder(folderId);

    // Update folder chips to show active state
    displayFolderChips();

    // Filter files to show those in selected folder and ALL subfolders
    state.filteredFiles = getFilesInFolderRecursive(folderId);

    // Update section title
    if (mainSectionTitle) {
      mainSectionTitle.textContent = `📁 ${folderName} + alikansiot`;
    }

    updateStatus(
      `Näytetään kansio: ${folderName} ja alikansiot (${state.filteredFiles.length} tiedostoa)`,
      'info'
    );
    showToast(
      'Kansio valittu',
      `${folderName} + alikansiot - ${state.filteredFiles.length} tiedostoa`,
      'info',
      2000
    );
  } else {
    // Show all files
    state.currentFolderFilter = null;
    folderBrowserService.setCurrentFolder(null);
    state.filteredFiles = [...state.allFiles];

    // Update folder chips to show active state
    displayFolderChips();

    if (mainSectionTitle) {
      mainSectionTitle.textContent = 'Kaikki tiedostot';
    }

    updateStatus(
      `Näytetään kaikki tiedostot (${state.filteredFiles.length} tiedostoa)`,
      'info'
    );
  }

  // Apply search filter if active
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    state.filteredFiles = searchService.filterFilesBySearch(
      state.filteredFiles,
      searchTerm
    );
  }

  // Reset to first page when folder selection changes
  state.currentPage = 1;

  // Update displays
  displayFiles();
  updateFileCount();
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
