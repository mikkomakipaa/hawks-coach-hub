/**
 * Hawks Coach Hub - Service Account Version (No Authentication Required)
 * Modern TypeScript implementation with modular architecture
 */

/* eslint-disable no-console */

import { initializeToastContainer, showToast } from '@/components/toast';
import { ServiceAccountDriveService } from '@/services/drive-service-account';
// import { SearchService } from '@/utils/search'; // Removed - using tab search service instead
import { AUTO_REFRESH_INTERVAL } from '@/utils/config';
import { domCache } from '@/utils/dom-cache';
import { appState } from '@/state/app-state';
import { enhancedSearch } from '@/utils/enhanced-search';
import { fileActions } from '@/actions/file-actions';
import { FileListManager } from '@/ui/file-list-manager';
import { FolderNavigationManager } from '@/ui/folder-navigation';
import { performanceMonitor } from '@/utils/performance-monitor';
import { StaticContentDisplay } from '@/components/static-content-display';
import { tabSearchService } from '@/services/tab-search-service';
import { parseHashRoute, getTopLevelShell } from '@/ui/routes';
import { renderTopLevelNavigation, renderViewShell } from '@/ui/view-shells';
import { DrillCatalogView } from '@/ui/drill-catalog-view';
import { DrillDetailView } from '@/ui/drill-detail-view';
import { PlannerDraftView } from '@/ui/planner-draft-view';
import { PlannerSessionListView } from '@/ui/planner-session-list-view';
import { SharedSessionView } from '@/ui/shared-session-view';
import { EditorDrillView } from '@/ui/editor-drill-view';
import { EditorImportReviewView } from '@/ui/editor-import-review-view';

// Application managers
let fileListManager: FileListManager;
let folderNavigationManager: FolderNavigationManager;
const cleanup: Array<() => void> = [];
let browseModeInitialized = false;
let routeHandlingInitialized = false;
let destroyActiveRouteView: (() => void) | null = null;

// Services
const driveService = new ServiceAccountDriveService();

// Track current active tab for search filtering
let currentActiveTab = 'handbook';

// Note: DOM elements now accessed via domCache for better performance

// Status and loading functions now handled by FileListManager

/**
 * Load files and folders from service account backend
 */
const loadDriveFiles = async (refresh: boolean = false): Promise<void> => {
  await performanceMonitor.measure('data-loading', 'load-drive-files', async () => {
    fileListManager.updateStatus('Yhdistetään Google Drive APIin...', 'loading');
    fileListManager.showSkeletonLoading();

    try {
      const startTime = performance.now();
      
      // Show progress updates
      fileListManager.updateStatus('Ladataan harjoitusmateriaaleja...', 'loading');
      
      // Load both files and folders in one API call
      const data = await driveService.loadAllFilesAndFolders(refresh);
      
      const loadTime = performance.now() - startTime;
      console.log(`⚡ Loaded ${data.files.length} files, ${data.folders.length} folders in ${Math.round(loadTime)}ms ${data.cached ? '(cached)' : '(from Google Drive)'}`);

      // Update state
      appState.setFiles(data.files);
      appState.setFolders(data.folders);

      // Cache folder structure immediately for better UX
      appState.updateFolderCache();

      // Initialize enhanced search with loaded files
      enhancedSearch.indexFiles(data.files);
      console.log('🔍 Enhanced search indexed', data.files.length, 'files');

      // Initialize tab search service with loaded data
      tabSearchService.initialize(data.files, data.folders);
      console.log('🏷️ Tab search service initialized for folder-based filtering');

      // Debug: Print folder analysis for configuration
      if (process.env.NODE_ENV === 'development') {
        const { printFolderAnalysis } = await import('@/utils/folder-detection');
        printFolderAnalysis(data.folders);
      }

      fileListManager.hideSkeletonLoading();
      fileListManager.updateStatus('', 'info'); // Hide loading status
      fileListManager.refresh();
      folderNavigationManager.refresh();

      if (data.files.length === 0 && data.folders.length === 0) {
        fileListManager.updateStatus('No training materials found', 'info');
        showToast(
          'No Content Found',
          'No training resources found in the Hawks folder',
          'info'
        );
      } else {
        fileListManager.updateStatus(
          `Successfully loaded ${data.files.length} files and ${data.folders.length} folders`,
          'success'
        );
        showToast(
          'Hawks Training Materials Loaded',
          `Found ${data.files.length} files and ${data.folders.length} folders`,
          'success'
        );
      }
    } catch (error) {
      console.error('Error loading files:', error);
      fileListManager.hideSkeletonLoading();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fileListManager.updateStatus(`Error loading files: ${errorMessage}`, 'error');
      showToast(
        'Loading Error',
        'Failed to load training materials. Please try refreshing the page.',
        'error'
      );
    }
  });
};

