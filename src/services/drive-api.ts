/**
 * Google Drive API Service
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';
import { PAGINATION_SIZE } from '@/utils/config';

export class DriveApiService {
  // Hawks Helsinki Shared Folder ID (publicly shared folder)
  private readonly HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';

  /**
   * Check if user has access to the Hawks Helsinki shared folder
   */
  async checkFolderAccess(): Promise<boolean> {
    try {
      console.log('🔑 Checking access to Hawks folder:', this.HAWKS_FOLDER_ID);
      
      // Try to list the folder contents to verify access
      const response = await gapi.client.drive.files.list({
        q: `'${this.HAWKS_FOLDER_ID}' in parents`,
        pageSize: 1,
        fields: 'files(id, name)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
      } as any);
      
      console.log('✅ Hawks folder access confirmed:', response.result);
      return true;
    } catch (error) {
      console.error('❌ No access to Hawks folder:', error);
      return false;
    }
  }

  /**
   * Load all files from Hawks Helsinki shared folder with pagination (including subfolders)
   */
  async loadAllFiles(): Promise<DriveFile[]> {
    console.log('🔍 Loading files from Hawks folder and all subfolders:', this.HAWKS_FOLDER_ID);

    // First, get all folders to build the complete folder hierarchy
    const allFolders = await this.loadAllFolders();
    const allFolderIds = [this.HAWKS_FOLDER_ID, ...allFolders.map(f => f.id)];
    
    console.log('📂 Total folders to search:', allFolderIds.length);

    const allFiles: DriveFile[] = [];
    let nextPageToken: string | null = null;

    do {
      // Build query to search for files in the main folder OR any of its subfolders
      const parentQueries = allFolderIds.map(folderId => `'${folderId}' in parents`);
      const query = `mimeType != 'application/vnd.google-apps.folder' and (${parentQueries.join(' or ')})`;
      console.log('📋 File query length:', query.length);

      const response = await gapi.client.drive.files.list({
        pageSize: PAGINATION_SIZE,
        pageToken: nextPageToken,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents)',
        orderBy: 'name',
        q: query,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
      } as any);

      console.log('📁 Files API response:', response.result);
      const files = response.result.files || [];
      console.log('📄 Raw files found:', files.length);
      
      if (files.length > 0) {
        console.log('📄 Sample files:', files.slice(0, 3).map(f => ({ name: f.name, parents: f.parents })));
      }

      allFiles.push(...files);
      nextPageToken = response.result.nextPageToken || null;
    } while (nextPageToken);

    console.log('📊 Total raw files before filtering:', allFiles.length);

    // Filter out system files
    const filteredFiles = allFiles.filter(file => 
      !file.name.startsWith('.') && 
      file.mimeType !== 'application/vnd.google-apps.script'
    );

    console.log('📊 Final filtered files:', filteredFiles.length);
    return filteredFiles;
  }

  /**
   * Load all folders from Hawks Helsinki shared folder with pagination (including nested subfolders)
   */
  async loadAllFolders(): Promise<DriveFolder[]> {
    console.log('📂 Loading folders recursively from Hawks folder:', this.HAWKS_FOLDER_ID);

    // Start by getting direct children of the Hawks folder
    const allFolders: DriveFolder[] = [];
    const foldersToProcess = [this.HAWKS_FOLDER_ID];
    const processedFolders = new Set<string>();

    while (foldersToProcess.length > 0) {
      const currentFolderId = foldersToProcess.shift()!;
      if (processedFolders.has(currentFolderId)) continue;
      
      processedFolders.add(currentFolderId);
      console.log('🔍 Processing folder:', currentFolderId);

      let nextPageToken: string | null = null;
      do {
        const query = `mimeType = 'application/vnd.google-apps.folder' and '${currentFolderId}' in parents`;
        console.log('📋 Folder query for', currentFolderId, ':', query);

        const response = await gapi.client.drive.files.list({
          pageSize: PAGINATION_SIZE,
          pageToken: nextPageToken,
          fields: 'nextPageToken, files(id, name, mimeType, webViewLink, parents)',
          orderBy: 'name',
          q: query,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true
        } as any);

        const folders = response.result.files || [];
        console.log('📁 Found', folders.length, 'subfolders in', currentFolderId);
        
        if (folders.length > 0) {
          console.log('📁 Subfolder names:', folders.map(f => f.name));
          allFolders.push(...folders as DriveFolder[]);
          // Add these folders to be processed for their own subfolders
          folders.forEach(folder => foldersToProcess.push(folder.id));
        }

        nextPageToken = response.result.nextPageToken || null;
      } while (nextPageToken);
    }

    console.log('📊 Total folders found recursively:', allFolders.length);

    // Filter out system folders
    const filteredFolders = allFolders.filter(folder => !folder.name.startsWith('.'));
    
    console.log('📊 Final filtered folders:', filteredFolders.length);
    return filteredFolders;
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