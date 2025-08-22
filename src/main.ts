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
import { FolderBrowserService } from '@/components/folder-browser';

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
};

// Services
const driveApiService = new DriveApiService();
const fileDisplayService = new FileDisplayService();
const searchService = new SearchService();
const folderBrowserService = new FolderBrowserService();

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
let categoriesList: HTMLElement;
let fileCountBadge: HTMLElement;
let foldersContainer: HTMLElement;
let toggleFolderBrowser: HTMLButtonElement;
let mainSectionTitle: HTMLElement;
let totalFilesEl: HTMLElement;
let totalFoldersEl: HTMLElement;
let currentViewCountEl: HTMLElement;
let allFilesCount: HTMLElement;

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
    categoriesList = getDOMElement('categoriesList');
    fileCountBadge = getDOMElement('fileCount');
    foldersContainer = getDOMElement('foldersContainer');
    toggleFolderBrowser = getDOMElement('toggleFolderBrowser');
    mainSectionTitle = getDOMElement('mainSectionTitle');
    totalFilesEl = getDOMElement('totalFiles');
    totalFoldersEl = getDOMElement('totalFolders');
    currentViewCountEl = getDOMElement('currentViewCount');
    allFilesCount = getDOMElement('allFilesCount');

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
  toggleFolderBrowser.addEventListener('click', handleToggleFolderBrowser);

  // Folder browser event delegation
  foldersContainer.addEventListener('click', handleFolderClick);

  // All files selection
  const allFilesItem = document.querySelector('.folder-item.all-files');
  allFilesItem?.addEventListener('click', () => selectFolder(null));
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
    displayCategories();
    displayFolderNavigation();
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
  if (categoriesList) {
    categoriesList.innerHTML = '';
  }

  state.allFiles = [];
  state.filteredFiles = [];
  state.allFolders = [];
  state.folderCache.clear();
  state.currentFolderFilter = null;
};

const performSearch = (): void => {
  const searchTerm = searchInput.value.trim();

  state.filteredFiles = searchService.filterFiles(
    state.allFiles,
    searchTerm,
    state.currentFolderFilter,
    state.folderCache
  );

  displayFiles();
  displayCategories();
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
  if (categoriesList) categoriesList.innerHTML = '';

  // Create skeleton items for main list
  for (let i = 0; i < 8; i++) {
    const skeleton = fileDisplayService.createSkeletonItem();
    allFilesList.appendChild(skeleton);
  }

  // Create skeleton for categories
  if (categoriesList) {
    for (let i = 0; i < 3; i++) {
      const categorySkeleton = fileDisplayService.createCategorySkeleton();
      categoriesList.appendChild(categorySkeleton);
    }
  }
};

const hideSkeletonLoading = (): void => {
  const skeletons = document.querySelectorAll(
    '.skeleton-item, .skeleton-category'
  );
  skeletons.forEach(skeleton => skeleton.remove());
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
    return;
  }

  state.filteredFiles.forEach(file => {
    const fileItem = fileDisplayService.createFileItem(file);
    allFilesList.appendChild(fileItem);
  });
};

const displayCategories = (): void => {
  if (!categoriesList) return;

  categoriesList.innerHTML = '';

  const categories = fileDisplayService.groupFilesByCategory(
    state.filteredFiles
  );

  Object.entries(categories).forEach(([categoryName, files]) => {
    if (files.length > 0) {
      const categoryDiv = fileDisplayService.createCategorySection(
        categoryName as keyof typeof categories,
        files
      );
      categoriesList.appendChild(categoryDiv);
    }
  });
};

const displayFolderNavigation = (): void => {
  if (!foldersContainer) return;

  // Initialize folder browser service
  folderBrowserService.initialize(state.allFolders, state.folderCache);

  // Build folder tree
  const folderTree = folderBrowserService.buildFolderTree();

  // Clear existing content
  foldersContainer.innerHTML = '';

  if (folderTree.length === 0) {
    const emptyState = createElement('div', 'folder-empty-state');
    emptyState.innerHTML = `
      <p>Ei kansioita löytynyt</p>
      <small>Tiedostot näytetään kategorioittain</small>
    `;
    foldersContainer.appendChild(emptyState);
    return;
  }

  // Create expandable folder tree
  const expandedFolders = new Set<string>(); // Start with all collapsed
  const treeElement = folderBrowserService.createFolderTree(
    folderTree,
    expandedFolders
  );
  foldersContainer.appendChild(treeElement);

  // Update stats
  updateFolderStats();

  console.log(`Displayed ${folderTree.length} root folders in browser`);
};