// Folder caching now handled by AppStateManager

// File display now handled by FileListManager

// Folder chips display now handled by FolderNavigationManager

// Folder filtering now handled by FolderNavigationManager

/**
 * Handle search functionality with tab-based filtering
 */
async function handleSearch(): Promise<void> {
  const searchInput = domCache.get('searchInput') as HTMLInputElement;
  if (!searchInput) return;

  const query = searchInput.value.trim();

  if (!query) {
    // Reset to show all files for current tab when search is cleared
    resetToTabDefaults();
    return;
  }

  // Use tab-based search for targeted results
  const searchResult = await tabSearchService.searchInTab({
    tabId: currentActiveTab,
    query,
    includeFolders: false,
    includeStaticContent: true,
    maxResults: 100
  });

  // Update the app state with filtered results
  appState.setFilteredFiles(searchResult.files);

  // Display search results with tab context
  const tabName = getTabDisplayName(currentActiveTab);
  fileListManager.displaySearchResults(`${query} (in ${tabName})`, searchResult.totalResults);

  // Log search stats for debugging
  console.log(`🔍 Tab search "${query}" in ${currentActiveTab}:`, {
    files: searchResult.files.length,
    totalResults: searchResult.totalResults,
    scope: searchResult.searchScope,
    filters: searchResult.appliedFilters
  });
}

/**
 * Reset view to tab defaults (no search, no folder filter)
 */
async function resetToTabDefaults(): Promise<void> {
  if (currentActiveTab === 'handbook') {
    // For handbook, show all files
    folderNavigationManager.filterByFolder(appState.currentFolderFilter);
  } else {
    // For other tabs, show only files from relevant folders
    const searchResult = await tabSearchService.searchInTab({
      tabId: currentActiveTab,
      query: '', // Empty query shows all files in scope
      includeFolders: false,
      includeStaticContent: false,
      maxResults: 1000
    });

    appState.setFilteredFiles(searchResult.files);
    fileListManager.refresh();
  }
}

/**
 * Get display name for tab
 */
function getTabDisplayName(tabId: string): string {
  const tabNames: Record<string, string> = {
    'handbook': 'Valmentajan käsikirja',
    'sport-training': 'Lajiharjoittelu',
    'fitness': 'Fysiikkaharjoittelu',
    'game-situations': 'Pelitilanneroolit'
  };
  return tabNames[tabId] || tabId;
}

// File count and pagination now handled by FileListManager

// Session planning UI now handled by FileListManager

/**
 * Initialize event listeners with proper cleanup tracking
 */
function initializeEventListeners(): void {
  const searchInput = domCache.get('searchInput');
  const refreshButton = domCache.get('refreshButton');
  
  if (searchInput) {
    const searchHandler = () => handleSearch();
    searchInput.addEventListener('input', searchHandler);
    cleanup.push(() => searchInput.removeEventListener('input', searchHandler));
  }
  
  if (refreshButton) {
    const refreshHandler = () => loadDriveFiles(true);
    refreshButton.addEventListener('click', refreshHandler);
    cleanup.push(() => refreshButton.removeEventListener('click', refreshHandler));
  }

  // Auto-refresh (optional) with cleanup
  if (AUTO_REFRESH_INTERVAL > 0) {
    const intervalId = setInterval(loadDriveFiles, AUTO_REFRESH_INTERVAL);
    cleanup.push(() => clearInterval(intervalId));
  }

  console.log('Event listeners initialized with cleanup tracking');
}

