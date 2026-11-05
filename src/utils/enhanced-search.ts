/**
 * Enhanced Search Service with MiniSearch integration
 * Provides fuzzy search, intelligent ranking, and Finnish language support
 */

import MiniSearch from 'minisearch';
import type { DriveFile } from '@/types/google-apis';
import type { ContentSearchResult } from '@/types/content-types';
import { contentManager } from '@/services/content-manager';

export interface SearchResult extends DriveFile {
  score: number;
  match: {
    field: string;
    highlight: string;
  };
  category?: string;
  tags?: string;
  description?: string;
}

export interface HybridSearchResult {
  type: 'drive' | 'static';
  driveFile?: SearchResult;
  staticContent?: ContentSearchResult;
  score: number;
  source: string;
}

export interface SearchOptions {
  fuzzy: boolean;
  boost: Record<string, number>;
  fields: string[];
  storeFields: string[];
  searchOptions: {
    boost: Record<string, number>;
    fuzzy: number | boolean;
    prefix: boolean;
    combineWith: 'AND' | 'OR';
  };
}

export class EnhancedSearchService {
  private miniSearch: MiniSearch<DriveFile>;
  private isInitialized = false;
  private finnishTerms = new Set([
    'harjoitus',
    'harjoittelu',
    'treeni',
    'valmennus',
    'ohje',
    'opas',
    'taito',
    'tekniikka',
    'taktiikka',
    'strategia',
    'fysiikka',
    'lihavoima',
    'nopeus',
    'reaktio',
    'syöttö',
    'laukaus',
    'puolustus',
    'hyökkäys',
    'pelaaja',
    'joukkue',
    'ottelu',
    'kilpailu',
    'salibandy',
    'mailapelit',
  ]);

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['name', 'description', 'category', 'tags'],
      storeFields: [
        'id',
        'name',
        'mimeType',
        'size',
        'webViewLink',
        'parents',
        'modifiedTime',
      ],
      searchOptions: {
        boost: { name: 2, tags: 1.5, category: 1.2 },
        fuzzy: 0.2, // 20% tolerance for typos
        prefix: true,
        combineWith: 'OR',
      },
    });
  }

  /**
   * Initialize search index with files and static content
   */
  async indexFiles(files: DriveFile[]): Promise<void> {
    // Clear existing index
    this.miniSearch.removeAll();

    // Prepare files for indexing with enhanced metadata
    const indexableFiles = files.map(file => ({
      ...file,
      category: this.categorizeFile(file),
      tags: this.generateTags(file),
      description: this.generateDescription(file),
    }));

    // Add to search index
    this.miniSearch.addAll(indexableFiles);

    // Index static content for drive file search
    const staticContent = await contentManager.getAllContent();
    const staticForIndex = staticContent.map(content => ({
      id: `static_${content.id}`,
      name: `${content.title.fi} | ${content.title.en}`,
      mimeType: 'application/x-static-content',
      modifiedTime: content.updatedAt,
      webViewLink: `#static/${content.id}`,
      parents: ['static'],
      size: 0,
      category: content.category,
      tags: content.tags.join(' '),
      description: `${content.description.fi} | ${content.description.en}`,
    }));

    this.miniSearch.addAll(staticForIndex);
    this.isInitialized = true;

    console.debug(
      `🔍 Enhanced search initialized with ${files.length} files and ${staticContent.length} static content items`
    );
  }

  /**
   * Perform enhanced search with intelligent ranking
   */
  search(query: string, options?: Partial<SearchOptions>): SearchResult[] {
    if (!this.isInitialized || !query.trim()) {
      return [];
    }

    const searchQuery = this.preprocessQuery(query);
    const searchOptions = this.getSearchOptions(options);

    try {
      const results = this.miniSearch.search(
        searchQuery,
        searchOptions.searchOptions
      );

      // Map MiniSearch results to SearchResult format
      const searchResults: SearchResult[] = results.map(result => {
        // Find the original file data
        const originalFile = result as any;
        return {
          id: originalFile.id,
          name: originalFile.name,
          mimeType: originalFile.mimeType,
          modifiedTime: originalFile.modifiedTime,
          webViewLink: originalFile.webViewLink,
          parents: originalFile.parents,
          size: originalFile.size,
          score: result.score || 0,
          match: {
            field: this.getMatchField(result),
            highlight: this.highlightMatch(result, query),
          },
          category: originalFile.category,
          tags: originalFile.tags,
          description: originalFile.description,
        };
      });

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(query: string, limit = 5): string[] {
    if (!query.trim()) return [];

    const suggestions = this.miniSearch.autoSuggest(query, {
      fuzzy: 0.2,
      prefix: true,
    });

    return suggestions.slice(0, limit).map(suggestion => suggestion.suggestion);
  }

  /**
   * Search within specific category
   */
  searchInCategory(query: string, category: string): SearchResult[] {
    const allResults = this.search(query);
    return allResults.filter(result =>
      result.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Hybrid search across both Google Drive and static content
   */
  async hybridSearch(
    query: string,
    language: 'fi' | 'en' = 'fi'
  ): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = [];

    // Search Google Drive files
    const driveResults = this.search(query);
    for (const result of driveResults) {
      results.push({
        type: 'drive',
        driveFile: result,
        score: result.score,
        source: 'Google Drive',
      });
    }

    // Search static content
    const staticResults = await contentManager.searchContent({
      query,
      language,
    });

    for (const result of staticResults) {
      results.push({
        type: 'static',
        staticContent: result,
        score: result.score + 10, // Boost static content slightly
        source: 'Static Content',
      });
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get content suggestions based on category
   */
  async getContentSuggestions(
    category: string,
    language: 'fi' | 'en' = 'fi'
  ): Promise<HybridSearchResult[]> {
    const results: HybridSearchResult[] = [];

    // Get static content by category
    const staticResults = await contentManager.searchContent({
      category: [category as any],
      language,
    });

    for (const result of staticResults) {
      results.push({
        type: 'static',
        staticContent: result,
        score: result.score,
        source: 'Static Content',
      });
    }

    // Search drive files for category keywords
    const driveResults = this.search(category);
    for (const result of driveResults.slice(0, 5)) {
      // Limit drive results
      results.push({
        type: 'drive',
        driveFile: result,
        score: result.score * 0.8, // Lower priority than static
        source: 'Google Drive',
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Search static content only
   */
  async searchStaticContent(
    query: string,
    language: 'fi' | 'en' = 'fi'
  ): Promise<ContentSearchResult[]> {
    try {
      const results = await contentManager.searchContent({
        query,
        language,
      });
      return results;
    } catch (error) {
      console.warn('Static content search failed:', error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  getPopularTerms(): string[] {
    return [
      'harjoitus drill',
      'taktiikka tactics',
      'fysiikka physical',
      'syöttö passing',
      'laukaus shooting',
      'puolustus defense',
      'hyökkäys offense',
      'nopeus speed',
      'reaktio reaction',
    ];
  }

  /**
   * Preprocess search query for better results
   */
  private preprocessQuery(query: string): string {
    let processedQuery = query.trim().toLowerCase();

    // Handle Finnish-English term mapping
    const termMappings: Record<string, string> = {
      harjoitus: 'drill training exercise',
      taktiikka: 'tactics strategy',
      fysiikka: 'physical fitness',
      syöttö: 'passing pass',
      laukaus: 'shooting shot',
      puolustus: 'defense defensive',
      hyökkäys: 'offense attack offensive',
      nopeus: 'speed agility',
      reaktio: 'reaction quick',
    };

    // Expand Finnish terms to include English equivalents
    Object.entries(termMappings).forEach(([finnish, english]) => {
      if (processedQuery.includes(finnish)) {
        processedQuery += ` ${english}`;
      }
    });

    return processedQuery;
  }

  /**
   * Categorize file based on name and content
   */
  private categorizeFile(file: DriveFile): string {
    const name = file.name.toLowerCase();
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    if (isFolder) return 'folder';

    // Training categories
    if (name.match(/drill|harjoitus|exercise|treeni/)) {
      return 'training-drill';
    }
    if (name.match(/physical|fysiikka|kunto|voima/)) {
      return 'physical-training';
    }
    if (name.match(/tactic|taktiikka|strategy|strategia/)) {
      return 'tactics';
    }
    if (name.match(/game|ottelu|analysis|analyysi/)) {
      return 'game-analysis';
    }
    if (name.match(/plan|suunnitelma|session|sessio/)) {
      return 'session-planning';
    }

    // File type categories
    if (name.match(/\.(pdf|doc|docx)$/)) {
      return 'document';
    }
    if (name.match(/\.(mp4|avi|mov|wmv)$/)) {
      return 'video';
    }
    if (name.match(/\.(jpg|jpeg|png|gif)$/)) {
      return 'image';
    }

    return 'general';
  }

  /**
   * Generate searchable tags for a file
   */
  private generateTags(file: DriveFile): string {
    const tags: string[] = [];
    const name = file.name.toLowerCase();

    // Skill-based tags
    if (name.match(/passing|syöttö|pass/)) tags.push('passing', 'syöttö');
    if (name.match(/shooting|laukaus|shot/)) tags.push('shooting', 'laukaus');
    if (name.match(/defense|puolustus|defensive/)) {
      tags.push('defense', 'puolustus');
    }
    if (name.match(/offense|hyökkäys|attack/)) tags.push('offense', 'hyökkäys');
    if (name.match(/speed|nopeus|agility/)) tags.push('speed', 'nopeus');
    if (name.match(/reaction|reaktio|quick/)) tags.push('reaction', 'reaktio');

    // Level tags
    if (name.match(/beginner|alkeisto|basic/)) tags.push('beginner', 'basic');
    if (name.match(/advanced|edistynyt|pro/)) tags.push('advanced', 'expert');
    if (name.match(/youth|junior|nuori/)) tags.push('youth', 'junior');
    if (name.match(/senior|aikuis/)) tags.push('senior', 'adult');

    // Duration tags
    if (name.match(/15|fifteen/)) tags.push('15min', 'quick');
    if (name.match(/30|thirty/)) tags.push('30min', 'medium');
    if (name.match(/60|hour|tunti/)) tags.push('60min', 'long');

    return tags.join(' ');
  }

  /**
   * Generate description for better searchability
   */
  private generateDescription(file: DriveFile): string {
    const category = this.categorizeFile(file);
    const tags = this.generateTags(file);

    return `${category} ${tags} ${file.name}`.toLowerCase();
  }

  /**
   * Get search options with defaults
   */
  private getSearchOptions(options?: Partial<SearchOptions>): SearchOptions {
    return {
      fuzzy: true,
      boost: { name: 2, tags: 1.5, category: 1.2 },
      fields: ['name', 'description', 'category', 'tags'],
      storeFields: [
        'id',
        'name',
        'mimeType',
        'size',
        'webViewLink',
        'parents',
        'modifiedTime',
      ],
      searchOptions: {
        boost: { name: 2, tags: 1.5, category: 1.2 },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'OR',
      },
      ...options,
    };
  }

  /**
   * Determine which field matched in the search result
   */
  private getMatchField(result: any): string {
    // MiniSearch doesn't provide match field info directly
    // This is a simplified implementation
    if (result.match) {
      return Object.keys(result.match)[0] || 'name';
    }
    return 'name';
  }

  /**
   * Highlight matching text in search results
   */
  private highlightMatch(result: any, query: string): string {
    const name = result.name || '';
    const queryWords = query.toLowerCase().split(/\s+/);

    let highlighted = name;
    queryWords.forEach(word => {
      if (word.length > 2) {
        const regex = new RegExp(`(${word})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      }
    });

    return highlighted;
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      totalDocuments: this.miniSearch.documentCount,
      isInitialized: this.isInitialized,
      finnishTermsSupported: this.finnishTerms.size,
    };
  }
}

// Export singleton instance
export const enhancedSearch = new EnhancedSearchService();
