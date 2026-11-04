# Technical Specifications: Hawks Coach Hub v2.0

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Astro)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Static Pages   │  │ React Islands   │  │   API Routes    │ │
│  │  (Build-time)   │  │  (Interactive)  │  │   (Runtime)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                        │                      │
         ▼                        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Strapi CMS     │    │  Static Assets  │    │ Google Drive    │
│  (Supabase)     │    │  (Supabase)     │    │     API         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Data Models and Schemas

### Content Collections (Astro)

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

export const collections = {
  drills: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string(),
      category: z.enum(['passing', 'shooting', 'defense', 'goalie', 'team']),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      duration: z.number().min(5).max(120), // minutes
      playerCount: z.object({
        min: z.number().min(1),
        max: z.number().max(30),
      }),
      equipment: z.array(z.string()).optional(),
      tags: z.array(z.string()).default([]),
      language: z.enum(['fi', 'en']).default('fi'),
      publishedAt: z.date(),
      updatedAt: z.date(),
      featured: z.boolean().default(false),
      videoUrl: z.string().url().optional(),
      diagramUrl: z.string().url().optional(),
    }),
  }),

  tactics: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string(),
      situation: z.enum([
        'powerplay',
        'penaltykill',
        'evenstrength',
        'special',
      ]),
      formation: z.string(),
      playerRoles: z.array(
        z.object({
          position: z.string(),
          responsibility: z.string(),
        })
      ),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      tags: z.array(z.string()).default([]),
      language: z.enum(['fi', 'en']).default('fi'),
      diagramUrl: z.string().url().optional(),
      publishedAt: z.date(),
    }),
  }),

  plans: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string(),
      ageGroup: z.enum(['u8', 'u10', 'u12', 'u14', 'u16', 'u18', 'adult']),
      sessionType: z.enum(['training', 'game', 'tournament', 'camp']),
      duration: z.number().min(30).max(180), // minutes
      objectives: z.array(z.string()),
      warmup: z.array(z.string()),
      mainContent: z.array(z.string()),
      cooldown: z.array(z.string()),
      equipment: z.array(z.string()),
      language: z.enum(['fi', 'en']).default('fi'),
      publishedAt: z.date(),
    }),
  }),
};
```

### Strapi Content Types

```typescript
// Drill Content Type
interface DrillContentType {
  title: string;
  slug: string;
  description: string;
  content: string; // Rich text content
  category: 'passing' | 'shooting' | 'defense' | 'goalie' | 'team';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  playerCount: {
    min: number;
    max: number;
  };
  equipment: string[];
  tags: string[];
  featuredImage?: MediaFormat;
  diagramImages?: MediaFormat[];
  videoUrl?: string;
  locale: 'fi' | 'en';
  localizations?: DrillContentType[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Media Format (Strapi)
interface MediaFormat {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width: number;
  height: number;
  formats: {
    thumbnail: ImageFormat;
    small: ImageFormat;
    medium: ImageFormat;
    large: ImageFormat;
  };
  url: string;
  mime: string;
  size: number;
}
```

### Google Drive Integration Types

```typescript
// Extended from existing types
interface HybridDriveFile extends DriveFile {
  source: 'drive';
  category?: ContentCategory;
  isPersonal: boolean;
  uploadedBy?: string;
  autoTags?: string[];
}

interface ContentSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  source: 'static' | 'drive';
  category: ContentCategory;
  type: 'drill' | 'tactic' | 'plan' | 'file';
  language: 'fi' | 'en';
  relevanceScore: number;
  lastModified: string;
  thumbnail?: string;
}
```

## API Specifications

### Static Content API (Astro API Routes)

```typescript
// src/pages/api/content/search.ts
export async function GET({ request }: APIContext) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const category = url.searchParams.get('category');
  const language = url.searchParams.get('lang') || 'fi';
  const source = url.searchParams.get('source'); // 'static', 'drive', or 'all'