/**
 * Initialize the application with new modular architecture
 */
async function initializeBrowseApp(): Promise<void> {
  if (browseModeInitialized) {
    return;
  }

  console.log('🏒 Hawks Coach Hub - Service Account Version initializing...');
  
  try {
    // Initialize infrastructure
    initializeToastContainer();
    domCache.initialize();
    
    // Initialize managers
    fileListManager = new FileListManager();
    folderNavigationManager = new FolderNavigationManager();
    
    // Initialize file actions (already done via import, but ensure it's set up)
    // fileActions is already initialized as a singleton
    
    // Initialize event listeners
    initializeEventListeners();

    // Add content tabs for Phase 2
    addContentTabs();

    // Remove auth-related UI elements
    const authElements = document.querySelectorAll('#authorize_div, #signout_div');
    authElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.display = 'none';
      }
    });
    
    // Load files immediately (no auth required)
    await loadDriveFiles();
    
    // Set up cleanup on page unload
    const unloadHandler = () => {
      cleanup.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      });
      
      fileListManager?.destroy();
      folderNavigationManager?.destroy();
      fileActions?.destroy();
      performanceMonitor?.destroy();
    };
    
    window.addEventListener('beforeunload', unloadHandler);
    cleanup.push(() => window.removeEventListener('beforeunload', unloadHandler));

    browseModeInitialized = true;
    
    console.log('✅ Hawks Coach Hub initialized successfully with modular architecture');
    
    // Log performance stats in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('📊 Performance stats:', performanceMonitor.getAllStats());
        console.log('🗂️ App state stats:', appState.getStateStats());
        console.log('🔧 DOM cache stats:', domCache.getStats());
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize Hawks Coach Hub:', error);
    showToast(
      'Initialization Error',
      'Failed to initialize the application. Please refresh the page.',
      'error'
    );
  }
}

// Handle page visibility changes for performance optimization
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page became visible - resume normal operations
    performanceMonitor.setEnabled(true);
  } else {
    // Page became hidden - reduce resource usage
    performanceMonitor.setEnabled(false);
  }
});

function ensureViewShellRoot(): HTMLElement {
  let viewShellRoot = document.getElementById('viewShellRoot');

  if (!viewShellRoot) {
    const mainContainer = document.querySelector('.main-container');
    const main = document.querySelector('main');

    if (!mainContainer || !main) {
      throw new Error('Unable to initialize routed view shell container');
    }

    viewShellRoot = document.createElement('div');
    viewShellRoot.id = 'viewShellRoot';
    viewShellRoot.className = 'view-shell-root';
    main.insertBefore(viewShellRoot, mainContainer);
  }

  return viewShellRoot;
}

function ensureRouteNavRoot(): HTMLElement {
  let routeNavRoot = document.getElementById('routeNavRoot');

  if (!routeNavRoot) {
    const mainContainer = document.querySelector('.main-container');
    const main = document.querySelector('main');

    if (!mainContainer || !main) {
      throw new Error('Unable to initialize routed navigation container');
    }

    routeNavRoot = document.createElement('div');
    routeNavRoot.id = 'routeNavRoot';
    routeNavRoot.className = 'route-nav-root';
    main.insertBefore(routeNavRoot, mainContainer);
  }

  return routeNavRoot;
}

function setBrowseVisibility(isVisible: boolean): void {
  const mainContainer = document.querySelector('.main-container');

  if (mainContainer instanceof HTMLElement) {
    mainContainer.style.display = isVisible ? '' : 'none';
  }
}

