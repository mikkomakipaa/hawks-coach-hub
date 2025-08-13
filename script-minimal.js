// Configuration - Set these via environment variables or env-loader.js
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
let folderCache = new Map();
let currentFolderFilter = null;

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
const fileCountBadge = document.getElementById('fileCount');
const folderChips = document.getElementById('folderChips');
const folderChipsBar = document.getElementById('folderChipsBar');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log('Initializing Hawks Coach Hub...');
    setupEventListeners();
    updateStatus('Loading Google APIs...', 'loading');
    
    // Reset initialization flags
    gapiInited = false;
    gisInited = false;
    
    // Wait for APIs to load
    checkAPIsLoaded();
}

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
        }
    }, 500);
}

function setupEventListeners() {
    authorizeButton.addEventListener('click', handleAuthClick);
    signoutButton.addEventListener('click', handleSignoutClick);
    refreshButton.addEventListener('click', refreshFiles);
    searchInput.addEventListener('input', handleSearch);
}

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
        
        // Initialize GAPI client
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
        
        // Validate API key format
        if (!API_KEY || API_KEY.length < 30 || !API_KEY.startsWith('AIza')) {
            throw new Error('Invalid API key format. Please check your Google Cloud Console configuration.');
        }
        
        // Initialize without discovery docs (more reliable)
        console.log('Initializing GAPI client without discovery docs...');
        await gapi.client.init({
            apiKey: API_KEY,
        });
        
        // Load the Drive API manually
        console.log('Loading Google Drive API v3...');
        await gapi.client.load('drive', 'v3');
        
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

async function loadDriveFiles() {
    updateStatus('Loading files from Google Drive...', 'loading');
    showToast('Loading Files', 'Fetching your training resources...', 'info', 2000);
    
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
            cacheFolderStructure();
        } else {
            allFolders = [];
        }
        
        displayFiles();
        displayFolderNavigation();
        updateFileCount();
        
        if (allFiles.length === 0) {
            updateStatus('No files found', 'info');
            showToast('No Files Found', 'No training resources found in your Google Drive', 'info');
        } else {
            updateStatus(`Successfully loaded ${allFiles.length} training resources`, 'success');
            showToast('Files Loaded', `Found ${allFiles.length} training resources`, 'success');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const errorMsg = 'Error loading files: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Loading Failed', errorMsg, 'error');
    }
}

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

function createEmptyState(isSearching) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    
    if (isSearching) {
        emptyDiv.innerHTML = `
            <div class="empty-icon">🔍</div>
            <h3>No files found</h3>
            <p>Try adjusting your search terms.</p>
            <button class="empty-action" onclick="searchInput.value=''; handleSearch();">
                Clear Search
            </button>
        `;
    } else if (allFiles.length === 0) {
        emptyDiv.innerHTML = `
            <div class="empty-icon">📁</div>
            <h3>Welcome to Hawks Coach Hub</h3>
            <p>Sign in with Google Drive to access your training resources.</p>
        `;
    } else {
        emptyDiv.innerHTML = `
            <div class="empty-icon">📋</div>
            <h3>No files in this view</h3>
            <p>Try a different search or check your filters.</p>
        `;
    }
    
    return emptyDiv;
}

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

function getFileIcon(mimeType) {
    const iconClass = getFileIconClass(mimeType);
    return `<div class="file-type-icon ${iconClass}"></div>`;
}

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

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    let baseFiles;
    if (currentFolderFilter) {
        const folderData = folderCache.get(currentFolderFilter);
        baseFiles = folderData ? folderData.files : [];
    } else {
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
    updateFileCount();
}

async function refreshFiles() {
    console.log('Refresh requested. Current state:', {
        gapiInited,
        gisInited,
        hasAccessToken: !!accessToken
    });
    
    if (!gapiInited || !gisInited) {
        showToast('Reinitializing', 'Attempting to reload Google APIs...', 'info', 3000);
        updateStatus('Reinitializing Google APIs...', 'loading');
        
        gapiInited = false;
        gisInited = false;
        checkAPIsLoaded();
        return;
    }
    
    if (accessToken) {
        await loadDriveFiles();
    } else {
        showToast('Not Authenticated', 'Please sign in to refresh files', 'warning');
        updateStatus('Please sign in to access your files', 'info');
    }
}

