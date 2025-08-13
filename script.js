// Configuration - Set these via environment variables or env-loader.js
// Get your credentials from Google Cloud Console: https://console.cloud.google.com/
const CLIENT_ID = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const API_KEY = window.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

// Global variables
let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken = '';
let allFiles = [];
let filteredFiles = [];
let allFolders = [];
let folderCache = new Map(); // Cache folder contents
let currentFolderFilter = null; // Currently selected folder filter

// DOM elements
const authorizeDiv = document.getElementById('authorize_div');
const signoutDiv = document.getElementById('signout_div');
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const statusDiv = document.querySelector('.status-content');
const statusText = document.getElementById('statusText');
const searchInput = document.getElementById('searchInput');
const refreshButton = document.getElementById('refreshButton');
const allFilesList = document.getElementById('allFilesList');
const categoriesList = document.getElementById('categoriesList');
const fileCountBadge = document.getElementById('fileCount');
const toastContainer = document.getElementById('toastContainer');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Hawks Coach Hub...');
    setupEventListeners();
    setupAutoRefresh();
    updateStatus('Loading Google APIs...', 'loading');
    
    // Reset initialization flags
    gapiInited = false;
    gisInited = false;
    
    // Wait for APIs to load
    checkAPIsLoaded();
}

/**
 * Check if APIs are loaded and retry if not
 */
function checkAPIsLoaded() {
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds total
    
    updateStatus('Loading Google APIs...', 'loading');
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        console.log(`API loading check ${attempts}/${maxAttempts}:`, {
            gapi: typeof gapi !== 'undefined',
            google: typeof google !== 'undefined',
            accounts: typeof google !== 'undefined' && google.accounts
        });
        
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts) {
            clearInterval(checkInterval);
            console.log('All Google APIs loaded successfully');
            initializeGoogleAPIs();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            const errorMsg = 'Failed to load Google APIs after 30 seconds. Please check your internet connection and refresh the page.';
            updateStatus(errorMsg, 'error');
            showToast('Loading Timeout', errorMsg, 'error');
            
            // Provide retry option
            setTimeout(() => {
                showToast('Retry Available', 'Click refresh to retry loading Google APIs', 'info', 0);
            }, 2000);
        }
    }, 500);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    authorizeButton.addEventListener('click', handleAuthClick);
    signoutButton.addEventListener('click', handleSignoutClick);
    refreshButton.addEventListener('click', refreshFiles);
    searchInput.addEventListener('input', handleSearch);
}

/**
 * Set up auto-refresh every 15 minutes
 */
function setupAutoRefresh() {
    setInterval(() => {
        if (accessToken) {
            refreshFiles();
        }
    }, 15 * 60 * 1000); // 15 minutes
}

/**
 * Initialize Google APIs after they're loaded
 */
