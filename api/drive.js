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

// Get all files and folders recursively from Hawks folder (optimized - single pass)
async function getAllFilesAndFolders(drive, folderId = HAWKS_FOLDER_ID) {
  console.log('🔍 Loading files and folders recursively from folder:', folderId);
  
  const allFiles = [];
  const allFolders = [];
  const foldersToProcess = [folderId];
  const processedFolders = new Set();
  let processedCount = 0;

  while (foldersToProcess.length > 0) {
    const currentFolderId = foldersToProcess.shift();
    if (processedFolders.has(currentFolderId)) continue;
    
    processedFolders.add(currentFolderId);
    processedCount++;

    try {
      // Load all items in a single API call
      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
        orderBy: 'name',
        pageSize: 1000 // Larger page size for efficiency
      });

      const items = response.data.files || [];
      console.log(`📁 Folder ${processedCount}: Found ${items.length} items`);
      
      for (const item of items) {
        if (!item.name.startsWith('.')) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            // It's a folder - add to results and processing queue
            allFolders.push(item);
            foldersToProcess.push(item.id);
          } else {
            // It's a file - add to results
            allFiles.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error processing folder', currentFolderId, ':', error.message);
    }
  }

  console.log(`📊 Total found: ${allFiles.length} files, ${allFolders.length} folders`);
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
    const drive = initializeDrive();
    const { type = 'both' } = req.query;

    let files = [];
    let folders = [];

    if (type === 'both') {
      // Optimized: load both in a single pass
      const result = await getAllFilesAndFolders(drive);
      files = result.files;
      folders = result.folders;
    } else if (type === 'files') {
      files = await getAllFiles(drive);
    } else if (type === 'folders') {
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