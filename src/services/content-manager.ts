/**
 * Static Content Manager
 * Manages local content storage and retrieval within TypeScript/Vite setup
 */

import type {
  StaticContent,
  ContentCollection,
  ContentSearchOptions,
  ContentSearchResult,
  ContentManager as IContentManager,
  ContentType,
  ContentCategory
} from '@/types/content-types';

export class ContentManager implements IContentManager {
  private content: Map<string, StaticContent> = new Map();
  private collections: Map<string, ContentCollection> = new Map();
  private initialized = false;

  constructor() {
    this.initializeContent();
  }

  /**
   * Initialize with sample content
   */
  private async initializeContent(): Promise<void> {
    if (this.initialized) return;

    // Load sample content for demonstration
    await this.loadSampleContent();
    this.initialized = true;
  }

  /**
   * Create new content
   */
  async createContent(content: Omit<StaticContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<StaticContent> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const newContent: StaticContent = {
      ...content,
      id,
      createdAt: now,
      updatedAt: now,
      metadata: {
        views: 0,
        likes: 0,
        isFavorite: false,
        relatedContent: [],
        seasons: content.metadata?.seasons || ['all']
      }
    };

    this.content.set(id, newContent);
    await this.saveToStorage();
    return newContent;
  }

  /**
   * Get content by ID
   */
  async getContent(id: string, _language: 'fi' | 'en' = 'fi'): Promise<StaticContent | null> {
    await this.initializeContent();
    const content = this.content.get(id);
    return content || null;
  }

