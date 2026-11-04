/**
 * File Actions Manager
 * Handles all file-related actions including session planning
 */

import { appState } from '@/state/app-state';
import { showToast } from '@/components/toast';

export interface FileActionsInterface {
  addToSession: (_fileId: string) => void;
  togglePlanningMode: () => void;
  exportSession: () => void;
  removeFromSession: (_fileId: string) => void;
}

class FileActionsManager implements FileActionsInterface {
  private cleanup: Array<() => void> = [];

  constructor() {
    this.setupGlobalActions();
  }

  /**
   * Add global file actions to window for HTML onclick handlers
   */
  private setupGlobalActions(): void {
    if (typeof window !== 'undefined') {
      window.FileActions = {
        addToSession: this.addToSession.bind(this),
        togglePlanningMode: this.togglePlanningMode.bind(this),
        exportSession: this.exportSession.bind(this),
        removeFromSession: this.removeFromSession.bind(this),
      };
    }
  }

  /**
   * Add file to session planning
   */
  addToSession(fileId: string): void {
    if (appState.isSessionActive) {
      appState.addFileToSession(fileId);
      showToast(
        'Tiedosto lisätty',
        'Materiaali lisätty harjoitussuunnitelmaan',
        'success',
        2000
      );
    } else {
      // Auto-enable planning mode and add file
      appState.setSessionActive(true);
      appState.addFileToSession(fileId);
      showToast(
        'Harjoitussuunnittelu aloitettu',
        'Ensimmäinen materiaali lisätty',
        'info',
        3000
      );
    }
  }

  /**
   * Toggle session planning mode
   */
  togglePlanningMode(): void {
    appState.setSessionActive(!appState.isSessionActive);
  }

  /**
   * Export session as clipboard-ready text
   */
  exportSession(): void {
    if (appState.selectedFiles.size === 0) {
      showToast(
        'Ei materiaaleja',
        'Lisää ensin materiaaleja harjoitukseen',
        'warning',
        3000
      );
      return;
    }

    const selectedFilesList = Array.from(appState.selectedFiles)
      .map(fileId => appState.getFileById(fileId))
      .filter(Boolean)
      .map(file => `• ${file!.name}\n  🔗 ${file!.webViewLink}`)
      .join('\n\n');

    const sessionData = `HAWKS HARJOITUSSUUNNITELMA
Luotu: ${new Date().toLocaleDateString('fi-FI')}

MATERIAALIT (${appState.selectedFiles.size} kpl):
${selectedFilesList}

----
Luotu Hawks Valmennuskeskuksessa
📁 Kaikki materiaalit: https://drive.google.com/drive/folders/1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb`;

    navigator.clipboard
      .writeText(sessionData)
      .then(() => {
        showToast(
          'Suunnitelma kopioitu',
          'Harjoitussuunnitelma kopioitu leikepöydälle',
          'success',
          3000
        );
      })
      .catch(() => {
        showToast(
          'Virhe',
          'Harjoitussuunnitelma kopioitu leikepöydälle',
          'error',
          3000
        );
      });
  }

  /**
   * Remove file from session planning
   */
  removeFromSession(fileId: string): void {
    appState.removeFileFromSession(fileId);
    showToast(
      'Materiaali poistettu',
      'Materiaali poistettu harjoitussuunnitelmasta',
      'info',
      2000
    );
  }

  /**
   * Batch add multiple files to session
   */
  addMultipleToSession(fileIds: string[]): void {
    if (fileIds.length === 0) return;

    if (!appState.isSessionActive) {
      appState.setSessionActive(true);
    }

    fileIds.forEach(fileId => {
      appState.addFileToSession(fileId);
    });

    showToast(
      'Materiaaleja lisätty',
      `${fileIds.length} materiaalia lisätty harjoitussuunnitelmaan`,
      'success',
      3000
    );
  }

  /**
   * Clear all files from session
   */
  clearSession(): void {
    if (appState.selectedFiles.size === 0) {
      showToast(
        'Ei materiaaleja',
        'Harjoitussuunnitelmassa ei ole materiaaleja',
        'info',
        2000
      );
      return;
    }

    const fileCount = appState.selectedFiles.size;
    appState.selectedFiles.clear();
    
    showToast(
      'Suunnitelma tyhjennetty',
      `${fileCount} materiaalia poistettu`,
      'info',
      2000
    );
  }

  /**
   * Check if file is in current session
   */
  isFileInSession(fileId: string): boolean {
    return appState.selectedFiles.has(fileId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { fileCount: number; isActive: boolean } {
    return {
      fileCount: appState.selectedFiles.size,
      isActive: appState.isSessionActive,
    };
  }

  /**
   * Save session to local storage (optional feature)
   */
  saveSessionToStorage(): void {
    try {
      const sessionData = {
        isActive: appState.isSessionActive,
        selectedFiles: Array.from(appState.selectedFiles),
        sessionName: appState.sessionName,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem('hawksSession', JSON.stringify(sessionData));
      
      showToast(
        'Suunnitelma tallennettu',
        'Harjoitussuunnitelma tallennettu väliaikaisesti',
        'success',
        2000
      );
    } catch (error) {
      // console.error('Failed to save session to storage:', error);
      showToast(
        'Tallennusvirhe',
        'Harjoitussuunnitelman tallennus epäonnistui',
        'error',
        3000
      );
    }
  }

  /**
   * Load session from local storage
   */
  loadSessionFromStorage(): boolean {
    try {
      const saved = localStorage.getItem('hawksSession');
      if (!saved) return false;

      const sessionData = JSON.parse(saved);
      
      // Validate data structure
      if (!sessionData.selectedFiles || !Array.isArray(sessionData.selectedFiles)) {
        return false;
      }

      appState.setSessionActive(sessionData.isActive || false);
      
      // Restore selected files
      sessionData.selectedFiles.forEach((fileId: string) => {
        appState.addFileToSession(fileId);
      });

      if (sessionData.sessionName) {
        appState.setSessionName(sessionData.sessionName);
      }

      showToast(
        'Suunnitelma ladattu',
        'Harjoitussuunnitelma palautettu',
        'success',
        2000
      );

      return true;
    } catch (error) {
      // console.error('Failed to load session from storage:', error);
      return false;
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(): void {
    this.cleanup.forEach(cleanupFn => cleanupFn());
    this.cleanup = [];

    // Remove global actions
    if (typeof window !== 'undefined' && 'FileActions' in window) {
      delete (window as any).FileActions;
    }
  }
}

// Global type declaration for window.FileActions
declare global {
  interface Window {
    FileActions?: FileActionsInterface;
  }
}

// Export singleton instance
export const fileActions = new FileActionsManager();