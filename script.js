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
    setupEventListeners();
    setupAutoRefresh();
    updateStatus('Loading Google APIs...', 'loading');
    
    // Wait for APIs to load
    checkAPIsLoaded();
}

/**
 * Check if APIs are loaded and retry if not
 */
function checkAPIsLoaded() {
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds total
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts) {
            clearInterval(checkInterval);
            initializeGoogleAPIs();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            const errorMsg = 'Failed to load Google APIs. Please refresh the page.';
            updateStatus(errorMsg, 'error');
            showToast('Loading Timeout', errorMsg, 'error');
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
        
        // Try with discovery docs first, fallback to basic init
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            console.log('GAPI client initialized with discovery docs');
        } catch (discoveryError) {
            console.warn('Discovery docs failed, trying basic initialization:', discoveryError);
            
            // Fallback: Initialize without discovery docs
            await gapi.client.init({
                apiKey: API_KEY,
            });
            
            // Manually load the Drive API
            await gapi.client.load('drive', 'v3');
            console.log('GAPI client initialized with manual API loading');
        }
        
        console.log('GAPI client initialized successfully');
        gapiInited = true;
        
        // Initialize Google Identity Services
        if (typeof google === 'undefined' || !google.accounts) {
            throw new Error('Google Identity Services not loaded');
        }
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
        });
        
        console.log('Google Identity Services initialized successfully');
        gisInited = true;
        
        // Enable sign-in button
        maybeEnableButtons();
        
    } catch (error) {
        console.error('Error initializing Google APIs:', error);
        const errorMsg = 'Failed to initialize Google APIs: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Initialization Failed', errorMsg, 'error');
        
        // Provide more specific error guidance
        if (error.message.includes('discovery')) {
            const discoveryMsg = 'Google API discovery failed. Check your internet connection and try refreshing.';
            updateStatus(discoveryMsg, 'error');
            showToast('Connection Issue', discoveryMsg, 'error');
        } else if (error.message.includes('API key')) {
            const keyMsg = 'Invalid API key. Please check your Google Cloud Console configuration.';
            updateStatus(keyMsg, 'error');
            showToast('Configuration Error', keyMsg, 'error');
        }
    }
}

/**
 * Enable buttons after both APIs are loaded
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_div').style.display = 'block';
        updateStatus('Ready to sign in with Google Drive', 'info');
    }
}

/**
 * Handle authorization
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            const errorMsg = 'Authorization failed: ' + resp.error;
            updateStatus(errorMsg, 'error');
            showToast('Authentication Failed', errorMsg, 'error');
            throw (resp);
        }
        accessToken = resp.access_token;
        document.getElementById('signout_div').style.display = 'block';
        document.getElementById('authorize_div').style.display = 'none';
        showToast('Authentication Successful', 'Successfully connected to Google Drive', 'success');
        await loadDriveFiles();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
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
        const response = await gapi.client.drive.files.list({
            pageSize: 1000,
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents)',
            orderBy: 'name'
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            allFiles = files.filter(file => 
                // Filter out Google Apps Script and other system files
                !file.name.startsWith('.') && 
                file.mimeType !== 'application/vnd.google-apps.script'
            );
            
            filteredFiles = [...allFiles];
            hideSkeletonLoading();
            displayFiles();
            displayCategories();
            updateFileCount();
            updateStatus(`Successfully loaded ${allFiles.length} training resources`, 'success');
            showToast('Files Loaded', `Found ${allFiles.length} training resources`, 'success');
        } else {
            hideSkeletonLoading();
            updateStatus('No files found', 'info');
            showToast('No Files Found', 'No training resources found in your Google Drive', 'info');
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
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredFiles = [...allFiles];
    } else {
        filteredFiles = allFiles.filter(file =>
            file.name.toLowerCase().includes(searchTerm)
        );
    }
    
    displayFiles();
    displayCategories();
    updateFileCount();
}

/**
 * Refresh files manually
 */
async function refreshFiles() {
    if (accessToken) {
        showToast('Refreshing Files', 'Updating your training resources...', 'info', 2000);
        await loadDriveFiles();
    } else {
        showToast('Not Authenticated', 'Please sign in to refresh files', 'warning');
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
 * Clear files list
 */
function clearFilesList() {
    allFilesList.innerHTML = '';
    categoriesList.innerHTML = '';
    allFiles = [];
    filteredFiles = [];
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