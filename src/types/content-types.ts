/**
 * Static Content Types for Hawks Coach Hub
 * Defines structure for local content management alongside Google Drive
 */

export interface StaticContent {
  id: string;
  type: ContentType;
  category: ContentCategory;
  title: {
    fi: string;
    en: string;
  };
  description: {
    fi: string;
    en: string;
  };
  content: {
    fi: string;
    en: string;
  };
  tags: string[];
  difficulty: DifficultyLevel;
  ageGroup: AgeGroup[];
  duration: number; // minutes
  equipment: Equipment[];
  createdAt: string;
  updatedAt: string;
  author: string;
  status: ContentStatus;
  metadata: ContentMetadata;
}

export type ContentType =
  | 'drill'           // Training drill/exercise
  | 'tactic'          // Tactical instruction
  | 'physical'        // Physical training
  | 'guide'           // How-to guide
  | 'theory'          // Coaching theory
  | 'session'         // Session plan template
  | 'quick-ref';      // Quick reference card

export type ContentCategory =
  | 'basic-skills'    // Perustaidot
  | 'passing'         // Syöttö
  | 'shooting'        // Laukaus
  | 'defense'         // Puolustus
  | 'offense'         // Hyökkäys
  | 'goalkeeping'     // Maalivahti
  | 'team-play'       // Joukkuepeli
  | 'fitness'         // Fysiikka
  | 'mental'          // Henkinen valmennus
  | 'strategy'        // Strategia
  | 'game-analysis';  // Peli-analyysi

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type AgeGroup = 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'senior' | 'all';

export type Equipment =
  | 'ball'            // Pallo
  | 'stick'           // Maila
  | 'cones'           // Kartiot
  | 'goals'           // Maalit
  | 'bibs'            // Liivit
  | 'none';           // Ei tarvikkeita

export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export interface ContentMetadata {
  views: number;
  likes: number;
  lastViewed?: string;
  isFavorite: boolean;
  relatedContent: string[]; // IDs of related content
  seasons: Season[];
}

export type Season = 'pre-season' | 'in-season' | 'off-season' | 'all';

export interface ContentCollection {
  id: string;
  name: {
    fi: string;
    en: string;
  };
  description: {
    fi: string;
    en: string;
  };
  contentIds: string[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export interface ContentSearchOptions {
  query?: string;
  type?: ContentType[];
  category?: ContentCategory[];
  difficulty?: DifficultyLevel[];
  ageGroup?: AgeGroup[];
  duration?: {
    min: number;
    max: number;
  };
  equipment?: Equipment[];
  language: 'fi' | 'en';
  tags?: string[];
}

export interface ContentSearchResult extends StaticContent {
  score: number;
  matchedFields: string[];
  highlights: {
    [key: string]: string;
  };
}

// Content management interfaces
export interface ContentManager {
  // Content CRUD
  createContent(content: Omit<StaticContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<StaticContent>;
  getContent(id: string, language?: 'fi' | 'en'): Promise<StaticContent | null>;
  updateContent(id: string, updates: Partial<StaticContent>): Promise<StaticContent>;
  deleteContent(id: string): Promise<boolean>;

  // Search and filtering
  searchContent(options: ContentSearchOptions): Promise<ContentSearchResult[]>;
  getContentByCategory(category: ContentCategory, language?: 'fi' | 'en'): Promise<StaticContent[]>;
  getContentByType(type: ContentType, language?: 'fi' | 'en'): Promise<StaticContent[]>;

  // Collections
  createCollection(collection: Omit<ContentCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentCollection>;
  getCollection(id: string): Promise<ContentCollection | null>;
  addToCollection(collectionId: string, contentId: string): Promise<boolean>;
  removeFromCollection(collectionId: string, contentId: string): Promise<boolean>;

  // Analytics
  incrementViews(contentId: string): Promise<void>;
  toggleFavorite(contentId: string): Promise<boolean>;
  getPopularContent(limit: number): Promise<StaticContent[]>;
  getRecentContent(limit: number): Promise<StaticContent[]>;
}

// Finnish language mappings
export const FinnishLabels: Record<string, { fi: string; en: string }> = {
  // Content types
  'drill': { fi: 'Harjoitus', en: 'Drill' },
  'tactic': { fi: 'Taktiikka', en: 'Tactic' },
  'physical': { fi: 'Fysiikka', en: 'Physical' },
  'guide': { fi: 'Opas', en: 'Guide' },
  'theory': { fi: 'Teoria', en: 'Theory' },
  'session': { fi: 'Harjoituskerta', en: 'Session' },
  'quick-ref': { fi: 'Pikaopas', en: 'Quick Reference' },

  // Categories
  'basic-skills': { fi: 'Perustaidot', en: 'Basic Skills' },
  'passing': { fi: 'Syöttö', en: 'Passing' },
  'shooting': { fi: 'Laukaus', en: 'Shooting' },
  'defense': { fi: 'Puolustus', en: 'Defense' },
  'offense': { fi: 'Hyökkäys', en: 'Offense' },
  'goalkeeping': { fi: 'Maalivahti', en: 'Goalkeeping' },
  'team-play': { fi: 'Joukkuepeli', en: 'Team Play' },
  'fitness': { fi: 'Fysiikka', en: 'Fitness' },
  'mental': { fi: 'Henkinen', en: 'Mental' },
  'strategy': { fi: 'Strategia', en: 'Strategy' },
  'game-analysis': { fi: 'Peli-analyysi', en: 'Game Analysis' },

  // Difficulty
  'beginner': { fi: 'Aloittelija', en: 'Beginner' },
  'intermediate': { fi: 'Keskitaso', en: 'Intermediate' },
  'advanced': { fi: 'Edistynyt', en: 'Advanced' },
  'expert': { fi: 'Asiantuntija', en: 'Expert' },

  // Equipment
  'ball': { fi: 'Pallo', en: 'Ball' },
  'stick': { fi: 'Maila', en: 'Stick' },
  'cones': { fi: 'Kartiot', en: 'Cones' },
  'goals': { fi: 'Maalit', en: 'Goals' },
  'bibs': { fi: 'Liivit', en: 'Bibs' },
  'none': { fi: 'Ei tarvikkeita', en: 'No Equipment' }
};