// Configuration - Will be set after env-loader.js runs
let CLIENT_ID;
let API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

// Source folder configuration  
const SOURCE_FOLDER_ID = '1OEK4hCI6XzbS548UB4Rxd0OxlubsPADg';

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
// Status elements removed from UI
const searchInput = document.getElementById('searchInput');
const refreshButton = document.getElementById('refreshButton');
const allFilesList = document.getElementById('allFilesList');
const fileCountBadge = document.getElementById('fileCount');
const folderChips = document.getElementById('folderChips');
const folderChipsBar = document.getElementById('folderChipsBar');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    console.log('Alustetaan Hawks Valmennuskeskusta...');
    
    // Load credentials from env-loader.js
    loadCredentials();
    
    setupEventListeners();
    updateStatus('Ladataan Google API:ja...', 'loading');
    
    // Reset initialization flags
    gapiInited = false;
    gisInited = false;
    
    // Wait for APIs to load
    checkAPIsLoaded();
}

function loadCredentials() {
    CLIENT_ID = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
    API_KEY = window.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
    
    if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE' || API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
        console.error('❌ Credentials not loaded properly from env-loader.js');
    } else {
        console.log('✅ Credentials loaded successfully');
    }
}

function checkAPIsLoaded() {
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds total
    
    updateStatus('Ladataan Google API:ja...', 'loading');
    
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
            const errorMsg = 'Google API:jen lataaminen epäonnistui 30 sekunnin jälkeen. Tarkista internetyhteys ja päivitä sivu.';
            updateStatus(errorMsg, 'error');
            showToast('Latausaikakatkaisu', errorMsg, 'error');
            
            // Debug: Log what's missing
            console.error('API loading failed. Status:', {
                gapi: typeof gapi !== 'undefined',
                google: typeof google !== 'undefined', 
                accounts: typeof google !== 'undefined' && google.accounts,
                domain: window.location.hostname
            });
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
            const credentialsMsg = 'Määritä Google API -tunnuksesi. Katso asennusohjeet README.md-tiedostosta.';
            updateStatus(credentialsMsg, 'error');
            showToast('Määritys vaaditaan', credentialsMsg, 'warning', 0);
            return;
        }
        
        updateStatus('Alustetaan Google Drive API...', 'loading');
        
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
            throw new Error('Virheellinen API-avain. Tarkista Google Cloud Console -määritykset.');
        }
        
        // Initialize without discovery docs (more reliable)
        console.log('Alustetaan GAPI-asiakasta ilman discovery docs...');
        await gapi.client.init({
            apiKey: API_KEY,
        });
        
        // Load the Drive API manually
        console.log('Ladataan Google Drive API v3...');
        await gapi.client.load('drive', 'v3');
        
        console.log('GAPI-asiakas alustettu onnistuneesti');
        gapiInited = true;
        
        // Initialize Google Identity Services
        if (typeof google === 'undefined' || !google.accounts) {
            throw new Error('Google Identity Services ei ladattu');
        }
        
        console.log('Alustetaan token-asiakasta CLIENT_ID:llä:', CLIENT_ID);
        
        if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            throw new Error('CLIENT_ID ei määritetty. Aseta Google Client ID.');
        }
        
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
                hint: localStorage.getItem('google_account_hint') || undefined,
                state: 'hawks_coach_hub_session'
            });
            
            console.log('Google Identity Services alustettu onnistuneesti');
            gisInited = true;
            
            // Enable sign-in button
            maybeEnableButtons();
        } catch (tokenError) {
            console.error('Error initializing token client:', tokenError);
            throw new Error('Todennusasiakkaan alustus epäonnistui: ' + tokenError.message);
        }
        
    } catch (error) {
        console.error('Error initializing Google APIs:', error);
        const errorMsg = 'Google API:jen alustus epäonnistui: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Alustus epäonnistui', errorMsg, 'error');
        
        // Provide more specific error guidance
        if (error.message.includes('API key') || error.message.includes('Invalid')) {
            const keyMsg = 'Virheellinen API-avain. Tarkista Google Cloud Console -määritykset ja varmista että API-avain on käytössä Google Drive API:lle.';
            updateStatus(keyMsg, 'error');
            showToast('Määritysvirhe', keyMsg, 'error');
        } else if (error.message.includes('load') || error.message.includes('network') || error.message.includes('discovery')) {
            const networkMsg = 'Verkkovirhe Google API:jen latauksessa. Tarkista internetyhteys ja yritä päivittää sivua.';
            updateStatus(networkMsg, 'error');
            showToast('Yhteysongelma', networkMsg, 'error');
        } else if (error.message.includes('CORS') || error.message.includes('origin')) {
            const corsMsg = 'Verkkotunnus ei ole valtuutettu. Lisää verkkotunnuksesi valtuutettuihin JavaScript-alkuperäihin Google Cloud Consolessa.';
            updateStatus(corsMsg, 'error');
            showToast('Valtuutusvirhe', corsMsg, 'error');
        }
    }
}

