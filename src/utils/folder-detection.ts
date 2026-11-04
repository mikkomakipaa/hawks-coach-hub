/**
 * Folder Detection Utility
 * Helps identify and configure actual Google Drive folder IDs for search filtering
 */

import type { DriveFolder } from '@/types/google-apis';
import { autoDetectFolderCategory } from '@/config/folder-mappings';

export interface FolderDetectionResult {
  folderId: string;
  folderName: string;
  detectedCategory: string | null;
  confidence: number;
  suggestedMapping: {
    tabId: string;
    priority: number;
  } | null;
}

export interface FolderHierarchy {
  folder: DriveFolder;
  children: FolderHierarchy[];
  level: number;
  path: string[];
}

/**
 * Analyze folder structure and suggest mappings
 */
export function analyzeFolderStructure(folders: DriveFolder[]): {
  detectionResults: FolderDetectionResult[];
  hierarchy: FolderHierarchy[];
  suggestions: string[];
} {
  const detectionResults: FolderDetectionResult[] = [];
  const suggestions: string[] = [];

  // Analyze each folder
  folders.forEach(folder => {
    const result = analyzeFolder(folder);
    if (result) {
      detectionResults.push(result);
    }
  });

  // Build hierarchy
  const hierarchy = buildFolderHierarchy(folders);

  // Generate configuration suggestions
  const categoryGroups = groupByCategory(detectionResults);
  Object.entries(categoryGroups).forEach(([category, folders]) => {
    if (folders.length > 0) {
      suggestions.push(`// ${category.toUpperCase()} FOLDERS:`);
      folders.forEach(folder => {
        suggestions.push(`// "${folder.folderName}" (${folder.folderId}) - Confidence: ${folder.confidence}%`);
      });
      suggestions.push('');
    }
  });

  return { detectionResults, hierarchy, suggestions };
}

/**
 * Analyze a single folder for category detection
 */
function analyzeFolder(folder: DriveFolder): FolderDetectionResult | null {
  const detectedCategory = autoDetectFolderCategory(folder.name);

  if (!detectedCategory) {
    return null;
  }

  // Calculate confidence based on name matching
  const confidence = calculateConfidence(folder.name, detectedCategory);

  // Determine suggested mapping
  const suggestedMapping = getSuggestedMapping(detectedCategory, confidence);

  return {
    folderId: folder.id,
    folderName: folder.name,
    detectedCategory,
    confidence,
    suggestedMapping
  };
}

/**
 * Calculate confidence score for folder category detection
 */
function calculateConfidence(folderName: string, category: string): number {
  const name = folderName.toLowerCase();
  let confidence = 50; // Base confidence

  // Category-specific scoring
  switch (category) {
    case 'sport-training':
      if (name.includes('laji')) confidence += 30;
      if (name.includes('harjoittelu') || name.includes('harjoitus')) confidence += 20;
      if (name.includes('drill') || name.includes('training')) confidence += 20;
      if (name.includes('tekniikka') || name.includes('technique')) confidence += 15;
      break;

    case 'fitness':
      if (name.includes('fysiikka')) confidence += 30;
      if (name.includes('fitness') || name.includes('kunto')) confidence += 25;
      if (name.includes('voima') || name.includes('strength')) confidence += 20;
      if (name.includes('kestävyys') || name.includes('endurance')) confidence += 20;
      break;

    case 'game-situations':
      if (name.includes('taktiikka')) confidence += 30;
      if (name.includes('tactics') || name.includes('strategy')) confidence += 25;
      if (name.includes('pelitilanne')) confidence += 25;
      if (name.includes('rooli') || name.includes('role')) confidence += 20;
      break;
  }

  return Math.min(confidence, 95); // Cap at 95%
}

/**
 * Get suggested mapping for a detected category
 */
function getSuggestedMapping(category: string, confidence: number): { tabId: string; priority: number; } | null {
  if (confidence < 60) return null;

  const priorityMap: Record<string, number> = {
    'sport-training': 5,
    'fitness': 4,
    'game-situations': 3
  };

  return {
    tabId: category,
    priority: priorityMap[category] || 2
  };
}

/**
 * Build folder hierarchy for better understanding
 */
