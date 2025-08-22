/**
 * Folder Browser Component
 */

import type { DriveFolder } from '@/types/google-apis';
import { createElement } from '@/utils/dom';

export class FolderBrowserService {
  private folderCache: Map<string, DriveFolder>;
  private allFolders: DriveFolder[];
  private currentFolderFilter: string | null = null;

  constructor() {
    this.folderCache = new Map();
    this.allFolders = [];
  }

  /**
   * Initialize folder browser with data
   */
  initialize(
    folders: DriveFolder[],
    folderCache: Map<string, DriveFolder>
  ): void {
    this.allFolders = folders;
    this.folderCache = folderCache;
  }

  /**
   * Build folder hierarchy tree
   */
  buildFolderTree(): FolderTreeNode[] {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootFolders: FolderTreeNode[] = [];

    // Create all folder nodes
    this.allFolders.forEach(folder => {
      const cachedFolder = this.folderCache.get(folder.id);
      const node: FolderTreeNode = {
        id: folder.id,
        name: folder.name,
        fileCount: cachedFolder?.fileCount || 0,
        webViewLink: folder.webViewLink,
        children: [],
        parent: null,
        level: 0,
      };
      folderMap.set(folder.id, node);
    });

    // Build hierarchy by connecting parents and children
    this.allFolders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (folder.parents && folder.parents.length > 0) {
        // Find parent folder (use first parent if multiple)
        const parentId = folder.parents[0];
        if (!parentId) return;
        const parentNode = folderMap.get(parentId);

        if (parentNode) {
          node.parent = parentNode;
          node.level = parentNode.level + 1;
          parentNode.children.push(node);
        } else {
          // Parent not found in our folders (might be root or shared)
          rootFolders.push(node);
        }
      } else {
        // No parents - this is a root folder
        rootFolders.push(node);
      }
    });

    // Sort folders by name at each level
    const sortFolders = (folders: FolderTreeNode[]): void => {
      folders.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
      folders.forEach(folder => sortFolders(folder.children));
    };

    sortFolders(rootFolders);
    return rootFolders;
  }

  /**
   * Create folder navigation item element
   */
  createFolderItem(folder: FolderTreeNode, isExpanded = false): HTMLElement {
    const folderDiv = createElement(
      'div',
      `folder-item ${this.currentFolderFilter === folder.id ? 'active' : ''}`
    );
    folderDiv.setAttribute('data-folder-id', folder.id);
    folderDiv.style.paddingLeft = `${folder.level * 16 + 8}px`;

    const hasChildren = folder.children.length > 0;
    const expandIcon = hasChildren ? (isExpanded ? '📂' : '📁') : '📄';

    folderDiv.innerHTML = `
      <div class="folder-content">
        ${hasChildren ? `<button class="expand-btn ${isExpanded ? 'expanded' : ''}" data-folder-id="${folder.id}">${isExpanded ? '▼' : '▶'}</button>` : '<span class="no-expand"></span>'}
        <div class="folder-icon">${expandIcon}</div>
        <div class="folder-info">
          <div class="folder-name" title="${folder.name}">${folder.name}</div>
          <div class="folder-count">${folder.fileCount} tiedosto${folder.fileCount !== 1 ? 'a' : ''}</div>
        </div>
        <a href="${folder.webViewLink}" target="_blank" class="folder-external-link" title="Avaa Google Drivessa" onclick="event.stopPropagation()">↗</a>
      </div>
    `;

    return folderDiv;
  }

  /**
   * Create folder tree HTML with expandable structure
   */
  createFolderTree(
    folders: FolderTreeNode[],
    expandedFolders: Set<string> = new Set()
  ): HTMLElement {
    const container = createElement('div', 'folder-tree');

    const renderFolder = (folder: FolderTreeNode): HTMLElement => {
      const isExpanded = expandedFolders.has(folder.id);
      const folderElement = this.createFolderItem(folder, isExpanded);

      if (folder.children.length > 0) {
        const childrenContainer = createElement(
          'div',
          `folder-children ${isExpanded ? 'expanded' : 'collapsed'}`
        );
        childrenContainer.setAttribute('data-parent-id', folder.id);

        folder.children.forEach(child => {
          const childElement = renderFolder(child);
          childrenContainer.appendChild(childElement);
        });

        folderElement.appendChild(childrenContainer);
      }

      return folderElement;
    };

    folders.forEach(folder => {
      container.appendChild(renderFolder(folder));
    });

    return container;
  }

  /**
   * Set current folder filter
   */
  setCurrentFolder(folderId: string | null): void {
    this.currentFolderFilter = folderId;
  }

  /**
   * Get current folder filter
   */
  getCurrentFolder(): string | null {
    return this.currentFolderFilter;
  }
}

export interface FolderTreeNode {
  id: string;
  name: string;
  fileCount: number;
  webViewLink: string;
  children: FolderTreeNode[];
  parent: FolderTreeNode | null;
  level: number;
}