function maybeEnableButtons() {
    console.log('Checking if APIs are ready:', { gapiInited, gisInited });
    
    if (gapiInited && gisInited) {
        console.log('Both APIs initialized - checking for existing session');
        
        // Check for existing valid token
        const existingToken = gapi.client.getToken();
        if (existingToken && existingToken.access_token) {
            console.log('Found existing valid session');
            accessToken = existingToken.access_token;
            document.getElementById('signout_div').style.display = 'block';
            document.getElementById('authorize_div').style.display = 'none';
            updateStatus('Kirjauduttu sisään - ladataan tiedostoja...', 'loading');
            showToast('Istunto palautettu', 'Kirjautuminen säilytetty', 'success', 2000);
            
            // Automatically load files
            loadDriveFiles().catch(error => {
                console.error('Error loading files from restored session:', error);
                // If loading fails, show login button
                document.getElementById('signout_div').style.display = 'none';
                document.getElementById('authorize_div').style.display = 'block';
                updateStatus('Valmis kirjautumaan Google Driveen', 'info');
            });
        } else {
            console.log('No existing session found - showing login button');
            document.getElementById('authorize_div').style.display = 'block';
            document.getElementById('signout_div').style.display = 'none';
            updateStatus('Valmis kirjautumaan Google Driveen', 'info');
            showToast('Valmis kirjautumaan', 'Google API:t ladattu onnistuneesti', 'success', 3000);
        }
    } else {
        console.log('APIs not ready yet:', { 
            gapiInited, 
            gisInited,
            gapiExists: typeof gapi !== 'undefined',
            googleExists: typeof google !== 'undefined'
        });
        updateStatus('Alustetaan Google API:ja...', 'loading');
    }
}

function handleAuthClick() {
    console.log('Sisaankirjautumispainiketta painettu');
    
    if (!gapiInited || !gisInited) {
        const errorMsg = 'Google API:ja ei ole vielä täysin alustettu. Odota tai päivitä sivu.';
        updateStatus(errorMsg, 'error');
        showToast('Ei valmis', errorMsg, 'warning');
        return;
    }
    
    if (!tokenClient) {
        const errorMsg = 'Todennusasiakas ei ole alustettu. Päivitä sivu.';
        updateStatus(errorMsg, 'error');
        showToast('Todennusvirhe', errorMsg, 'error');
        return;
    }
    
    console.log('Aloitetaan todennusprosessi...');
    updateStatus('Aloitetaan kirjautumisprosessi...', 'loading');
    
    tokenClient.callback = async (resp) => {
        console.log('Authentication response received:', resp);
        
        if (resp.error !== undefined) {
            console.error('Authentication error:', resp.error);
            const errorMsg = 'Valtuutus epäonnistui: ' + resp.error;
            updateStatus(errorMsg, 'error');
            showToast('Todennus epäonnistui', errorMsg, 'error');
            return;
        }
        
        console.log('Todennus onnistui, ladataan tiedostoja...');
        accessToken = resp.access_token;
        
        // Store session information for persistence
        if (resp.state === 'hawks_coach_hub_session') {
            localStorage.setItem('last_login_time', Date.now().toString());
            localStorage.setItem('session_active', 'true');
        }
        
        document.getElementById('signout_div').style.display = 'block';
        document.getElementById('authorize_div').style.display = 'none';
        showToast('Todennus onnistui', 'Yhteys Google Driveen muodostettu', 'success');
        
        try {
            await loadDriveFiles();
        } catch (error) {
            console.error('Error loading files after authentication:', error);
            updateStatus('Todennus onnistui mutta tiedostojen lataus epäonnistui: ' + error.message, 'error');
        }
    };

    try {
        if (gapi.client.getToken() === null) {
            console.log('Ei olemassa olevaa tokenia, pyydetään uutta pääsyjä');
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            console.log('Olemassa oleva token löytyi, pyydetään pääsyjä');
            tokenClient.requestAccessToken({prompt: ''});
        }
    } catch (error) {
        console.error('Error requesting access token:', error);
        updateStatus('Virhe todennuksen aloituksessa: ' + error.message, 'error');
        showToast('Todennusvirhe', 'Sisaankirjautumisprosessin aloitus epäonnistui', 'error');
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    accessToken = '';
    
    // Clear session information
    localStorage.removeItem('last_login_time');
    localStorage.removeItem('session_active');
    localStorage.removeItem('google_account_hint');
    
    document.getElementById('signout_div').style.display = 'none';
    document.getElementById('authorize_div').style.display = 'block';
    clearFilesList();
    updateStatus('Kirjauduttu ulos', 'info');
    showToast('Kirjauduttu ulos', 'Yhteys Google Driveen katkaistiin', 'info');
}

// Helper function to get all files with pagination
async function getAllFilesWithPagination(query, fields = 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents)') {
    let allFiles = [];
    let pageToken = null;
    
    do {
        const request = {
            pageSize: 1000,
            fields: fields,
            orderBy: 'name',
            q: query
        };
        
        if (pageToken) {
            request.pageToken = pageToken;
        }
        
        const response = await gapi.client.drive.files.list(request);
        const files = response.result.files || [];
        allFiles = allFiles.concat(files);
        pageToken = response.result.nextPageToken;
        
    } while (pageToken);
    
    return allFiles;
}

