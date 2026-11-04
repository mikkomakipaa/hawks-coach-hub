/**
 * Application State Management
 * Centralized state management for the Hawks Coach Hub application
 */

import type { DriveFile, DriveFolder } from '@/types/google-apis';

export interface AppState {
  allFiles: DriveFile[];
  filteredFiles: DriveFile[];
  allFolders: DriveFolder[];
  folderCache: Map<string, DriveFolder>;
  currentFolderFilter: string | null;
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export interface SessionPlanningState {
  isActive: boolean;
  selectedFiles: Set<string>;
  sessionName: string;
}

class AppStateManager {
  private state: AppState;
  private sessionState: SessionPlanningState;
  private stateChangeListeners: Array<(state: AppState) => void> = [];
  private sessionChangeListeners: Array<(sessionState: SessionPlanningState) => void> = [];

  constructor() {
    this.state = this.createInitialState();
    this.sessionState = this.createInitialSessionState();
  }

  private createInitialState(): AppState {
    return {
      allFiles: [],
      filteredFiles: [],
      allFolders: [],
      folderCache: new Map(),
      currentFolderFilter: null,
      currentPage: 1,
      itemsPerPage: 50,
      totalPages: 0,
    };
  }

  private createInitialSessionState(): SessionPlanningState {
    return {
      isActive: false,
      selectedFiles: new Set(),
      sessionName: '',
    };
  }

  // App State getters
  get allFiles(): DriveFile[] {
    return this.state.allFiles;
  }

  get filteredFiles(): DriveFile[] {
    return this.state.filteredFiles;
  }

  get allFolders(): DriveFolder[] {
    return this.state.allFolders;
  }

  get folderCache(): Map<string, DriveFolder> {
    return this.state.folderCache;
  }

  get currentFolderFilter(): string | null {
    return this.state.currentFolderFilter;
  }

  get currentPage(): number {
    return this.state.currentPage;
  }

  get itemsPerPage(): number {
    return this.state.itemsPerPage;
  }

  get totalPages(): number {
    return this.state.totalPages;
  }

  // Session State getters
  get isSessionActive(): boolean {
    return this.sessionState.isActive;
  }

  get selectedFiles(): Set<string> {
    return this.sessionState.selectedFiles;
  }

  get sessionName(): string {
    return this.sessionState.sessionName;
  }

  // App State setters with notifications
  setFiles(files: DriveFile[]): void {
    this.state.allFiles = files;
    this.state.filteredFiles = [...files];
    this.notifyStateChange();
  }

  setFolders(folders: DriveFolder[]): void {
    this.state.allFolders = folders;
    this.notifyStateChange();
  }

  setFilteredFiles(files: DriveFile[]): void {
    this.state.filteredFiles = files;
    this.updateTotalPages();
    this.notifyStateChange();
  }

  setCurrentFolderFilter(folderId: string | null): void {
    this.state.currentFolderFilter = folderId;
    this.state.currentPage = 1; // Reset to first page when changing filter
    this.notifyStateChange();
  }

  setCurrentPage(page: number): void {
    if (page >= 1 && page <= this.state.totalPages) {
      this.state.currentPage = page;
      this.notifyStateChange();
    }
  }

  // Session State setters
  setSessionActive(isActive: boolean): void {
    this.sessionState.isActive = isActive;
    if (!isActive) {
      this.sessionState.selectedFiles.clear();
    }
    this.notifySessionChange();
  }

  addFileToSession(fileId: string): void {
    this.sessionState.selectedFiles.add(fileId);
    this.notifySessionChange();
  }

  removeFileFromSession(fileId: string): void {
    this.sessionState.selectedFiles.delete(fileId);
    this.notifySessionChange();
  }

  setSessionName(name: string): void {
    this.sessionState.sessionName = name;
    this.notifySessionChange();
  }

  // Cache management
  updateFolderCache(): void {
    //console.log('🗂️ Updating folder cache:', this.state.allFolders.length, 'folders');
    this.state.folderCache.clear();
    
    let foldersWithFiles = 0;
    this.state.allFolders.forEach((folder) => {
      // Simple file counting: files that have this folder as parent  
      const directFiles = this.state.allFiles.filter(file => 
        file.parents && file.parents.includes(folder.id)
      );
      
      // Calculate hierarchy level
      const hierarchyLevel = this.calculateFolderLevel(folder.id);
      
      // Create extended folder object with file count and hierarchy level
      const extendedFolder = {
        ...folder,
        fileCount: directFiles.length,
        hierarchyLevel
      };
      
      this.state.folderCache.set(folder.id, extendedFolder);
      
      if (directFiles.length > 0) {
        foldersWithFiles++;
      }
    });

    //console.log(`✅ Cached ${this.state.allFolders.length} folders, ${foldersWithFiles} have files`);
    this.notifyStateChange();
  }

  private calculateFolderLevel(folderId: string): number {
    const HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';
    
    if (folderId === HAWKS_FOLDER_ID) return -1; // Root folder itself
    
    const folder = this.state.allFolders.find(f => f.id === folderId);
    if (!folder || !folder.parents || folder.parents.length === 0) return 999; // Unknown/orphaned
    
    const parentId = folder.parents[0];
    if (!parentId) return 999; // No parent ID
    if (parentId === HAWKS_FOLDER_ID) return 0; // Direct child of Hawks root
    
    // Recursively calculate parent level + 1
    return this.calculateFolderLevel(parentId) + 1;
  }

  private updateTotalPages(): void {
    this.state.totalPages = Math.ceil(this.state.filteredFiles.length / this.state.itemsPerPage);
  }

  // Reset state
  resetState(): void {
    this.state = this.createInitialState();
    this.notifyStateChange();
  }

  resetSessionState(): void {
    this.sessionState = this.createInitialSessionState();
    this.notifySessionChange();
  }

  // State listeners
  onStateChange(listener: (state: AppState) => void): () => void {
    this.stateChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  onSessionChange(listener: (sessionState: SessionPlanningState) => void): () => void {
    this.sessionChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.sessionChangeListeners.indexOf(listener);
      if (index > -1) {
        this.sessionChangeListeners.splice(index, 1);
      }
    };
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener({ ...this.state }); // Pass a copy to prevent mutation
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  private notifySessionChange(): void {
    this.sessionChangeListeners.forEach(listener => {
      try {
        listener({ ...this.sessionState }); // Pass a copy to prevent mutation
      } catch (error) {
        console.error('Error in session change listener:', error);
      }
    });
  }

  // Utility methods
  getPageItems(): DriveFile[] {
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = startIndex + this.state.itemsPerPage;
    return this.state.filteredFiles.slice(startIndex, endIndex);
  }

  getFileById(fileId: string): DriveFile | undefined {
    return this.state.allFiles.find(file => file.id === fileId);
  }

  getFolderById(folderId: string): DriveFolder | undefined {
    return this.state.folderCache.get(folderId);
  }

  // Performance monitoring
  getStateStats() {
    return {
      allFiles: this.state.allFiles.length,
      filteredFiles: this.state.filteredFiles.length,
      allFolders: this.state.allFolders.length,
      cachedFolders: this.state.folderCache.size,
      selectedFiles: this.sessionState.selectedFiles.size,
      stateListeners: this.stateChangeListeners.length,
      sessionListeners: this.sessionChangeListeners.length,
      currentPage: this.state.currentPage,
      totalPages: this.state.totalPages,
    };
  }
}

// Export singleton instance
export const appState = new AppStateManager();

// Types are already exported at the top of the file