async function initializeGoogleAPIs() {
    try {
        // Check if credentials are properly configured
        if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE' || API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
            const credentialsMsg = 'Please configure your Google API credentials. See README.md for setup instructions.';
            updateStatus(credentialsMsg, 'error');
            showToast('Configuration Required', credentialsMsg, 'warning', 0);
            return;
        }
        
        updateStatus('Initializing Google Drive API...', 'loading');
        
        // Initialize GAPI client with more robust error handling
        await new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('Google API library not loaded'));
                return;
            }
            
            gapi.load('client', {
                callback: () => {
                    console.log('GAPI client loaded successfully');
                    resolve();
                },
                onerror: (error) => {
                    console.error('GAPI client load error:', error);
                    reject(new Error('Failed to load GAPI client'));
                }
            });
        });
        
        // Initialize the client with better error handling
        console.log('Initializing GAPI client with API key...');
        
        // Validate API key format
        if (!API_KEY || API_KEY.length < 30 || !API_KEY.startsWith('AIza')) {
            throw new Error('Invalid API key format. Please check your Google Cloud Console configuration.');
        }
        
        // Initialize without discovery docs first (more reliable)
        console.log('Initializing GAPI client without discovery docs...');
        await gapi.client.init({
            apiKey: API_KEY,
        });
        
        // Load the Drive API manually
        console.log('Loading Google Drive API v3...');
        await gapi.client.load('drive', 'v3');
        
        console.log('GAPI client initialized successfully');
        
        console.log('GAPI client initialized successfully');
        gapiInited = true;
        
        // Initialize Google Identity Services
        if (typeof google === 'undefined' || !google.accounts) {
            throw new Error('Google Identity Services not loaded');
        }
        
        console.log('Initializing token client with CLIENT_ID:', CLIENT_ID);
        
        if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            throw new Error('CLIENT_ID not configured. Please set your Google Client ID.');
        }
        
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            
            console.log('Google Identity Services initialized successfully');
            gisInited = true;
            
            // Enable sign-in button
            maybeEnableButtons();
        } catch (tokenError) {
            console.error('Error initializing token client:', tokenError);
            throw new Error('Failed to initialize authentication client: ' + tokenError.message);
        }
        
    } catch (error) {
        console.error('Error initializing Google APIs:', error);
        const errorMsg = 'Failed to initialize Google APIs: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Initialization Failed', errorMsg, 'error');
        
        // Provide more specific error guidance
        if (error.message.includes('API key') || error.message.includes('Invalid')) {
            const keyMsg = 'Invalid API key. Please check your Google Cloud Console configuration and ensure the API key is enabled for Google Drive API.';
            updateStatus(keyMsg, 'error');
            showToast('Configuration Error', keyMsg, 'error');
        } else if (error.message.includes('load') || error.message.includes('network') || error.message.includes('discovery')) {
            const networkMsg = 'Network error loading Google APIs. Please check your internet connection and try refreshing.';
            updateStatus(networkMsg, 'error');
            showToast('Connection Issue', networkMsg, 'error');
        } else if (error.message.includes('CORS') || error.message.includes('origin')) {
            const corsMsg = 'Domain not authorized. Please add your domain to authorized JavaScript origins in Google Cloud Console.';
            updateStatus(corsMsg, 'error');
            showToast('Authorization Error', corsMsg, 'error');
        }
    }
}

/**
 * Enable buttons after both APIs are loaded
 */
function maybeEnableButtons() {
    console.log('Checking if APIs are ready:', { gapiInited, gisInited });
    
    if (gapiInited && gisInited) {
        console.log('Both APIs initialized - enabling sign-in button');
        document.getElementById('authorize_div').style.display = 'block';
        document.getElementById('signout_div').style.display = 'none';
        updateStatus('Ready to sign in with Google Drive', 'info');
        showToast('Ready to Sign In', 'Google APIs loaded successfully', 'success', 3000);
    } else {
        console.log('APIs not ready yet:', { 
            gapiInited, 
            gisInited,
            gapiExists: typeof gapi !== 'undefined',
            googleExists: typeof google !== 'undefined'
        });
        updateStatus('Initializing Google APIs...', 'loading');
    }
}

/**
 * Handle authorization
 */
function handleAuthClick() {
    console.log('Sign in button clicked');
    
    if (!gapiInited || !gisInited) {
        const errorMsg = 'Google APIs not fully initialized yet. Please wait or refresh the page.';
        updateStatus(errorMsg, 'error');
        showToast('Not Ready', errorMsg, 'warning');
        return;
    }
    
    if (!tokenClient) {
        const errorMsg = 'Authentication client not initialized. Please refresh the page.';
        updateStatus(errorMsg, 'error');
        showToast('Authentication Error', errorMsg, 'error');
        return;
    }
    
    console.log('Starting authentication flow...');
    updateStatus('Starting sign-in process...', 'loading');
    
    tokenClient.callback = async (resp) => {
        console.log('Authentication response received:', resp);
        
        if (resp.error !== undefined) {
            console.error('Authentication error:', resp.error);
            const errorMsg = 'Authorization failed: ' + resp.error;
            updateStatus(errorMsg, 'error');
            showToast('Authentication Failed', errorMsg, 'error');
            return;
        }
        
        console.log('Authentication successful, loading files...');
        accessToken = resp.access_token;
        document.getElementById('signout_div').style.display = 'block';
        document.getElementById('authorize_div').style.display = 'none';
        showToast('Authentication Successful', 'Successfully connected to Google Drive', 'success');
        
        try {
            await loadDriveFiles();
        } catch (error) {
            console.error('Error loading files after authentication:', error);
            updateStatus('Authentication successful but failed to load files: ' + error.message, 'error');
        }
    };

    try {
        if (gapi.client.getToken() === null) {
            console.log('No existing token, requesting new access token with consent');
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            console.log('Existing token found, requesting access token');
            tokenClient.requestAccessToken({prompt: ''});
        }
    } catch (error) {
        console.error('Error requesting access token:', error);
        updateStatus('Error starting authentication: ' + error.message, 'error');
        showToast('Authentication Error', 'Failed to start sign-in process', 'error');
    }
}