async function loadDriveFiles() {
    updateStatus('Ladataan tiedostoja Google Drivesta...', 'loading');
    showToast('Ladataan tiedostoja', 'Haetaan harjoitusmateriaaleja...', 'info', 2000);
    
    try {
        // Load files from source folder and its subfolders (focused approach)
        console.log(`Loading files and subfolders from source folder: ${SOURCE_FOLDER_ID}`);
        
        const [sourceFiles, subfolders] = await Promise.all([
            // Files directly in source folder
            getAllFilesWithPagination(`"${SOURCE_FOLDER_ID}" in parents and mimeType != 'application/vnd.google-apps.folder'`),
            // Subfolders of source folder
            getAllFilesWithPagination(`"${SOURCE_FOLDER_ID}" in parents and mimeType = 'application/vnd.google-apps.folder'`)
        ]);
        
        console.log(`Found ${sourceFiles.length} files in source folder and ${subfolders.length} subfolders`);
        console.log('Source files:', sourceFiles.map(f => f.name));
        console.log('Subfolders:', subfolders.map(f => f.name));
        
        // Load files from all subfolders
        let subfolderFiles = [];
        if (subfolders.length > 0) {
            console.log(`Loading files from ${subfolders.length} subfolders...`);
            
            const subfolderFilePromises = subfolders.map(async (folder) => {
                const files = await getAllFilesWithPagination(`"${folder.id}" in parents and mimeType != 'application/vnd.google-apps.folder'`);
                console.log(`Subfolder "${folder.name}" contains ${files.length} files`);
                return files;
            });
            
            const subfolderFileArrays = await Promise.all(subfolderFilePromises);
            subfolderFiles = subfolderFileArrays.flat();
            console.log(`Total files in subfolders: ${subfolderFiles.length}`);
        }
        
        // Combine files from source folder and all its subfolders
        const allFoundFiles = [...sourceFiles, ...subfolderFiles];
        // Use only subfolders from source folder for chips (focused approach)
        const folders = subfolders;
        
        console.log(`Total files found in source folder tree: ${allFoundFiles.length}`);
        
        if (allFoundFiles && allFoundFiles.length > 0) {
            // Assign to global allFiles variable
            allFiles.length = 0; // Clear array
            allFiles.push(...allFoundFiles.filter(file => 
                !file.name.startsWith('.') && 
                file.mimeType !== 'application/vnd.google-apps.script'
            ));
            
            filteredFiles = [...allFiles];
        } else {
            allFiles.length = 0; // Clear array
            filteredFiles = [];
        }
        
        if (folders && folders.length > 0) {
            // Assign to global allFolders variable
            allFolders.length = 0; // Clear array
            allFolders.push(...folders.filter(folder => !folder.name.startsWith('.')));
            cacheFolderStructure();
        } else {
            allFolders.length = 0; // Clear array
        }
        
        displayFiles();
        displayFolderNavigation();
        updateFileCount();
        
        if (allFiles.length === 0) {
            updateStatus('Tiedostoja ei löytynyt valitusta kansiosta', 'info');
            showToast('Tiedostoja ei löytynyt', 'Valitusta kansiosta ei löytynyt harjoitusmateriaaleja', 'info');
        } else {
            updateStatus(`Ladattiin onnistuneesti ${allFiles.length} harjoitusmateriaalia valitusta kansiosta`, 'success');
            showToast('Tiedostot ladattu', `Löydettiin ${allFiles.length} harjoitusmateriaalia`, 'success');
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const errorMsg = 'Virhe tiedostojen latauksessa: ' + error.message;
        updateStatus(errorMsg, 'error');
        showToast('Lataus epäonnistui', errorMsg, 'error');
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
            <h3>Tiedostoja ei löytynyt</h3>
            <p>Kokeile muuttaa hakuehtoja.</p>
            <button class="empty-action" onclick="searchInput.value=''; handleSearch();">
                Tyhjennä haku
            </button>
        `;
    } else if (allFiles.length === 0) {
        emptyDiv.innerHTML = `
            <div class="empty-icon">📁</div>
            <h3>Tervetuloa Hawks Valmennuskeskukseen</h3>
            <p>Kirjaudu Google Drivellä käyttääksesi harjoitusmateriaaleja.</p>
        `;
    } else {
        emptyDiv.innerHTML = `
            <div class="empty-icon">📋</div>
            <h3>Ei tiedostoja tässä näkymässä</h3>
            <p>Kokeile eri hakua tai tarkista suodattimesi.</p>
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
            <div class="file-date">Muokattu: ${modifiedDate}</div>
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
        showToast('Uudelleenalustetaan', 'Yritetään ladata Google API:t uudelleen...', 'info', 3000);
        updateStatus('Uudelleenalustetaan Google API:ja...', 'loading');
        
        gapiInited = false;
        gisInited = false;
        checkAPIsLoaded();
        return;
    }
    
    if (accessToken) {
        await loadDriveFiles();
    } else {
        showToast('Ei kirjauduttu', 'Kirjaudu sisään päivittääksesi tiedostot', 'warning');
        updateStatus('Kirjaudu sisään käyttääksesi tiedostojasi', 'info');
    }
}

function updateStatus(message, type = 'info') {
    // Status display removed from UI - messages now only shown via console/toasts
    console.log(`Status [${type}]: ${message}`);
}

function updateFileCount() {
    const count = filteredFiles.length;
    if (fileCountBadge) {
        if (count === 0 && allFiles.length === 0) {
            fileCountBadge.textContent = 'Tiedostoja ei löytynyt';
        } else {
            fileCountBadge.textContent = `${count}/${allFiles.length} tiedostoa`;
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
        
        console.log(`Folder "${folder.name}" has ${filesInFolder.length} files`);
    });
    
    console.log(`Välimuistiin tallennettu ${folderCache.size} kansiota tiedostomäärineen`);
    
    // Debug: Show all folders and their file counts
    const foldersWithFiles = Array.from(folderCache.values()).filter(f => f.fileCount > 0);
    const foldersWithoutFiles = Array.from(folderCache.values()).filter(f => f.fileCount === 0);
    console.log(`Folders with files: ${foldersWithFiles.length}`, foldersWithFiles.map(f => `${f.name} (${f.fileCount})`));
    console.log(`Folders without files: ${foldersWithoutFiles.length}`, foldersWithoutFiles.map(f => f.name));
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
            name: 'Kaikki tiedostot',
            fileCount: allFiles.length,
            isAllFiles: true
        });
        folderChips.appendChild(allFilesChip);
        
        // Sort folders by file count and show all folders that contain files
        const sortedFolders = Array.from(folderCache.values())
            .filter(folder => {
                // Show all folders that contain files
                return folder.fileCount > 0;
            })
            .sort((a, b) => {
                if (a.fileCount !== b.fileCount) {
                    return b.fileCount - a.fileCount;
                }
                return a.name.localeCompare(b.name);
            })
            .slice(0, 8); // Show max 8 folder chips for better coverage
        
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
        updateStatus(`Katsotaan kansiota: ${folderName} (${filteredFiles.length} tiedostoa)`, 'info');
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
        
        updateStatus(`Katsotaan kaikkia tiedostoja (yhteensä ${filteredFiles.length})`, 'info');
    }
    
    displayFiles();
    updateFileCount();
}