  const results = await searchContent({
    query,
    category,
    language,
    source,
  });

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// src/pages/api/content/[type]/[slug].ts
export async function GET({ params }: APIContext) {
  const { type, slug } = params;
  const content = await getContentBySlug(type, slug);

  if (!content) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(JSON.stringify(content), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Strapi API Extensions

```typescript
// Custom Strapi controller for content management
export default {
  async findWithMetadata(ctx) {
    const { query } = ctx.request;

    const entries = await strapi.entityService.findMany('api::drill.drill', {
      ...query,
      populate: {
        featuredImage: true,
        diagramImages: true,
        localizations: true,
      },
    });

    // Add metadata for each entry
    const enrichedEntries = entries.map(entry => ({
      ...entry,
      readTime: calculateReadTime(entry.content),
      relatedContent: findRelatedContent(entry),
      usageStats: getUsageStats(entry.id),
    }));

    return enrichedEntries;
  },

  async search(ctx) {
    const { query, category, difficulty, language } = ctx.request.body;

    const results = await strapi.entityService.findMany('api::drill.drill', {
      filters: {
        $or: [
          { title: { $containsi: query } },
          { description: { $containsi: query } },
          { content: { $containsi: query } },
          { tags: { $in: [query] } },
        ],
        ...(category && { category }),
        ...(difficulty && { difficulty }),
        locale: language || 'fi',
      },
      populate: ['featuredImage'],
    });

    return results;
  },
};
```

## Integration Patterns

### Unified Search Implementation

```typescript
// src/utils/search-unified.ts
export class UnifiedSearchService {
  private strapiService: StrapiService;
  private driveService: ServiceAccountDriveService;

  constructor() {
    this.strapiService = new StrapiService();
    this.driveService = new ServiceAccountDriveService();
  }

  async search(params: SearchParams): Promise<ContentSearchResult[]> {
    const searchPromises: Promise<ContentSearchResult[]>[] = [];

    // Search static content if requested
    if (params.source === 'all' || params.source === 'static') {
      searchPromises.push(this.searchStaticContent(params));
    }

    // Search Drive content if requested
    if (params.source === 'all' || params.source === 'drive') {
      searchPromises.push(this.searchDriveContent(params));
    }

    const results = await Promise.all(searchPromises);
    const flatResults = results.flat();

    return this.rankAndDeduplicateResults(flatResults, params.query);
  }

  private async searchStaticContent(
    params: SearchParams
  ): Promise<ContentSearchResult[]> {
    // Search across all content collections
    const [drills, tactics, plans] = await Promise.all([
      this.strapiService.searchDrills(params),
      this.strapiService.searchTactics(params),
      this.strapiService.searchPlans(params),
    ]);

    return [...drills, ...tactics, ...plans].map(this.formatStaticResult);
  }

  private async searchDriveContent(
    params: SearchParams
  ): Promise<ContentSearchResult[]> {
    const driveFiles = await this.driveService.searchFiles(params.query);
    return driveFiles.map(this.formatDriveResult);
  }

  private rankAndDeduplicateResults(
    results: ContentSearchResult[],
    query: string
  ): ContentSearchResult[] {
    // Apply relevance scoring
    const scoredResults = results.map(result => ({
      ...result,
      relevanceScore: this.calculateRelevanceScore(result, query),
    }));

    // Sort by relevance and remove duplicates
    return scoredResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter(this.deduplicateByTitle);
  }

  private calculateRelevanceScore(
    result: ContentSearchResult,
    query: string
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Title match (highest priority)
    if (result.title.toLowerCase().includes(queryLower)) {
      score += 100;
    }

    // Description match
    if (result.description.toLowerCase().includes(queryLower)) {
      score += 50;
    }

    // Static content gets slight boost for SEO
    if (result.source === 'static') {
      score += 10;
    }

    // Recent content gets slight boost
    const daysSinceModified = this.daysSince(result.lastModified);
    score += Math.max(0, 30 - daysSinceModified);

    return score;
  }
}
```

### Content Synchronization

```typescript
// src/utils/content-sync.ts
export class ContentSyncService {
  async syncDriveToStrapi(driveFileId: string): Promise<void> {
    const driveFile = await this.driveService.getFile(driveFileId);

    // Extract metadata from Drive file
    const metadata = this.extractMetadataFromDriveFile(driveFile);

    // Create or update Strapi entry
    if (metadata.shouldMigrateToStatic) {
      await this.createStrapiEntry(metadata);
    }
  }

  async bulkMigration(migrationPlan: MigrationPlan): Promise<MigrationResult> {
    const results: MigrationResult = {
      successful: [],
      failed: [],
      skipped: [],
    };

    for (const item of migrationPlan.items) {
      try {
        if (item.action === 'migrate') {
          await this.migrateToStatic(item);
          results.successful.push(item.id);
        } else if (item.action === 'keep-drive') {
          await this.enhanceDriveMetadata(item);
          results.skipped.push(item.id);
        }
      } catch (error) {
        console.error(`Migration failed for ${item.id}:`, error);
        results.failed.push({ id: item.id, error: error.message });
      }
    }

    return results;
  }

  private async migrateToStatic(item: MigrationItem): Promise<void> {
    // Download content from Drive
    const content = await this.driveService.downloadFile(item.driveId);

    // Process and clean content
    const processedContent = await this.processContentForMigration(content);

    // Create Strapi entry
    await this.strapiService.createEntry(item.contentType, {
      ...processedContent,
      migratedFrom: item.driveId,
      migratedAt: new Date().toISOString(),
    });
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
// src/utils/cache-manager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CachedItem>();
  private readonly TTL = {
    static: 1000 * 60 * 60 * 24, // 24 hours
    drive: 1000 * 60 * 30, // 30 minutes
    search: 1000 * 60 * 10, // 10 minutes
  };

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < (ttl || this.TTL.static)) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  invalidate(pattern: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key =>
      key.includes(pattern)
    );

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
```

### Image Optimization

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { imageService } from '@astrojs/image/sharp';

export default defineConfig({
  experimental: {
    assets: true,
  },
  image: {
    service: imageService({
      limitInputPixels: false,
    }),
    domains: ['supabase.co', 'drive.google.com'],
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['src/utils/search-unified', 'src/utils/cache-manager'],
          },
        },
      },
    },
  },
});
```

## Security Specifications

### Authentication & Authorization

```typescript
// src/middleware/auth.ts
export async function authMiddleware(
  request: Request
): Promise<Response | void> {
  const url = new URL(request.url);

  // Public routes (static content)
  if (
    url.pathname.startsWith('/drills') ||
    url.pathname.startsWith('/tactics') ||
    url.pathname.startsWith('/plans')
  ) {
    return; // Allow public access
  }

  // Protected routes (Drive content, CMS)
  if (
    url.pathname.startsWith('/api/drive') ||
    url.pathname.startsWith('/admin')
  ) {
    const token = request.headers.get('Authorization');

    if (!token || !(await validateToken(token))) {
      return new Response('Unauthorized', { status: 401 });
    }
  }
}

// Environment variable validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'STRAPI_URL',
  'STRAPI_API_TOKEN',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### Content Security Policy

```typescript
// src/middleware/security.ts
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://drive.google.com https://supabase.co",
    "connect-src 'self' https://www.googleapis.com https://supabase.co",
    'frame-src https://accounts.google.com',
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

## Deployment Configuration

### Vercel Configuration

```json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run dev",
  "functions": {
    "src/pages/api/**.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/drive/drill/:id",
      "destination": "/drills/:id",
      "permanent": true
    }
  ]
}
```

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Strapi Configuration
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-strapi-token

# Google Drive API
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Application Configuration
PUBLIC_SITE_URL=https://coach-hub.vercel.app
PUBLIC_DEFAULT_LANGUAGE=fi
PUBLIC_ENABLE_ANALYTICS=false

# Feature Flags
ENABLE_SEARCH_ANALYTICS=true
ENABLE_CONTENT_MIGRATION=false
ENABLE_DRIVE_SYNC=true
```

This technical specification provides the detailed implementation guide for developers working on the Hawks Coach Hub v2.0 static content integration.
