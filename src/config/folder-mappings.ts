/**
 * Folder Mappings Configuration
 * Maps navigation tabs to specific Google Drive folders for targeted search
 */

export interface FolderMapping {
  /** Folder ID in Google Drive */
  folderId: string;
  /** Folder name for identification */
  folderName: string;
  /** Include subfolders in search */
  includeSubfolders: boolean;
  /** Priority for search ranking (higher = more important) */
  priority: number;
}

export interface TabFolderConfig {
  /** Tab identifier */
  tabId: string;
  /** Human readable tab name */
  tabName: string;
  /** List of folders to search within this tab */
  folders: FolderMapping[];
  /** Additional keywords to boost for this tab */
  keywords: string[];
  /** Search scope: 'strict' = only mapped folders, 'hybrid' = mapped folders + static content */
  searchScope: 'strict' | 'hybrid';
}

/**
 * Folder mappings for each navigation tab
 * These will need to be configured based on your actual Google Drive structure
 */
export const FOLDER_MAPPINGS: Record<string, TabFolderConfig> = {
  handbook: {
    tabId: 'handbook',
    tabName: 'Valmentajan käsikirja',
    searchScope: 'hybrid', // Search all folders + static content
    folders: [
      // Search across all main folders for comprehensive handbook view
      {
        folderId: 'root', // Search all folders for handbook
        folderName: 'All Content',
        includeSubfolders: true,
        priority: 1
      }
    ],
    keywords: ['valmentaja', 'käsikirja', 'guide', 'handbook', 'coaching', 'planning', 'opas', 'ohje']
  },

  'sport-training': {
    tabId: 'sport-training',
    tabName: 'Lajiharjoittelu',
    searchScope: 'hybrid',
    folders: [
      // Target the numbered folder structure from your screenshot
      {
        folderId: 'FOLDER_01_LAJIHARJOITTELU', // Will be auto-detected
        folderName: '01 Lajiharjoittelu',
        includeSubfolders: true,
        priority: 5
      }
    ],
    keywords: ['lajiharjoittelu', 'harjoitus', 'drill', 'training', 'tekniikka', 'technique', 'taito', 'skill', 'laji', 'sport']
  },

  fitness: {
    tabId: 'fitness',
    tabName: 'Fysiikkaharjoittelu',
    searchScope: 'hybrid',
    folders: [
      {
        folderId: 'FOLDER_02_FYSIIKKAHARJOITTELU', // Will be auto-detected
        folderName: '02 Fysiikkaharjoittelu',
        includeSubfolders: true,
        priority: 5
      }
    ],
    keywords: ['fysiikka', 'fysiikkaharjoittelu', 'fitness', 'kunto', 'conditioning', 'voima', 'strength', 'kestävyys', 'endurance', 'lihas', 'muscle']
  },

  'game-situations': {
    tabId: 'game-situations',
    tabName: 'Pelitilanneroolit',
    searchScope: 'hybrid',
    folders: [
      // This will map to a subset of folder 03 or be created as needed
      {
        folderId: 'FOLDER_03_MUUT_MATERIAALIT', // Will be auto-detected
        folderName: '03 Muut materiaalit valmentajalle',
        includeSubfolders: true,
        priority: 3
      }
    ],
    keywords: ['taktiikka', 'tactics', 'strategy', 'pelitilanne', 'game', 'rooli', 'role', 'positio', 'position', 'muut', 'materiaalit']
  }
};

/**
 * Auto-detection patterns for folder mapping
 * These patterns help automatically identify folder purposes based on names
 */
export const FOLDER_DETECTION_PATTERNS: Record<string, RegExp[]> = {
  'sport-training': [
    /^01.*lajiharjoittelu/i,
    /lajiharjoittelu/i,
    /harjoitteet?/i,
    /drills?/i,
    /tekniikka/i,
    /technique/i,
    /taito/i,
    /skills?/i,
    /laji/i,
    /sport.*training/i
  ],

  fitness: [
    /^02.*fysiikka/i,
    /fysiikkaharjoittelu/i,
    /fysiikka/i,
    /fitness/i,
    /kunto/i,
    /conditioning/i,
    /voima/i,
    /strength/i,
    /kestävyys/i,
    /endurance/i
  ],

  'game-situations': [
    /^03.*muut.*materiaalit/i,
    /taktiikka/i,
    /tactics/i,
    /strategy/i,
    /pelitilanteet?/i,
    /game.*situations?/i,
    /roolit/i,
    /roles?/i,
    /muut.*materiaalit/i,
    /valmentajalle/i
  ]
};

/**
 * Get folder mappings for a specific tab
 */
export function getFolderMappingsForTab(tabId: string): TabFolderConfig | null {
  return FOLDER_MAPPINGS[tabId] || null;
}

/**
 * Auto-detect folder categories based on folder names
 */
export function autoDetectFolderCategory(folderName: string): string | null {
  for (const [category, patterns] of Object.entries(FOLDER_DETECTION_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(folderName))) {
      return category;
    }
  }
  return null;
}

/**
 * Update folder mappings with actual folder IDs from the loaded data
 */
export function updateFolderMappingsWithRealIds(folders: Array<{ id: string; name: string }>): void {
  // Auto-detect folders and update mappings
  folders.forEach(folder => {
    const detectedCategory = autoDetectFolderCategory(folder.name);
    if (detectedCategory && FOLDER_MAPPINGS[detectedCategory]) {
      // Find if we already have a mapping for this type
      const existingMapping = FOLDER_MAPPINGS[detectedCategory].folders.find(
        mapping => mapping.folderName.toLowerCase().includes(folder.name.toLowerCase().substring(0, 5))
      );

      if (existingMapping && existingMapping.folderId.startsWith('FOLDER_ID_')) {
        // Update with real ID
        existingMapping.folderId = folder.id;
        existingMapping.folderName = folder.name;
        console.log(`📁 Auto-mapped folder "${folder.name}" (${folder.id}) to category "${detectedCategory}"`);
      }
    }
  });
}

/**
 * Get all relevant folder IDs for a tab (including subfolders)
 */
export function getRelevantFolderIds(tabId: string, allFolders: Array<{ id: string; name: string; parents?: string[] }>): string[] {
  const config = getFolderMappingsForTab(tabId);
  if (!config) return [];

  const relevantIds: string[] = [];

  config.folders.forEach(mapping => {
    if (mapping.folderId === 'root') {
      // Include all folders
      relevantIds.push(...allFolders.map(f => f.id));
    } else {
      // Include the folder itself
      relevantIds.push(mapping.folderId);

      // Include subfolders if requested
      if (mapping.includeSubfolders) {
        const subfolderIds = getSubfolderIds(mapping.folderId, allFolders);
        relevantIds.push(...subfolderIds);
      }
    }
  });

  // Remove duplicates
  return [...new Set(relevantIds)];
}

/**
 * Get all subfolder IDs recursively
 */
function getSubfolderIds(parentId: string, allFolders: Array<{ id: string; parents?: string[] }>): string[] {
  const subfolderIds: string[] = [];

  const directSubfolders = allFolders.filter(folder =>
    folder.parents && folder.parents.includes(parentId)
  );

  directSubfolders.forEach(subfolder => {
    subfolderIds.push(subfolder.id);
    // Recursively get nested subfolders
    const nestedIds = getSubfolderIds(subfolder.id, allFolders);
    subfolderIds.push(...nestedIds);
  });

  return subfolderIds;
}

/**
 * Get search keywords for a specific tab
 */
export function getSearchKeywordsForTab(tabId: string): string[] {
  const config = getFolderMappingsForTab(tabId);
  return config?.keywords || [];
}