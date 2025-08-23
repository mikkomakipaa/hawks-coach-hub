/**
 * Test script for service account Google Drive access
 */

import fs from 'fs';
import path from 'path';
import { google } from './api/node_modules/googleapis/build/src/index.js';

const HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';
const CREDENTIALS_PATH = './coach-hub-469817-5c7c8183293c.json';

async function testServiceAccount() {
  try {
    console.log('🔧 Testing Google Drive Service Account...');
    
    // Load credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(`Credentials file not found: ${CREDENTIALS_PATH}`);
    }
    
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    console.log('✅ Credentials loaded for:', credentials.client_email);
    
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Drive API initialized');
    
    // Test 1: Check access to Hawks folder
    console.log('\n📁 Testing folder access...');
    try {
      const folderResponse = await drive.files.list({
        q: `'${HAWKS_FOLDER_ID}' in parents`,
        pageSize: 5,
        fields: 'files(id, name, mimeType)',
      });
      
      const items = folderResponse.data.files || [];
      console.log(`✅ Found ${items.length} items in Hawks folder:`);
      items.forEach(item => {
        console.log(`   - ${item.name} (${item.mimeType})`);
      });
      
    } catch (error) {
      console.error('❌ Folder access failed:', error.message);
      if (error.code === 403) {
        console.log('💡 Make sure to share the folder with:', credentials.client_email);
      }
      return;
    }
    
    // Test 2: Load all files recursively
    console.log('\n📄 Testing recursive file loading...');
    const allFiles = [];
    const foldersToProcess = [HAWKS_FOLDER_ID];
    const processedFolders = new Set();

    while (foldersToProcess.length > 0) {
      const currentFolderId = foldersToProcess.shift();
      if (processedFolders.has(currentFolderId)) continue;
      
      processedFolders.add(currentFolderId);

      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents`,
        fields: 'files(id, name, mimeType, parents)',
        pageSize: 1000,
      });

      const items = response.data.files || [];
      
      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          foldersToProcess.push(item.id);
        } else {
          if (!item.name.startsWith('.')) {
            allFiles.push(item);
          }
        }
      }
    }
    
    console.log(`✅ Found ${allFiles.length} files total`);
    console.log('📋 Sample files:');
    allFiles.slice(0, 5).forEach(file => {
      console.log(`   - ${file.name}`);
    });
    
    // Test 3: Load all folders recursively  
    console.log('\n📂 Testing recursive folder loading...');
    const allFolders = [];
    const folderQueue = [HAWKS_FOLDER_ID];
    const processedFolderSet = new Set();

    while (folderQueue.length > 0) {
      const currentFolderId = folderQueue.shift();
      if (processedFolderSet.has(currentFolderId)) continue;
      
      processedFolderSet.add(currentFolderId);

      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, mimeType, parents)',
        pageSize: 1000,
      });

      const folders = response.data.files || [];
      
      for (const folder of folders) {
        if (!folder.name.startsWith('.')) {
          allFolders.push(folder);
          folderQueue.push(folder.id);
        }
      }
    }
    
    console.log(`✅ Found ${allFolders.length} folders total`);
    console.log('📋 Sample folders:');
    allFolders.slice(0, 5).forEach(folder => {
      console.log(`   - ${folder.name}`);
    });
    
    console.log('\n🎉 Service account test completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Files: ${allFiles.length}`);
    console.log(`   - Folders: ${allFolders.length}`);
    console.log(`   - Service account: ${credentials.client_email}`);
    
  } catch (error) {
    console.error('❌ Service account test failed:', error);
  }
}

testServiceAccount();