function updateStatus(message, type = 'info') {
    if (statusText) {
        statusText.textContent = message;
    }
    
    if (statusDiv) {
        statusDiv.classList.remove('loading', 'success', 'error', 'info');
        statusDiv.classList.add(type);
    }
}

function updateFileCount() {
    const count = filteredFiles.length;
    if (fileCountBadge) {
        if (count === 0 && allFiles.length === 0) {
            fileCountBadge.textContent = 'No files found';
        } else {
            fileCountBadge.textContent = `${count} of ${allFiles.length} files`;
        }
    }
}

function clearFilesList() {
    allFilesList.innerHTML = '';
    allFiles = [];
    filteredFiles = [];
    allFolders = [];
    folderCache.clear();
    currentFolderFilter = null;
    if (folderChipsBar) folderChipsBar.style.display = 'none';
    updateFileCount();
}

// Toast Notification System
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
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    const toastContainer = document.getElementById('toastContainer');
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // Limit number of toasts
    const toasts = toastContainer.querySelectorAll('.toast');
    if (toasts.length > 3) {
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

// Folder navigation functionality
function cacheFolderStructure() {
    folderCache.clear();
    
    allFolders.forEach(folder => {
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

function displayFolderNavigation() {
    if (!folderChips) return;
    
    folderChips.innerHTML = '';
    
    // Show folder chips bar if we have folders
    if (allFolders.length > 0) {
        folderChipsBar.style.display = 'block';
        
        // Add "All Files" chip
        const allFilesChip = createFolderChip({
            id: 'all',
            name: 'All Files',
            fileCount: allFiles.length,
            isAllFiles: true
        });
        folderChips.appendChild(allFilesChip);
        
        // Sort folders by file count and show only those with files
        const sortedFolders = Array.from(folderCache.values())
            .filter(folder => folder.fileCount > 0)
            .sort((a, b) => {
                if (a.fileCount !== b.fileCount) {
                    return b.fileCount - a.fileCount;
                }
                return a.name.localeCompare(b.name);
            })
            .slice(0, 6); // Show max 6 folder chips
        
        sortedFolders.forEach(folder => {
            const folderChip = createFolderChip(folder);
            folderChips.appendChild(folderChip);
        });
    } else {
        folderChipsBar.style.display = 'none';
    }
}

function createFolderChip(folder) {
    const chip = document.createElement('div');
    chip.className = `folder-chip ${currentFolderFilter === folder.id ? 'active' : ''}`;
    chip.dataset.folderId = folder.id;
    
    const isAllFiles = folder.isAllFiles;
    const iconColor = isAllFiles ? '#78909C' : '#FFA000';
    
    chip.innerHTML = `
        <div class="folder-chip-icon" style="background: ${iconColor};"></div>
        <span>${folder.name}</span>
        <span class="folder-chip-count">${folder.fileCount}</span>
        ${!isAllFiles ? `<a href="${folder.webViewLink}" target="_blank" class="folder-chip-link" title="Open in Google Drive">↗</a>` : ''}
    `;
    
    // Add click handler
    chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('folder-chip-link')) {
            return;
        }
        filterByFolder(folder.id === 'all' ? null : folder.id, folder.name);
    });
    
    return chip;
}

function filterByFolder(folderId, folderName) {
    currentFolderFilter = folderId;
    
    // Update active state
    document.querySelectorAll('.folder-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    const activeChip = document.querySelector(`[data-folder-id="${folderId || 'all'}"]`);
    if (activeChip) {
        activeChip.classList.add('active');
    }
    
    // Filter files
    if (folderId) {
        const folderData = folderCache.get(folderId);
        let folderFiles = folderData ? folderData.files : [];
        
        // Apply search if active
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            folderFiles = folderFiles.filter(file =>
                file.name.toLowerCase().includes(searchTerm)
            );
        }
        
        filteredFiles = folderFiles;
        updateStatus(`Viewing folder: ${folderName} (${filteredFiles.length} files)`, 'info');
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
    
    displayFiles();
    updateFileCount();
}