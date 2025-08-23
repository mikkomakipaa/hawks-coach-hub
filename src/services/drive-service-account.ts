/**
 * Service Account Drive API Service
 * Calls backend API instead of direct Google Drive API
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';

export class ServiceAccountDriveService {
  private readonly API_BASE = this.getApiBase();

  private getApiBase(): string {
    // In development, the API might not be available
    // For now, try to detect if we're in dev mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development mode - API might not be available
      return '/api/drive';
    }
    return '/api/drive';
  }

  /**
   * Load all files and folders from Hawks folder via service account
   */
  async loadAllFilesAndFolders(): Promise<{ files: DriveFile[], folders: DriveFolder[] }> {
    try {
      console.log('🔍 Loading files and folders via service account...');
      console.log('📡 API endpoint:', `${this.API_BASE}?type=both`);
      
      console.log('⏳ Making fetch request...');
      console.log('🧪 Testing with simple endpoint first...');
      
      // Test with simple endpoint first
      const testResponse = await fetch('/api/test');
      console.log('🧪 Test response status:', testResponse.status);
      const testData = await testResponse.json();
      console.log('🧪 Test data:', testData);
      
      console.log('📤 Making main API request...');
      const response = await fetch(`${this.API_BASE}?type=both`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('❌ Fetch error:', error);
        throw error;
      });
      
      console.log('📥 Fetch completed, response:', response.status, response.statusText);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ API Response:', response.status, response.statusText);
        console.error('❌ Error details:', errorText);
        
        if (response.status === 404) {
          throw new Error(`Service account API not available. Make sure the backend is deployed or running locally.`);
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      console.log('🔄 Parsing JSON response...');
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        throw new Error('Failed to parse API response as JSON');
      }
      
      console.log(`📊 Service account loaded: ${data.files?.length || 0} files, ${data.folders?.length || 0} folders`);
      
      return {
        files: data.files || [],
        folders: data.folders || []
      };
      
    } catch (error) {
      console.error('❌ Service account API error:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Unable to connect to service account API. The backend API is not running.');
      }
      
      throw new Error(`Failed to load Drive content: ${error.message}`);
    }
  }

  /**
   * Load only files from Hawks folder
   */
  async loadAllFiles(): Promise<DriveFile[]> {
    try {
      console.log('🔍 Loading files via service account...');
      
      const response = await fetch(`${this.API_BASE}?type=files`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📄 Service account loaded: ${data.files.length} files`);
      
      return data.files || [];
      
    } catch (error) {
      console.error('❌ Service account files error:', error);
      throw error;
    }
  }

  /**
   * Load only folders from Hawks folder
   */
  async loadAllFolders(): Promise<DriveFolder[]> {
    try {
      console.log('📂 Loading folders via service account...');
      
      const response = await fetch(`${this.API_BASE}?type=folders`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📁 Service account loaded: ${data.folders.length} folders`);
      
      return data.folders || [];
      
    } catch (error) {
      console.error('❌ Service account folders error:', error);
      throw error;
    }
  }

  /**
   * Get files within a specific folder (including subfolders)
   */
  getFilesInFolder(folderId: string, allFiles: DriveFile[], allFolders: DriveFolder[]): DriveFile[] {
    // Get files directly in this folder
    const directFiles = allFiles.filter(file => 
      file.parents && file.parents.includes(folderId)
    );
    
    // Get all subfolder IDs recursively
    const subfolderIds = this.getSubfolderIds(folderId, allFolders);
    
    // Get files from all subfolders
    const subfolderFiles = allFiles.filter(file =>
      file.parents && file.parents.some(parentId => subfolderIds.includes(parentId))
    );
    
    // Combine and deduplicate
    const allFolderFiles = [...directFiles, ...subfolderFiles];
    return allFolderFiles.filter((file, index, array) =>
      array.findIndex(f => f.id === file.id) === index
    );
  }

  /**
   * Get all subfolder IDs recursively
   */
  private getSubfolderIds(folderId: string, allFolders: DriveFolder[]): string[] {
    const subfolderIds: string[] = [];
    
    const directSubfolders = allFolders.filter(folder =>
      folder.parents && folder.parents.includes(folderId)
    );
    
    directSubfolders.forEach(subfolder => {
      subfolderIds.push(subfolder.id);
      // Recursively get subfolders
      const nestedSubfolders = this.getSubfolderIds(subfolder.id, allFolders);
      subfolderIds.push(...nestedSubfolders);
    });
    
    return subfolderIds;
  }
}