  /**
   * Update existing content
   */
  async updateContent(id: string, updates: Partial<StaticContent>): Promise<StaticContent> {
    await this.initializeContent();
    const existing = this.content.get(id);
    if (!existing) {
      throw new Error(`Content with id ${id} not found`);
    }

    const updated: StaticContent = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.content.set(id, updated);
    await this.saveToStorage();
    return updated;
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<boolean> {
    await this.initializeContent();
    const deleted = this.content.delete(id);
    if (deleted) {
      await this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Search content with advanced filtering
   */
  async searchContent(options: ContentSearchOptions): Promise<ContentSearchResult[]> {
    await this.initializeContent();

    let results = Array.from(this.content.values());
    const language = options.language || 'fi';

    // Apply filters
    if (options.type && options.type.length > 0) {
      results = results.filter(content => options.type!.includes(content.type));
    }

    if (options.category && options.category.length > 0) {
      results = results.filter(content => options.category!.includes(content.category));
    }

    if (options.difficulty && options.difficulty.length > 0) {
      results = results.filter(content => options.difficulty!.includes(content.difficulty));
    }

    if (options.ageGroup && options.ageGroup.length > 0) {
      results = results.filter(content =>
        content.ageGroup.some(age => options.ageGroup!.includes(age) || age === 'all')
      );
    }

    if (options.duration) {
      results = results.filter(content =>
        content.duration >= options.duration!.min &&
        content.duration <= options.duration!.max
      );
    }

    if (options.equipment && options.equipment.length > 0) {
      results = results.filter(content =>
        content.equipment.some(eq => options.equipment!.includes(eq)) ||
        content.equipment.includes('none')
      );
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(content =>
        options.tags!.some(tag => content.tags.includes(tag))
      );
    }

    // Text search
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(content => {
        const title = content.title[language].toLowerCase();
        const description = content.description[language].toLowerCase();
        const contentText = content.content[language].toLowerCase();
        const tags = content.tags.join(' ').toLowerCase();

        return title.includes(query) ||
               description.includes(query) ||
               contentText.includes(query) ||
               tags.includes(query);
      });
    }

    // Convert to search results with scoring
    return results.map(content => ({
      ...content,
      score: this.calculateRelevanceScore(content, options),
      matchedFields: this.getMatchedFields(content, options),
      highlights: this.generateHighlights(content, options)
    })).sort((a, b) => b.score - a.score);
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category: ContentCategory, language: 'fi' | 'en' = 'fi'): Promise<StaticContent[]> {
    return this.searchContent({ category: [category], language });
  }

  /**
   * Get content by type
   */
  async getContentByType(type: ContentType, language: 'fi' | 'en' = 'fi'): Promise<StaticContent[]> {
    return this.searchContent({ type: [type], language });
  }

  /**
   * Create content collection
   */
  async createCollection(collection: Omit<ContentCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentCollection> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const newCollection: ContentCollection = {
      ...collection,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.collections.set(id, newCollection);
    await this.saveToStorage();
    return newCollection;
  }

  /**
   * Get collection by ID
   */
  async getCollection(id: string): Promise<ContentCollection | null> {
    await this.initializeContent();
    return this.collections.get(id) || null;
  }

  /**
   * Add content to collection
   */
  async addToCollection(collectionId: string, contentId: string): Promise<boolean> {
    const collection = await this.getCollection(collectionId);
    if (!collection || !this.content.has(contentId)) {
      return false;
    }

    if (!collection.contentIds.includes(contentId)) {
      collection.contentIds.push(contentId);
      collection.updatedAt = new Date().toISOString();
      this.collections.set(collectionId, collection);
      await this.saveToStorage();
    }

    return true;
  }

  /**
   * Remove content from collection
   */
  async removeFromCollection(collectionId: string, contentId: string): Promise<boolean> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      return false;
    }

    const index = collection.contentIds.indexOf(contentId);
    if (index > -1) {
      collection.contentIds.splice(index, 1);
      collection.updatedAt = new Date().toISOString();
      this.collections.set(collectionId, collection);
      await this.saveToStorage();
    }

    return true;
  }

  /**
   * Increment view count
   */
  async incrementViews(contentId: string): Promise<void> {
    const content = await this.getContent(contentId);
    if (content) {
      content.metadata.views++;
      content.metadata.lastViewed = new Date().toISOString();
      this.content.set(contentId, content);
      await this.saveToStorage();
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(contentId: string): Promise<boolean> {
    const content = await this.getContent(contentId);
    if (content) {
      content.metadata.isFavorite = !content.metadata.isFavorite;
      this.content.set(contentId, content);
      await this.saveToStorage();
      return content.metadata.isFavorite;
    }
    return false;
  }

  /**
   * Get popular content
   */
  async getPopularContent(limit: number = 10): Promise<StaticContent[]> {
    await this.initializeContent();
    return Array.from(this.content.values())
      .sort((a, b) => b.metadata.views - a.metadata.views)
      .slice(0, limit);
  }

  /**
   * Get recent content
   */
  async getRecentContent(limit: number = 10): Promise<StaticContent[]> {
    await this.initializeContent();
    return Array.from(this.content.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get all content for indexing
   */
  async getAllContent(): Promise<StaticContent[]> {
    await this.initializeContent();
    return Array.from(this.content.values());
  }

  // Private helper methods
  private generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRelevanceScore(content: StaticContent, _options: ContentSearchOptions): number {
    let score = 100; // Base score

    // Boost popular content
    score += content.metadata.views * 0.1;
    score += content.metadata.likes * 0.5;

    // Boost favorites
    if (content.metadata.isFavorite) {
      score += 20;
    }

    // Boost recent content
    const daysSinceCreated = (Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 30) {
      score += (30 - daysSinceCreated) * 0.5;
    }

    return Math.round(score);
  }

  private getMatchedFields(content: StaticContent, options: ContentSearchOptions): string[] {
    const matched: string[] = [];
    const language = options.language || 'fi';
    const query = options.query?.toLowerCase();

    if (query) {
      if (content.title[language].toLowerCase().includes(query)) matched.push('title');
      if (content.description[language].toLowerCase().includes(query)) matched.push('description');
      if (content.content[language].toLowerCase().includes(query)) matched.push('content');
      if (content.tags.some(tag => tag.toLowerCase().includes(query))) matched.push('tags');
    }

    return matched;
  }

  private generateHighlights(content: StaticContent, options: ContentSearchOptions): { [key: string]: string } {
    const highlights: { [key: string]: string } = {};
    const language = options.language || 'fi';
    const query = options.query?.toLowerCase();

    if (query) {
      const highlightText = (text: string): string => {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };

      if (content.title[language].toLowerCase().includes(query)) {
        highlights.title = highlightText(content.title[language]);
      }

      if (content.description[language].toLowerCase().includes(query)) {
        highlights.description = highlightText(content.description[language]);
      }
    }

    return highlights;
  }

  private async saveToStorage(): Promise<void> {
    // In a real implementation, this would save to localStorage or IndexedDB
    // For now, we keep everything in memory
    console.log('💾 Content saved to memory storage');
  }

  private async loadSampleContent(): Promise<void> {
    // Load sample Finnish floorball content
    const sampleContent: Array<Omit<StaticContent, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        type: 'drill',
        category: 'passing',
        title: {
          fi: 'Perusyöttöharjoitus',
          en: 'Basic Passing Drill'
        },
        description: {
          fi: 'Kehittää tarkkuutta ja mailankäsittelyä lyhyissä syötöissä',
          en: 'Develops accuracy and stick handling in short passes'
        },
        content: {
          fi: `# Perusyöttöharjoitus

## Tavoite
Kehittää pelaajien syöttötarkkuutta ja mailankäsittelyä.

## Toteutus
1. Pelaajat asettuvat pareittain 5 metrin päähän toisistaan
2. Syöttävät palloa takaisin 2 minuutin ajan
3. Keskitytään tarkkuuteen, ei nopeuteen
4. Vaihdetaan pareita 2 minuutin välein

## Huomioitavaa
- Pidä katse ylhäällä syöttäessä
- Käytä koko mailan terää
- Seuraa pallon perässä`,
          en: `# Basic Passing Drill

## Objective
Develop players' passing accuracy and stick handling.

## Implementation
1. Players position themselves in pairs 5 meters apart
2. Pass the ball back and forth for 2 minutes
3. Focus on accuracy, not speed
4. Change pairs every 2 minutes

## Key Points
- Keep eyes up when passing
- Use the full blade of the stick
- Follow through after the pass`
        },
        tags: ['syöttö', 'perustaidot', 'tarkkuus'],
        difficulty: 'beginner',
        ageGroup: ['U10', 'U12', 'all'],
        duration: 10,
        equipment: ['ball', 'stick'],
        author: 'Hawks Coaching Staff',
        status: 'published',
        metadata: {
          views: 45,
          likes: 8,
          isFavorite: false,
          relatedContent: [],
          seasons: ['all']
        }
      },
      {
        type: 'tactic',
        category: 'offense',
        title: {
          fi: 'Ylivoima 5v4 perusasetelma',
          en: '5v4 Power Play Basic Formation'
        },
        description: {
          fi: 'Klassinen ylivoimamuodostelma hyökkäysalueella',
          en: 'Classic power play formation in the offensive zone'
        },
        content: {
          fi: `# Ylivoima 5v4 Perusasetelma

## Asetelma
- 1 pelaaja maalin takana (QB - Quarterback)
- 2 pelaajaa yläkiekkojen kohdalla
- 2 pelaajaa maalin edessä

## Pelitapa
1. QB aloittaa peliliikkeen
2. Nopea pallonkierto
3. Laukausmahdollisuuksien etsiminen
4. Keskitykset maalille

## Erikoistilanteet
- Jos pallo menee sivulle → nopea palautus QB:lle
- Alivoima → turva-asetelma`,
          en: `# 5v4 Power Play Basic Formation

## Formation
- 1 player behind the goal (QB - Quarterback)
- 2 players at the high circles
- 2 players in front of goal

## Game Plan
1. QB initiates play movement
2. Quick puck circulation
3. Look for shooting opportunities
4. Focus on goal-front plays

## Special Situations
- If puck goes out → quick recovery to QB
- Short-handed → defensive setup`
        },
        tags: ['ylivoima', 'taktiikka', 'hyökkäys'],
        difficulty: 'intermediate',
        ageGroup: ['U14', 'U16', 'U18', 'senior'],
        duration: 15,
        equipment: ['ball', 'goals'],
        author: 'Head Coach',
        status: 'published',
        metadata: {
          views: 23,
          likes: 12,
          isFavorite: true,
          relatedContent: [],
          seasons: ['in-season']
        }
      }
    ];

    // Create sample content
    for (const content of sampleContent) {
      await this.createContent(content);
    }

    console.log('📚 Sample content loaded:', sampleContent.length, 'items');
  }
}

// Export singleton instance
export const contentManager = new ContentManager();