/**
 * Handle sign out
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    accessToken = '';
    document.getElementById('signout_div').style.display = 'none';
    document.getElementById('authorize_div').style.display = 'block';
    clearFilesList();
    updateStatus('Signed out', 'info');
    showToast('Signed Out', 'Successfully disconnected from Google Drive', 'info');
}

/**
 * Load files from Google Drive
 */
async function loadDriveFiles() {
    updateStatus('Loading files from Google Drive...', 'loading');
    showSkeletonLoading();
    
    try {
        // Load both files and folders
        const [filesResponse, foldersResponse] = await Promise.all([
            gapi.client.drive.files.list({
                pageSize: 1000,
                fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents)',
                orderBy: 'name',
                q: "mimeType != 'application/vnd.google-apps.folder'"
            }),
            gapi.client.drive.files.list({
                pageSize: 500,
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink, parents)',
                orderBy: 'name',
                q: "mimeType = 'application/vnd.google-apps.folder'"
            })
        ]);

        const files = filesResponse.result.files;
        const folders = foldersResponse.result.files;
        
        if (files && files.length > 0) {
            allFiles = files.filter(file => 
                // Filter out Google Apps Script and other system files
                !file.name.startsWith('.') && 
                file.mimeType !== 'application/vnd.google-apps.script'
            );
            
            filteredFiles = [...allFiles];
        } else {
            allFiles = [];
            filteredFiles = [];
        }
        
        if (folders && folders.length > 0) {
            allFolders = folders.filter(folder => !folder.name.startsWith('.'));
            // Cache folder structure
            cacheFolderStructure();
        } else {
            allFolders = [];
        }
        
        hideSkeletonLoading();
        displayFiles();
        displayCategories();
        displayFolderNavigation();
        updateFileCount();
        
        if (allFiles.length === 0 && allFolders.length === 0) {
            updateStatus('No files or folders found', 'info');
            showToast('No Content Found', 'No training resources found in your Google Drive', 'info');
        } else {
            const totalItems = allFiles.length + allFolders.length;
            updateStatus(`Successfully loaded ${allFiles.length} files and ${allFolders.length} folders`, 'success');
            showToast('Content Loaded', `Found ${allFiles.length} files and ${allFolders.length} folders`, 'success');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        hideSkeletonLoading();
        const errorMsg = 'Error loading files: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Loading Failed', errorMsg, 'error');
    }
}

/**
 * Show skeleton loading animation
 */
function showSkeletonLoading() {
    allFilesList.innerHTML = '';
    categoriesList.innerHTML = '';
    
    // Create skeleton items for main list
    for (let i = 0; i < 8; i++) {
        const skeleton = createSkeletonItem();
        allFilesList.appendChild(skeleton);
    }
    
    // Create skeleton for categories
    for (let i = 0; i < 3; i++) {
        const categorySkeleton = createCategorySkeleton();
        categoriesList.appendChild(categorySkeleton);
    }
}

/**
 * Hide skeleton loading animation
 */
function hideSkeletonLoading() {
    const skeletons = document.querySelectorAll('.skeleton-item, .skeleton-category');
    skeletons.forEach(skeleton => skeleton.remove());
}

/**
 * Create skeleton file item
 */