function buildFolderHierarchy(folders: DriveFolder[]): FolderHierarchy[] {
  const HAWKS_FOLDER_ID = '1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb';
  const folderMap = new Map<string, DriveFolder>();

  folders.forEach(folder => {
    folderMap.set(folder.id, folder);
  });

  function buildNode(folderId: string, level: number = 0, path: string[] = []): FolderHierarchy | null {
    const folder = folderMap.get(folderId);
    if (!folder) return null;

    const children: FolderHierarchy[] = [];
    const currentPath = [...path, folder.name];

    // Find direct children
    folders.forEach(childFolder => {
      if (childFolder.parents && childFolder.parents.includes(folderId)) {
        const childNode = buildNode(childFolder.id, level + 1, currentPath);
        if (childNode) {
          children.push(childNode);
        }
      }
    });

    return {
      folder,
      children,
      level,
      path: currentPath
    };
  }

  // Find root folders (children of Hawks folder)
  const rootNodes: FolderHierarchy[] = [];
  folders.forEach(folder => {
    if (folder.parents && folder.parents.includes(HAWKS_FOLDER_ID)) {
      const node = buildNode(folder.id, 0, []);
      if (node) {
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
}

/**
 * Group detection results by category
 */
function groupByCategory(results: FolderDetectionResult[]): Record<string, FolderDetectionResult[]> {
  const groups: Record<string, FolderDetectionResult[]> = {};

  results.forEach(result => {
    if (result.detectedCategory) {
      if (!groups[result.detectedCategory]) {
        groups[result.detectedCategory] = [];
      }
      groups[result.detectedCategory]?.push(result);
    }
  });

  // Sort each group by confidence
  Object.keys(groups).forEach(category => {
    groups[category]?.sort((a, b) => b.confidence - a.confidence);
  });

  return groups;
}

/**
 * Generate configuration code for folder mappings
 */
export function generateConfigurationCode(detectionResults: FolderDetectionResult[]): string {
  const code = ['// Auto-generated folder mapping configuration', ''];

  const categoryGroups = groupByCategory(detectionResults);

  Object.entries(categoryGroups).forEach(([category, folders]) => {
    if (folders.length > 0) {
      code.push(`// ${category.toUpperCase()} FOLDERS:`);
      code.push(`${category}: {`);
      code.push(`  tabId: '${category}',`);
      code.push(`  tabName: '${getTabDisplayName(category)}',`);
      code.push(`  searchScope: 'hybrid',`);
      code.push(`  folders: [`);

      folders.forEach(folder => {
        if (folder.confidence >= 70) {
          code.push(`    {`);
          code.push(`      folderId: '${folder.folderId}', // ${folder.folderName} (${folder.confidence}% confidence)`);
          code.push(`      folderName: '${folder.folderName}',`);
          code.push(`      includeSubfolders: true,`);
          code.push(`      priority: ${folder.suggestedMapping?.priority || 3}`);
          code.push(`    },`);
        }
      });

      code.push(`  ],`);
      code.push(`  keywords: ${JSON.stringify(getCategoryKeywords(category))}`);
      code.push(`},`);
      code.push('');
    }
  });

  return code.join('\n');
}

/**
 * Get display name for category
 */
function getTabDisplayName(category: string): string {
  const names: Record<string, string> = {
    'sport-training': 'Lajiharjoittelu',
    'fitness': 'Fysiikkaharjoittelu',
    'game-situations': 'Pelitilanneroolit',
    'handbook': 'Valmentajan käsikirja'
  };
  return names[category] || category;
}

/**
 * Get keywords for category
 */
function getCategoryKeywords(category: string): string[] {
  const keywords: Record<string, string[]> = {
    'sport-training': ['lajiharjoittelu', 'harjoitus', 'drill', 'training', 'tekniikka', 'technique'],
    'fitness': ['fysiikka', 'fitness', 'kunto', 'conditioning', 'voima', 'strength'],
    'game-situations': ['taktiikka', 'tactics', 'strategy', 'pelitilanne', 'game', 'rooli', 'role']
  };
  return keywords[category] || [];
}

/**
 * Print folder analysis to console for debugging
 */
export function printFolderAnalysis(folders: DriveFolder[]): void {
  const analysis = analyzeFolderStructure(folders);

  console.log('📁 FOLDER STRUCTURE ANALYSIS');
  console.log('============================');

  // Print hierarchy
  console.log('\n🌳 FOLDER HIERARCHY:');
  analysis.hierarchy.forEach(node => {
    printHierarchyNode(node);
  });

  // Print detection results
  console.log('\n🔍 CATEGORY DETECTION RESULTS:');
  const categoryGroups = groupByCategory(analysis.detectionResults);
  Object.entries(categoryGroups).forEach(([category, folders]) => {
    console.log(`\n${category.toUpperCase()}:`);
    folders.forEach(folder => {
      console.log(`  ✓ ${folder.folderName} (${folder.confidence}%) - ${folder.folderId}`);
    });
  });

  // Print configuration suggestions
  console.log('\n💡 CONFIGURATION SUGGESTIONS:');
  analysis.suggestions.forEach(suggestion => {
    console.log(suggestion);
  });

  // Print generated code
  console.log('\n🔧 GENERATED CONFIGURATION CODE:');
  console.log(generateConfigurationCode(analysis.detectionResults));
}

/**
 * Print hierarchy node recursively
 */
function printHierarchyNode(node: FolderHierarchy, indent: string = ''): void {
  const category = autoDetectFolderCategory(node.folder.name);
  const categoryText = category ? ` [${category}]` : '';

  console.log(`${indent}📁 ${node.folder.name}${categoryText} (${node.folder.id})`);

  node.children.forEach(child => {
    printHierarchyNode(child, indent + '  ');
  });
}