const cacheFolderStructure = (): void => {
  state.folderCache.clear();

  state.allFolders.forEach(folder => {
    const folderFiles = driveApiService.getFilesInFolder(
      folder.id,
      state.allFiles,
      state.allFolders
    );

    state.folderCache.set(folder.id, {
      ...folder,
      fileCount: folderFiles.length,
      files: folderFiles,
    });
  });

  console.log(`Cached ${state.folderCache.size} folders with file counts`);
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

const updateFolderStats = (): void => {
  if (totalFilesEl) {
    totalFilesEl.textContent = state.allFiles.length.toString();
  }
  if (totalFoldersEl) {
    totalFoldersEl.textContent = state.allFolders.length.toString();
  }
  if (allFilesCount) {
    allFilesCount.textContent = `${state.allFiles.length} tiedosto${state.allFiles.length !== 1 ? 'a' : ''}`;
  }
};

const handleToggleFolderBrowser = (): void => {
  const folderBrowser = document.querySelector(
    '.folder-browser'
  ) as HTMLElement;
  if (folderBrowser) {
    folderBrowser.classList.toggle('collapsed');
    const isCollapsed = folderBrowser.classList.contains('collapsed');
    toggleFolderBrowser.textContent = isCollapsed ? '→' : '←';
    toggleFolderBrowser.setAttribute(
      'aria-label',
      isCollapsed ? 'Näytä kansioselain' : 'Piilota kansioselain'
    );
  }
};

const handleFolderClick = (event: Event): void => {
  const target = event.target as HTMLElement;

  // Handle expand/collapse buttons
  if (target.classList.contains('expand-btn')) {
    event.preventDefault();
    event.stopPropagation();

    const folderId = target.getAttribute('data-folder-id');
    if (folderId) {
      toggleFolderExpansion(folderId);
    }
    return;
  }

  // Handle folder selection
  const folderItem = target.closest('.folder-item') as HTMLElement;
  if (folderItem && !target.classList.contains('folder-external-link')) {
    event.preventDefault();
    const folderId = folderItem.getAttribute('data-folder-id');
    selectFolder(folderId);
  }
};

const toggleFolderExpansion = (folderId: string): void => {
  const expandBtn = document.querySelector(
    `[data-folder-id="${folderId}"].expand-btn`
  ) as HTMLElement;
  const childrenContainer = document.querySelector(
    `[data-parent-id="${folderId}"]`
  ) as HTMLElement;

  if (expandBtn && childrenContainer) {
    const isExpanded = expandBtn.classList.contains('expanded');

    expandBtn.classList.toggle('expanded');
    expandBtn.textContent = isExpanded ? '▶' : '▼';

    childrenContainer.classList.toggle('expanded');
    childrenContainer.classList.toggle('collapsed');
  }
};

const selectFolder = (folderId: string | null): void => {
  // Update active state
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.remove('active');
  });

  if (folderId) {
    const selectedItem = document.querySelector(
      `[data-folder-id="${folderId}"]`
    );
    selectedItem?.classList.add('active');

    const folderData = state.folderCache.get(folderId);
    const folderName = folderData?.name || 'Kansio';

    state.currentFolderFilter = folderId;
    folderBrowserService.setCurrentFolder(folderId);

    // Filter files to show only those in selected folder and subfolders
    state.filteredFiles = folderData?.files || [];

    // Update section title
    if (mainSectionTitle) {
      mainSectionTitle.textContent = `📁 ${folderName}`;
    }

    updateStatus(
      `Näytetään kansio: ${folderName} (${state.filteredFiles.length} tiedostoa)`,
      'info'
    );
    showToast(
      'Kansio valittu',
      `${folderName} - ${state.filteredFiles.length} tiedostoa`,
      'info',
      2000
    );
  } else {
    // Show all files
    const allFilesItem = document.querySelector('.folder-item.all-files');
    allFilesItem?.classList.add('active');

    state.currentFolderFilter = null;
    folderBrowserService.setCurrentFolder(null);
    state.filteredFiles = [...state.allFiles];

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

  // Update displays
  displayFiles();
  displayCategories();
  updateFileCount();
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