async function handleRouteChange(): Promise<void> {
  const route = parseHashRoute(window.location.hash);
  const activeShell = getTopLevelShell(route);
  const routeNavRoot = ensureRouteNavRoot();
  const viewShellRoot = ensureViewShellRoot();

  renderTopLevelNavigation(routeNavRoot, route);

  if (destroyActiveRouteView) {
    destroyActiveRouteView();
    destroyActiveRouteView = null;
  }

  if (activeShell === 'browse') {
    viewShellRoot.innerHTML = '';
    viewShellRoot.style.display = 'none';
    delete viewShellRoot.dataset.view;
    setBrowseVisibility(true);
    await initializeBrowseApp();
    return;
  }

  setBrowseVisibility(false);
  viewShellRoot.style.display = 'block';

  if (route.kind === 'drill-catalog') {
    const drillCatalogView = new DrillCatalogView(viewShellRoot);
    await drillCatalogView.mount();
    destroyActiveRouteView = () => drillCatalogView.destroy();
    return;
  }

  if (route.kind === 'drill-detail') {
    const drillDetailView = new DrillDetailView(viewShellRoot, route.drillId);
    await drillDetailView.mount();
    destroyActiveRouteView = () => drillDetailView.destroy();
    return;
  }

  if (route.kind === 'planner-new') {
    const plannerDraftView = new PlannerDraftView(viewShellRoot);
    await plannerDraftView.mount();
    destroyActiveRouteView = () => plannerDraftView.destroy();
    return;
  }

  if (route.kind === 'planner-list') {
    const plannerSessionListView = new PlannerSessionListView(viewShellRoot);
    await plannerSessionListView.mount();
    destroyActiveRouteView = () => plannerSessionListView.destroy();
    return;
  }

  if (route.kind === 'planner-detail') {
    const plannerDraftView = new PlannerDraftView(viewShellRoot, undefined, {
      routeKind: 'detail',
      sessionId: route.sessionId,
    });
    await plannerDraftView.mount();
    destroyActiveRouteView = () => plannerDraftView.destroy();
    return;
  }

  if (route.kind === 'shared-session') {
    const sharedSessionView = new SharedSessionView(viewShellRoot, route.shareId);
    await sharedSessionView.mount();
    destroyActiveRouteView = () => sharedSessionView.destroy();
    return;
  }

  if (route.kind === 'editor-drill-new') {
    const editorDrillView = new EditorDrillView(viewShellRoot, {
      mode: 'new',
    });
    await editorDrillView.mount();
    destroyActiveRouteView = () => editorDrillView.destroy();
    return;
  }

  if (route.kind === 'editor-drill-edit') {
    const editorDrillView = new EditorDrillView(viewShellRoot, {
      mode: 'edit',
      drillId: route.drillId,
    });
    await editorDrillView.mount();
    destroyActiveRouteView = () => editorDrillView.destroy();
    return;
  }

  if (route.kind === 'editor-imports') {
    const editorImportReviewView = new EditorImportReviewView(viewShellRoot);
    await editorImportReviewView.mount();
    destroyActiveRouteView = () => editorImportReviewView.destroy();
    return;
  }

  delete viewShellRoot.dataset.view;
  renderViewShell(viewShellRoot, route);
}

async function initializeRoutedApp(): Promise<void> {
  if (routeHandlingInitialized) {
    return;
  }

  routeHandlingInitialized = true;
  await handleRouteChange();

  const hashChangeHandler = () => {
    void handleRouteChange();
  };

  window.addEventListener('hashchange', hashChangeHandler);
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  void initializeRoutedApp();
});

