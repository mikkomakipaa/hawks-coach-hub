// Configuration - Replace with your actual values
// WARNING: These are public credentials - ensure proper restrictions in Google Cloud Console
const CLIENT_ID = '1065457583274-6k0r5kfrvrelg1ufr2887814j33ga6va.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA1sQ8pUAKbsE8gwZfG-9Z-lwRLWO9GXak';
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
const lastUpdated = document.getElementById('lastUpdated');
const fileCountBadge = document.getElementById('fileCount');
const totalFilesSpan = document.getElementById('totalFiles');

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
            updateStatus('Failed to load Google APIs. Please refresh the page.', 'error');
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
        updateStatus('Failed to initialize Google APIs: ' + error.message, 'error');
        
        // Provide more specific error guidance
        if (error.message.includes('discovery')) {
            updateStatus('Google API discovery failed. Check your internet connection and try refreshing.', 'error');
        } else if (error.message.includes('API key')) {
            updateStatus('Invalid API key. Please check your Google Cloud Console configuration.', 'error');
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
            updateStatus('Authorization failed: ' + resp.error, 'error');
            throw (resp);
        }
        accessToken = resp.access_token;
        document.getElementById('signout_div').style.display = 'block';
        document.getElementById('authorize_div').style.display = 'none';
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
}

/**
 * Load files from Google Drive
 */
async function loadDriveFiles() {
    updateStatus('Loading files from Google Drive...', 'loading');
    
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
            displayFiles();
            displayCategories();
            updateFileCount();
            updateStatus(`Successfully loaded ${allFiles.length} training resources`, 'success');
            lastUpdated.textContent = new Date().toLocaleString();
        } else {
            updateStatus('No files found', 'info');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        updateStatus('Error loading files: ' + error.message, 'error');
    }
}

/**
 * Display files in the main list
 */
function displayFiles() {
    allFilesList.innerHTML = '';
    
    if (filteredFiles.length === 0) {
        allFilesList.innerHTML = '<div class="loading">No files match your search</div>';
        return;
    }

    filteredFiles.forEach(file => {
        const fileItem = createFileItem(file);
        allFilesList.appendChild(fileItem);
    });
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
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('folder')) return '📁';
    return '📄';
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
        await loadDriveFiles();
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
    if (totalFilesSpan) {
        totalFilesSpan.textContent = allFiles.length;
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