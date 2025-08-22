/**
 * Google Drive API Service
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';
import { PAGINATION_SIZE } from '@/utils/config';

export class DriveApiService {
  /**
   * Load all files from Google Drive with pagination
   */
  async loadAllFiles(): Promise<DriveFile[]> {
    const allFiles: DriveFile[] = [];
    let nextPageToken: string | null = null;

    do {
      const response = await gapi.client.drive.files.list({
        pageSize: PAGINATION_SIZE,
        pageToken: nextPageToken,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents)',
        orderBy: 'name',
        q: "mimeType != 'application/vnd.google-apps.folder'"
      });

      const files = response.result.files || [];
      allFiles.push(...files);
      nextPageToken = response.result.nextPageToken || null;
    } while (nextPageToken);

    // Filter out system files
    return allFiles.filter(file => 
      !file.name.startsWith('.') && 
      file.mimeType !== 'application/vnd.google-apps.script'
    );
  }

  /**
   * Load all folders from Google Drive with pagination
   */
  async loadAllFolders(): Promise<DriveFolder[]> {
    const allFolders: DriveFolder[] = [];
    let nextPageToken: string | null = null;

    do {
      const response = await gapi.client.drive.files.list({
        pageSize: PAGINATION_SIZE,
        pageToken: nextPageToken,
        fields: 'nextPageToken, files(id, name, mimeType, webViewLink, parents)',
        orderBy: 'name',
        q: "mimeType = 'application/vnd.google-apps.folder'"
      });

      const folders = response.result.files || [];
      allFolders.push(...folders as DriveFolder[]);
      nextPageToken = response.result.nextPageToken || null;
    } while (nextPageToken);

    // Filter out system folders
    return allFolders.filter(folder => !folder.name.startsWith('.'));
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