function addContentTabs() {
  const mainSectionTitle = document.getElementById('mainSectionTitle');
  if (!mainSectionTitle) return;

  // Create tab navigation
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'content-tabs';
  tabsContainer.style.marginBottom = '20px';

  // Define tabs
  const tabs = [
    { id: 'handbook', label: 'Valmentajan käsikirja', active: true },
    { id: 'sport-training', label: 'Lajiharjoittelu', active: false },
    { id: 'fitness', label: 'Fysiikkaharjoittelu', active: false },
    { id: 'game-situations', label: 'Pelitilanneroolit', active: false }
  ];

  // Create tab buttons
  tabs.forEach(tab => {
    const tabButton = document.createElement('button');
    tabButton.className = `content-tab ${tab.active ? 'active' : ''}`;
    tabButton.textContent = tab.label;
    tabButton.onclick = () => switchTab(tab.id).catch(error => console.error('Error switching tab:', error));
    tabsContainer.appendChild(tabButton);
  });

  // Insert tabs before the search section
  const searchContainer = document.querySelector('.search-status-container');
  if (searchContainer && searchContainer.parentNode) {
    searchContainer.parentNode.insertBefore(tabsContainer, searchContainer);
  }
}

async function switchTab(tabId: string): Promise<void> {
  // Update current active tab for search filtering
  currentActiveTab = tabId;

  // Update active tab styling
  const tabs = document.querySelectorAll('.content-tab');
  tabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.textContent?.includes(getTabLabel(tabId))) {
      tab.classList.add('active');
    }
  });

  // Clear search when switching tabs
  const searchInput = domCache.get('searchInput') as HTMLInputElement;
  if (searchInput) {
    searchInput.value = '';
  }

  // Show/hide appropriate content based on tab
  const filesSection = document.querySelector('.files-section');
  const staticContentSection = document.getElementById('static-content-section');

  switch (tabId) {
    case 'handbook':
      if (filesSection) (filesSection as HTMLElement).style.display = 'block';
      if (staticContentSection) staticContentSection.style.display = 'none';
      document.getElementById('mainSectionTitle')!.textContent = 'Valmentajan käsikirja';
      // Show all files for handbook
      await resetToTabDefaults();
      break;
    case 'sport-training':
      if (filesSection) (filesSection as HTMLElement).style.display = 'block';
      if (staticContentSection) staticContentSection.style.display = 'block';
      document.getElementById('mainSectionTitle')!.textContent = 'Lajiharjoittelu';
      showStaticContent('basic-skills');
      // Filter files to sport training folders
      await resetToTabDefaults();
      break;
    case 'fitness':
      if (filesSection) (filesSection as HTMLElement).style.display = 'block';
      if (staticContentSection) staticContentSection.style.display = 'block';
      document.getElementById('mainSectionTitle')!.textContent = 'Fysiikkaharjoittelu';
      showStaticContent('fitness');
      // Filter files to fitness folders
      await resetToTabDefaults();
      break;
    case 'game-situations':
      if (filesSection) (filesSection as HTMLElement).style.display = 'block';
      if (staticContentSection) staticContentSection.style.display = 'block';
      document.getElementById('mainSectionTitle')!.textContent = 'Pelitilanneroolit';
      showStaticContent('strategy');
      // Filter files to game situation folders
      await resetToTabDefaults();
      break;
  }

  // Log tab switch for debugging
  const stats = tabSearchService.getTabSearchStats(tabId);
  console.log(`🏷️ Switched to tab "${tabId}":`, stats);
}

function getTabLabel(tabId: string): string {
  switch (tabId) {
    case 'handbook': return 'Valmentajan käsikirja';
    case 'sport-training': return 'Lajiharjoittelu';
    case 'fitness': return 'Fysiikkaharjoittelu';
    case 'game-situations': return 'Pelitilanneroolit';
    default: return '';
  }
}

function showStaticContent(category?: string) {
  let staticContentSection = document.getElementById('static-content-section');

  if (!staticContentSection) {
    staticContentSection = document.createElement('div');
    staticContentSection.id = 'static-content-section';
    staticContentSection.className = 'static-content-display';

    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.appendChild(staticContentSection);
    }
  }

  staticContentSection.style.display = 'block';

  // Initialize static content if not already done
  if (!staticContentSection.hasChildNodes()) {
    const staticContentDisplay = new StaticContentDisplay();
    staticContentDisplay.render(staticContentSection);
  }

  // Filter by category if specified
  if (category) {
    const staticContentDisplay = new StaticContentDisplay();
    staticContentDisplay.renderContentList(category as any);
  }
}