function createSkeletonItem() {
    const skeleton = document.createElement('div');
    skeleton.className = 'file-item skeleton-item';
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
function createCategorySkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'category skeleton-category';
    skeleton.innerHTML = `
        <div class="skeleton-text skeleton-category-title"></div>
        <div class="skeleton-text skeleton-category-item"></div>
        <div class="skeleton-text skeleton-category-item"></div>
        <div class="skeleton-text skeleton-category-item"></div>
    `;
    return skeleton;
}

/**
 * Display files in the main list
 */
function displayFiles() {
    allFilesList.innerHTML = '';
    
    if (filteredFiles.length === 0) {
        const isSearching = searchInput.value.trim() !== '';
        const emptyState = createEmptyState(isSearching);
        allFilesList.appendChild(emptyState);
        return;
    }

    filteredFiles.forEach(file => {
        const fileItem = createFileItem(file);
        allFilesList.appendChild(fileItem);
    });
}

/**
 * Create appropriate empty state based on context
 */
function createEmptyState(isSearching) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    
    if (isSearching) {
        emptyDiv.innerHTML = `
            <div class="empty-icon">🔍</div>
            <h3>No training resources found</h3>
            <p>Try adjusting your search terms or browse by category instead.</p>
            <button class="empty-action" onclick="searchInput.value=''; handleSearch();">
                Clear Search
            </button>
        `;
    } else if (allFiles.length === 0) {
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
 * Create a file item element
 */
function createFileItem(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const icon = getFileIcon(file.mimeType);
    const modifiedDate = new Date(file.modifiedTime).toLocaleDateString();
    
    fileItem.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-info">
            <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="file-name">
                ${file.name}
            </a>
            <div class="file-date">Modified: ${modifiedDate}</div>
        </div>
    `;
    
    return fileItem;
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType) {
    const iconClass = getFileIconClass(mimeType);
    return `<div class="file-type-icon ${iconClass}"></div>`;
}

/**
 * Get CSS class for file type icon
 */
function getFileIconClass(mimeType) {
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
 * Display files organized by categories
 */
function displayCategories() {
    categoriesList.innerHTML = '';
    
    // Group files by type and common keywords
    const categories = groupFilesByCategory();
    
    Object.keys(categories).forEach(categoryName => {
        if (categories[categoryName].length > 0) {
            const categoryDiv = createCategorySection(categoryName, categories[categoryName]);
            categoriesList.appendChild(categoryDiv);
        }
    });
}

/**
 * Group files by category
 */
function groupFilesByCategory() {
    const categories = {
        'Floorball Drills': [],
        'Tactics & Strategy': [],
        'Training Plans': [],
        'Video Resources': [],
        'Diagrams & Images': [],
        'Documents': [],
        'Other': []
    };
    
    filteredFiles.forEach(file => {
        const name = file.name.toLowerCase();
        const mimeType = file.mimeType;
        
        // Floorball-specific categorization
        if (name.includes('drill') || name.includes('exercise') || name.includes('training') || name.includes('floorball')) {
            categories['Floorball Drills'].push(file);
        } else if (name.includes('tactic') || name.includes('strategy') || name.includes('formation')) {
            categories['Tactics & Strategy'].push(file);
        } else if (name.includes('plan') || name.includes('program') || name.includes('schedule') || name.includes('season')) {
            categories['Training Plans'].push(file);
        } else if (mimeType.includes('video') || name.includes('.mp4') || name.includes('.mov')) {
            categories['Video Resources'].push(file);
        } else if (mimeType.includes('image') || name.includes('.jpg') || name.includes('.png')) {
            categories['Diagrams & Images'].push(file);
        } else if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) {
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
function createCategorySection(categoryName, files) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    
    const categoryHeader = document.createElement('h3');
    categoryHeader.textContent = `${categoryName} (${files.length})`;
    categoryDiv.appendChild(categoryHeader);
    
    const fileList = document.createElement('div');
    fileList.className = 'file-list';
    
    files.slice(0, 10).forEach(file => { // Show max 10 files per category
        const fileItem = createFileItem(file);
        fileList.appendChild(fileItem);
    });
    
    if (files.length > 10) {
        const moreText = document.createElement('div');
        moreText.textContent = `... and ${files.length - 10} more files`;
        moreText.style.padding = '1rem';
        moreText.style.fontStyle = 'italic';
        moreText.style.color = '#666';
        fileList.appendChild(moreText);
    }
    
    categoryDiv.appendChild(fileList);
    return categoryDiv;
}

/**
 * Handle search functionality
 */
function handleSearch() {
    handleSearchWithFolders();
}

/**
 * Refresh files manually
 */
async function refreshFiles() {
    console.log('Refresh requested. Current state:', {
        gapiInited,
        gisInited,
        hasAccessToken: !!accessToken,
        authDivVisible: document.getElementById('authorize_div').style.display !== 'none',
        signoutDivVisible: document.getElementById('signout_div').style.display !== 'none'
    });
    
    if (!gapiInited || !gisInited) {
        // Try to reinitialize APIs if they failed
        showToast('Reinitializing', 'Attempting to reload Google APIs...', 'info', 3000);
        updateStatus('Reinitializing Google APIs...', 'loading');
        
        // Reset and restart initialization
        gapiInited = false;
        gisInited = false;
        checkAPIsLoaded();
        return;
    }
    
    if (accessToken) {
        showToast('Refreshing Files', 'Updating your training resources...', 'info', 2000);
        updateStatus('Refreshing files...', 'loading');
        await loadDriveFiles();
    } else {
        showToast('Not Authenticated', 'Please sign in to refresh files', 'warning');
        updateStatus('Please sign in to access your files', 'info');
    }
}

/**
 * Update status message
 */
function updateStatus(message, type = 'info') {
    if (statusText) {
        statusText.textContent = message;
    }
    
    if (statusDiv) {
        // Remove all status classes
        statusDiv.classList.remove('loading', 'success', 'error', 'info');
        // Add new status class
        statusDiv.classList.add(type);
    }
}

/**
 * Update file count display
 */
function updateFileCount() {
    const count = filteredFiles.length;
    if (fileCountBadge) {
        fileCountBadge.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Cache folder structure for performance
 */
function cacheFolderStructure() {
    folderCache.clear();
    
    allFolders.forEach(folder => {
        // Count files in each folder
        const filesInFolder = allFiles.filter(file => 
            file.parents && file.parents.includes(folder.id)
        );
        
        folderCache.set(folder.id, {
            ...folder,
            fileCount: filesInFolder.length,
            files: filesInFolder
        });
    });
    
    console.log(`Cached ${folderCache.size} folders with file counts`);
}

/**
 * Display folder navigation in sidebar
 */
function displayFolderNavigation() {
    const foldersContainer = document.getElementById('foldersContainer');
    if (!foldersContainer) return;
    
    foldersContainer.innerHTML = '';
    
    // Add "All Files" option
    const allFilesOption = createFolderNavigationItem({
        id: 'all',
        name: 'All Files',
        fileCount: allFiles.length,
        isAllFiles: true
    });
    foldersContainer.appendChild(allFilesOption);
    
    // Sort folders by file count (most files first) and name
    const sortedFolders = Array.from(folderCache.values())
        .sort((a, b) => {
            if (a.fileCount !== b.fileCount) {
                return b.fileCount - a.fileCount; // More files first
            }
            return a.name.localeCompare(b.name); // Alphabetical for same count
        })
        .filter(folder => folder.fileCount > 0); // Only show folders with files
    
    sortedFolders.forEach(folder => {
        const folderItem = createFolderNavigationItem(folder);
        foldersContainer.appendChild(folderItem);
    });
    
    // Show empty state if no folders with files
    if (sortedFolders.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'folder-empty-state';
        emptyState.innerHTML = `
            <p>No folders with files found</p>
            <small>Files are organized by content categories instead</small>
        `;
        foldersContainer.appendChild(emptyState);
    }
}

/**
 * Create folder navigation item
 */
function createFolderNavigationItem(folder) {
    const folderDiv = document.createElement('div');
    folderDiv.className = `folder-nav-item ${currentFolderFilter === folder.id ? 'active' : ''}`;
    
    const isAllFiles = folder.isAllFiles;
    const iconClass = isAllFiles ? 'icon-file' : 'icon-folder';
    
    folderDiv.innerHTML = `
        <div class="folder-nav-content" data-folder-id="${folder.id}">
            <div class="file-type-icon ${iconClass}"></div>
            <div class="folder-info">
                <div class="folder-name">${folder.name}</div>
                <div class="folder-count">${folder.fileCount} file${folder.fileCount !== 1 ? 's' : ''}</div>
            </div>
            ${!isAllFiles ? `<a href="${folder.webViewLink}" target="_blank" class="folder-link" title="Open in Google Drive">↗</a>` : ''}
        </div>
    `;
    
    // Add click handler for filtering
    const navContent = folderDiv.querySelector('.folder-nav-content');
    navContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('folder-link')) {
            return; // Don't filter when clicking the external link
        }
        filterByFolder(folder.id === 'all' ? null : folder.id, folder.name);
    });
    
    return folderDiv;
}

/**
 * Filter files by folder
 */
function filterByFolder(folderId, folderName) {
    currentFolderFilter = folderId;
    
    // Update active state in folder navigation
    document.querySelectorAll('.folder-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-folder-id="${folderId || 'all'}"]`)
        ?.parentElement.classList.add('active');
    
    // Filter files
    if (folderId) {
        const folderData = folderCache.get(folderId);
        filteredFiles = folderData ? folderData.files : [];
        
        // Also apply search if active
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file =>
                file.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Update status
        updateStatus(`Viewing folder: ${folderName} (${filteredFiles.length} files)`, 'info');
        showToast('Folder Selected', `Viewing ${folderName} - ${filteredFiles.length} files`, 'info', 2000);
    } else {
        // Show all files
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filteredFiles = allFiles.filter(file =>
                file.name.toLowerCase().includes(searchTerm)
            );
        } else {
            filteredFiles = [...allFiles];
        }
        
        updateStatus(`Viewing all files (${filteredFiles.length} total)`, 'info');
    }
    
    // Update displays
    displayFiles();
    displayCategories();
    updateFileCount();
}

