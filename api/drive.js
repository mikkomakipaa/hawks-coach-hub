/**
 * Serverless function for Google Drive API with Service Account
 * Deploy to Vercel Functions or similar
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Service account credentials (use environment variables in production)
let CREDENTIALS = null;

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  // Production: Use environment variable
  CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
  // Development: Use local file
  const keyPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
  if (fs.existsSync(keyPath)) {
    CREDENTIALS = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('🔑 Loaded service account from file:', keyPath);
  }
} else {
  // Try default local paths (for development)
  const possiblePaths = [
    path.resolve('../coach-hub-469817-5c7c8183293c.json'), // From api/ folder
    path.resolve('./coach-hub-469817-5c7c8183293c.json'),  // From root folder
    path.resolve(__dirname, '../coach-hub-469817-5c7c8183293c.json') // Relative to api folder
  ];
  
  for (const credPath of possiblePaths) {
    if (fs.existsSync(credPath)) {
      CREDENTIALS = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      console.log('🔑 Loaded service account from:', credPath);
      break;
    }
  }
}

const HAWKS_FOLDER_ID = process.env.HAWKS_FOLDER_ID || '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';

// Simple in-memory cache with TTL (5 minutes)
const cache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes
  
  get() {
    if (this.data && this.timestamp && (Date.now() - this.timestamp) < this.ttl) {
      return this.data;
    }
    return null;
  },
  
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  
  clear() {
    this.data = null;
    this.timestamp = null;
  },
  
  // Force expire cache for testing
  expire() {
    if (this.timestamp) {
      this.timestamp = Date.now() - this.ttl - 1000; // Force expire
    }
  }
};

// Initialize Google Drive API with service account
function initializeDrive() {
  if (!CREDENTIALS) {
    throw new Error('Service account credentials not found');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

// Timeout wrapper for API calls
async function withTimeout(promise, timeoutMs = 45000, errorMessage = 'Operation timed out') {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

// OPTIMIZED RECURSIVE: Get all files and folders with smart optimizations
async function getAllFilesAndFolders(drive, folderId = HAWKS_FOLDER_ID) {
  const startTime = Date.now();
  console.log('🚀 OPTIMIZED LOADING: Smart recursive with parallelization...');
  
  const allFiles = [];
  const allFolders = [];
  let apiCallCount = 0;
  
  // Use a queue-based approach with parallel processing
  const folderQueue = [folderId];
  const processedFolders = new Set();
  const BATCH_SIZE = 8; // Process 8 folders in parallel
  
  try {
    while (folderQueue.length > 0) {
      // Take up to BATCH_SIZE folders for parallel processing
      const currentBatch = folderQueue.splice(0, BATCH_SIZE);
      console.log(`📁 Processing batch of ${currentBatch.length} folders (${processedFolders.size} done, ${folderQueue.length} queued)`);
      
      // Process all folders in this batch in parallel
      const batchPromises = currentBatch.map(async (currentFolderId) => {
        if (processedFolders.has(currentFolderId)) return { files: [], folders: [] };
        
        processedFolders.add(currentFolderId);
        
        try {
          const response = await withTimeout(
            drive.files.list({
              q: `'${currentFolderId}' in parents and trashed = false`,
              fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
              pageSize: 1000
            }),
            8000, // 8 second timeout per folder
            `Folder ${currentFolderId} timed out`
          );
          
          const items = response.data.files || [];
          const folderFiles = [];
          const folderSubfolders = [];
          
          items.forEach(item => {
            if (!item.name.startsWith('.')) {
              if (item.mimeType === 'application/vnd.google-apps.folder') {
                folderSubfolders.push(item);
              } else {
                folderFiles.push(item);
              }
            }
          });
          
          return {
            files: folderFiles,
            folders: folderSubfolders,
            processedId: currentFolderId,
            itemCount: items.length
          };
        } catch (error) {
          console.error(`❌ Error processing folder ${currentFolderId}:`, error.message);
          return { files: [], folders: [], processedId: currentFolderId, itemCount: 0 };
        }
      });
      
      // Wait for all folders in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      apiCallCount += currentBatch.length;
      
      // Process results
      let batchFileCount = 0;
      let batchFolderCount = 0;
      
      batchResults.forEach(result => {
        if (result.files && result.folders) {
          allFiles.push(...result.files);
          allFolders.push(...result.folders);
          
          batchFileCount += result.files.length;
          batchFolderCount += result.folders.length;
          
          // Queue newly discovered folders for next batch
          result.folders.forEach(folder => {
            if (!processedFolders.has(folder.id)) {
              folderQueue.push(folder.id);
            }
          });
        }
      });
      
      console.log(`📊 Batch completed: +${batchFileCount} files, +${batchFolderCount} folders (${allFiles.length} total files, ${allFolders.length} total folders)`);
    }

    const loadTime = Date.now() - startTime;
    console.log(`📊 OPTIMIZED COMPLETE: ${allFiles.length} files, ${allFolders.length} folders`);
    console.log(`⚡ Performance: ${loadTime}ms total, ${apiCallCount} API calls, ${Math.round(loadTime/apiCallCount)}ms avg`);
    return { files: allFiles, folders: allFolders };

  } catch (error) {
    console.error('❌ Optimized loading failed, falling back to simple method:', error.message);
    return await getAllFilesAndFoldersSlowFallback(drive, folderId);
  }
}

// Fallback method (the old recursive approach)
async function getAllFilesAndFoldersSlowFallback(drive, folderId = HAWKS_FOLDER_ID) {
  console.log('🐌 Using slow fallback method...');
  const startTime = Date.now();
  
  const allFiles = [];
  const allFolders = [];
  const foldersToProcess = [folderId];
  const processedFolders = new Set();
  let processedCount = 0;
  let apiCallCount = 0;

  while (foldersToProcess.length > 0) {
    const currentFolderId = foldersToProcess.shift();
    if (processedFolders.has(currentFolderId)) continue;
    
    processedFolders.add(currentFolderId);
    processedCount++;

    try {
      const response = await withTimeout(
        drive.files.list({
          q: `'${currentFolderId}' in parents`,
          fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
          orderBy: 'name',
          pageSize: 1000
        }),
        10000,
        `Slow API call timed out for folder ${processedCount}`
      );
      apiCallCount++;

      const items = response.data.files || [];
      console.log(`📁 Slow Folder ${processedCount}: Found ${items.length} items`);
      
      for (const item of items) {
        if (!item.name.startsWith('.')) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            allFolders.push(item);
            foldersToProcess.push(item.id);
          } else {
            allFiles.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error processing folder', currentFolderId, ':', error.message);
    }
  }

  const loadTime = Date.now() - startTime;
  console.log(`📊 Slow method: ${allFiles.length} files, ${allFolders.length} folders in ${loadTime}ms`);
  return { files: allFiles, folders: allFolders };
}

// Wrapper functions for backward compatibility
async function getAllFiles(drive, folderId = HAWKS_FOLDER_ID) {
  const { files } = await getAllFilesAndFolders(drive, folderId);
  return files;
}

async function getAllFolders(drive, folderId = HAWKS_FOLDER_ID) {
  const { folders } = await getAllFilesAndFolders(drive, folderId);
  return folders;
}

// Main API handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = 'both', refresh } = req.query;

    // Check cache first (unless refresh is requested)
    console.log('🔍 Refresh param:', refresh, typeof refresh);
    let cached = null;
    if (!refresh || refresh === 'false' || refresh === '0') {
      cached = cache.get();
      console.log('📦 Checking cache...');
    } else {
      console.log('🔄 Refresh requested - bypassing cache');
      cached = null;
    }
    
    if (cached) {
      console.log('⚡ Using cached data (age:', Math.round((Date.now() - cache.timestamp) / 1000), 'seconds)');
      let files = cached.files || [];
      let folders = cached.folders || [];
      
      // Filter based on type if needed
      if (type === 'files') {
        folders = [];
      } else if (type === 'folders') {
        files = [];
      }
      
      console.log(`📤 API sending cached response: files: ${files.length}, folders: ${folders.length}`);
      return res.status(200).json({ files, folders, cached: true, timestamp: new Date().toISOString() });
    }

    // No cache, fetch from Drive API
    const drive = initializeDrive();
    console.log('⏳ Loading fresh data from Google Drive API...');

    let files = [];
    let folders = [];

    console.log('📋 Request type:', type);
    
    if (type === 'both') {
      // Optimized: load both in a single pass with timeout
      console.log('🔄 Starting getAllFilesAndFolders...');
      const result = await withTimeout(
        getAllFilesAndFolders(drive),
        60000, // 60 second total timeout
        'Google Drive loading timed out after 60 seconds'
      );
      console.log('✅ getAllFilesAndFolders completed');
      files = result.files;
      folders = result.folders;
      
      // Cache the full result for future requests
      console.log('💾 Setting cache...');
      cache.set({ files, folders });
      console.log('💾 ✅ Cached data for future requests');
    } else if (type === 'files') {
      console.log('📄 Loading files only...');
      files = await getAllFiles(drive);
    } else if (type === 'folders') {
      console.log('📁 Loading folders only...');
      folders = await getAllFolders(drive);
    }

    console.log(`📊 Returning ${files.length} files and ${folders.length} folders`);

    res.status(200).json({
      files,
      folders,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Drive content',
      message: error.message 
    });
  }
};