/**
 * Enhanced search that respects folder filter
 */
function handleSearchWithFolders() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let baseFiles;
    if (currentFolderFilter) {
        // Search within current folder
        const folderData = folderCache.get(currentFolderFilter);
        baseFiles = folderData ? folderData.files : [];
    } else {
        // Search all files
        baseFiles = allFiles;
    }
    
    if (searchTerm === '') {
        filteredFiles = [...baseFiles];
    } else {
        filteredFiles = baseFiles.filter(file =>
            file.name.toLowerCase().includes(searchTerm)
        );
    }
    
    displayFiles();
    displayCategories();
    updateFileCount();
}

/**
 * Clear files list
 */
function clearFilesList() {
    allFilesList.innerHTML = '';
    categoriesList.innerHTML = '';
    const foldersContainer = document.getElementById('foldersContainer');
    if (foldersContainer) foldersContainer.innerHTML = '';
    
    allFiles = [];
    filteredFiles = [];
    allFolders = [];
    folderCache.clear();
    currentFolderFilter = null;
}

/**
 * Toast Notification System
 */
function showToast(title, message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'i'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'i'}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">×</button>
        <div class="toast-progress" style="width: 100%;"></div>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    const progressBar = toast.querySelector('.toast-progress');
    
    // Close button functionality
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Auto-remove after duration
    if (duration > 0) {
        // Animate progress bar
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
        
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // Limit number of toasts
    const toasts = toastContainer.querySelectorAll('.toast');
    if (toasts.length > 5) {
        removeToast(toasts[0]);
    }
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Enhanced status update with toast notifications
function updateStatusWithToast(message, type = 'info', showToast = false, toastTitle = '') {
    updateStatus(message, type);
    
    if (showToast) {
        const title = toastTitle || {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        }[type] || 'Notification';
        
        showToast(title, message, type);
    }
}