# Technical Migration Guide

## Hawks Coach Hub - Implementation Specifications

**Companion to**: MIGRATION_ROADMAP.md
**Focus**: Technical implementation details and code examples

---

## Current Architecture Analysis

### Existing Service Integration Points

```typescript
// Current Google Drive Service Pattern
class ServiceAccountDriveService {
  private cache = new Map<string, any>();
  private lastCacheTime = 0;

  async loadAllFilesAndFolders(refresh = false) {
    // Caching logic preserves 5s load optimization
    // Must be preserved in new architecture
  }
}
```

### Critical Dependencies to Preserve

```typescript
// State management patterns to maintain
interface AppState {
  allFiles: DriveFile[];
  allFolders: DriveFolder[];
  filteredFiles: DriveFile[];
  currentFolderFilter: string | null;
  expandedFolders: Set<string>;
  folderCache: Map<string, DriveFile[]>;
}
```

---

## Phase 1: Foundation Setup

### Astro Project Initialization

```bash
# Create new Astro project with TypeScript
npm create astro@latest hawks-coach-hub-v2 -- --template=minimal --typescript

# Essential integrations
npm install @astrojs/tailwind @astrojs/sitemap @astrojs/cloudflare
npm install @astrojs/partytown @astrojs/compress

# Search and utilities
npm install minisearch google-auth-library
npm install @supabase/supabase-js

# Development dependencies
npm install -D @types/node vitest @vitest/ui playwright
```

### Astro Configuration

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import compress from '@astrojs/compress';

export default defineConfig({
  site: 'https://coach-hub.hawks.fi',
  integrations: [tailwind(), sitemap(), compress()],
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@services': path.resolve('./src/services'),
        '@utils': path.resolve('./src/utils'),
      },
    },
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  },
  experimental: {
    optimizeHoistedScript: true,
  },
});
```

### Supabase Project Setup

```sql
-- Database schema for Hawks Coach Hub
CREATE TABLE public.training_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  file_url TEXT,
  drive_file_id VARCHAR(255),
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.content_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INTEGER DEFAULT 0
);

-- Insert default categories
INSERT INTO public.content_categories (name, description, icon, color, sort_order) VALUES
('Floorball Drills', 'Training drills and exercises', 'hockey-puck', 'blue', 1),
('Tactics & Strategy', 'Game tactics and strategic planning', 'strategy', 'green', 2),
('Training Plans', 'Complete training session plans', 'calendar', 'purple', 3),
('Video Resources', 'Training and match videos', 'video', 'red', 4),
('Diagrams & Images', 'Visual training materials', 'image', 'orange', 5),
('Documents', 'General documentation', 'document', 'gray', 6);

-- Enable Row Level Security
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to training content" ON public.training_content
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to categories" ON public.content_categories
  FOR SELECT USING (true);
```

---

## Phase 2: Service Layer Migration

### Google Drive Integration (Preserved)

```typescript
// src/services/drive-service.ts
import { GoogleAuth } from 'google-auth-library';

export class HybridDriveService {
  private auth: GoogleAuth;
  private cache = new Map<string, any>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }

  async loadFilesAndFolders(refresh = false): Promise<{
    files: DriveFile[];
    folders: DriveFolder[];
    cached: boolean;
  }> {
    const cacheKey = 'drive-files-folders';
    const now = Date.now();

    if (!refresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheExpiry) {
        return { ...cached.data, cached: true };
      }
    }

    // Preserve existing Google Drive API logic
    const authClient = await this.auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    // Implementation mirrors current service-account pattern
    const response = await drive.files.list({
      q: `'${process.env.HAWKS_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink,parents)',
      pageSize: 1000,
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];
    const result = this.categorizeFiles(files);

    this.cache.set(cacheKey, {
      data: result,
      timestamp: now,
    });

    return { ...result, cached: false };
  }

  private categorizeFiles(files: any[]) {
    // Preserve existing categorization logic
    const driveFiles: DriveFile[] = [];
    const driveFolders: DriveFolder[] = [];

    files.forEach(file => {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        driveFolders.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          parents: file.parents,
        });
      } else {
        driveFiles.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          parents: file.parents,
        });
      }
    });

    return { files: driveFiles, folders: driveFolders };
  }
}
```

### Supabase Content Service

```typescript
// src/services/content-service.ts
import { createClient } from '@supabase/supabase-js';

export class ContentService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );
  }

  async getStaticContent() {
    const { data: content, error } = await this.supabase
      .from('training_content')
      .select(
        `
        *,
        category:content_categories(name, icon, color)
      `
      )
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return content;
  }

  async getCategories() {
    const { data: categories, error } = await this.supabase
      .from('content_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return categories;
  }

  async searchContent(query: string) {
    const { data, error } = await this.supabase
      .from('training_content')
      .select('*')
      .textSearch('fts', query);

    if (error) throw error;
    return data;
  }
}
```

### Enhanced Search Service

```typescript
// src/services/search-service.ts
import MiniSearch from 'minisearch';

export class EnhancedSearchService {
  private miniSearch: MiniSearch;
  private isInitialized = false;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['name', 'description', 'category', 'tags', 'content'],
      storeFields: ['id', 'name', 'url', 'type', 'category', 'mimeType'],
      searchOptions: {
        boost: { name: 3, description: 2, category: 1.5 },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND',
      },
    });
  }

  async initialize(files: DriveFile[], staticContent: any[]) {
    if (this.isInitialized) return;

    // Index Google Drive files
    const driveDocuments = files.map(file => ({
      id: `drive-${file.id}`,
      name: file.name,
      description: this.extractDescription(file.name),
      category: this.categorizeFile(file),
      type: 'drive',
      url: file.webViewLink,
      mimeType: file.mimeType,
      tags: this.extractTags(file.name),
    }));

    // Index static content
    const staticDocuments = staticContent.map(content => ({
      id: `static-${content.id}`,
      name: content.title,
      description: content.description,
      category: content.category.name,
      type: 'static',
      url: content.file_url || `#${content.id}`,
      tags: content.tags || [],
    }));

    const allDocuments = [...driveDocuments, ...staticDocuments];
    this.miniSearch.addAll(allDocuments);
    this.isInitialized = true;
  }

  search(query: string, options = {}) {
    if (!this.isInitialized) return [];

    const defaultOptions = {
      limit: 50,
      fuzzy: 0.2,
      prefix: true,
    };

    return this.miniSearch.search(query, { ...defaultOptions, ...options });
  }

  private extractDescription(filename: string): string {
    // Extract meaningful description from filename
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes and underscores
      .toLowerCase();
  }

  private categorizeFile(file: DriveFile): string {
    const name = file.name.toLowerCase();
    const mimeType = file.mimeType;

    if (mimeType.includes('video')) return 'Video Resources';
    if (mimeType.includes('image')) return 'Diagrams & Images';
    if (name.includes('drill') || name.includes('exercise'))
      return 'Floorball Drills';
    if (name.includes('tactic') || name.includes('strategy'))
      return 'Tactics & Strategy';
    if (name.includes('plan') || name.includes('session'))
      return 'Training Plans';

    return 'Documents';
  }

  private extractTags(filename: string): string[] {
    const tags: string[] = [];
    const name = filename.toLowerCase();

    // Common training tags
    if (name.includes('beginner')) tags.push('beginner');
    if (name.includes('advanced')) tags.push('advanced');
    if (name.includes('youth')) tags.push('youth');
    if (name.includes('adult')) tags.push('adult');
    if (name.includes('goalkeeper')) tags.push('goalkeeper');
    if (name.includes('defense')) tags.push('defense');
    if (name.includes('offense')) tags.push('offense');

    return tags;
  }
}
```

---

## Phase 3: Component Architecture

### Core Layout Component

```astro
---
// src/layouts/Layout.astro
import { ViewTransitions } from 'astro:transitions';

export interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Hawks Helsinki Coach Hub - Training Resources' } = Astro.props;
---

<!DOCTYPE html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />

    <!-- Performance optimizations -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://drive.google.com" />

    <!-- Critical CSS inlined -->
    <style>
      /* Critical styles for LCP optimization */
      .loading-skeleton { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    </style>

    <title>{title}</title>
    <ViewTransitions />
  </head>
  <body class="h-full bg-gray-50 font-sans antialiased">
    <div id="app" class="min-h-full">
      <slot />
    </div>

    <!-- Performance monitoring -->
    <script>
      // Web Vitals tracking
      import { getLCP, getFID, getCLS } from 'web-vitals';

      getLCP(console.log);
      getFID(console.log);
      getCLS(console.log);
    </script>
  </body>
</html>
```

### File Browser Component (Island)

```astro
---
// src/components/FileBrowser.astro
import { HybridDriveService } from '@services/drive-service';
import { ContentService } from '@services/content-service';

const driveService = new HybridDriveService();
const contentService = new ContentService();

// Server-side data loading for better performance
const [driveData, staticContent] = await Promise.all([
  driveService.loadFilesAndFolders(),
  contentService.getStaticContent()
]);
---

<div id="file-browser" class="w-full">
  <!-- Loading skeleton for immediate visual feedback -->
  <div class="loading-skeleton grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {Array.from({ length: 6 }).map(() => (
      <div class="bg-white rounded-lg shadow h-24 animate-pulse" />
    ))}
  </div>

  <!-- Actual content (hydrated as island) -->
  <div class="file-browser-content hidden">
    <!-- Content will be rendered by React/Vue island -->
  </div>
</div>

<script>
  // Client-side hydration for interactivity
  import { FileBrowserIsland } from '@components/islands/FileBrowserIsland';

  const container = document.getElementById('file-browser');
  const initialData = {
    driveFiles: {driveData.files},
    driveFolders: {driveData.folders},
    staticContent: {staticContent},
    cached: {driveData.cached}
  };

  // Hydrate component with server data
  FileBrowserIsland.mount(container, initialData);
</script>
```

### Search Component Island

```tsx
// src/components/islands/SearchIsland.tsx
import { useState, useEffect, useMemo } from 'react';
import { EnhancedSearchService } from '@services/search-service';

interface SearchProps {
  initialFiles: DriveFile[];
  initialContent: any[];
}

export function SearchIsland({ initialFiles, initialContent }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchService = useMemo(() => {
    const service = new EnhancedSearchService();
    service.initialize(initialFiles, initialContent);
    return service;
  }, [initialFiles, initialContent]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // Debounced search
    const timeoutId = setTimeout(() => {
      const searchResults = searchService.search(query);
      setResults(searchResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchService]);

  return (
    <div className="search-container">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search training materials..."
          className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon className="w-5 h-5 text-gray-400" />
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <LoadingSpinner />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 text-sm text-gray-600 border-b">
            Found {results.length} results
          </div>
          <div className="max-h-96 overflow-y-auto">
            {results.map(result => (
              <SearchResult key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Performance Optimizations

### Image Optimization

```astro
---
// src/components/OptimizedImage.astro
import { Image } from 'astro:assets';

export interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  class?: string;
}

const {
  src,
  alt,
  width = 400,
  height = 300,
  loading = 'lazy',
  class: className = ''
} = Astro.props;
---

<Image
  src={src}
  alt={alt}
  width={width}
  height={height}
  loading={loading}
  class={className}
  format="webp"
  quality={85}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Service Worker for Caching

```typescript
// public/sw.js
const CACHE_NAME = 'hawks-coach-hub-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/images/hawks-logo.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches
        .match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Network-first strategy for Google Drive API
  if (event.request.url.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for other requests
  event.respondWith(
    caches.match(event.request).then(response => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches
          .open(CACHE_NAME)
          .then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      });

      return response || fetchPromise;
    })
  );
});
```

---

## Phase 5: Deployment Configuration

### Cloudflare Pages Configuration

```toml
# wrangler.toml
name = "hawks-coach-hub"
compatibility_date = "2024-03-01"

[build]
command = "npm run build"
publish = "dist"

[env.production.vars]
ENVIRONMENT = "production"

[[env.production.r2_buckets]]
binding = "ASSETS"
bucket_name = "hawks-assets"

[[env.production.durable_objects]]
name = "SearchIndex"
class_name = "SearchIndex"
```

### Environment Variables Setup

```bash
# .env.example
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Drive API
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
HAWKS_FOLDER_ID=your-drive-folder-id

# Cloudflare Configuration
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Analytics (optional)
PUBLIC_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Type check
        run: npm run typecheck

      - name: Build project
        run: npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: hawks-coach-hub
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## Migration Scripts

### Data Migration Utility

```typescript
// scripts/migrate-data.ts
import { HybridDriveService } from '../src/services/drive-service';
import { ContentService } from '../src/services/content-service';

class DataMigrator {
  private driveService = new HybridDriveService();
  private contentService = new ContentService();

  async migrateToSupabase() {
    console.log('Starting data migration...');

    // Load current Google Drive structure
    const driveData = await this.driveService.loadFilesAndFolders(true);

    // Analyze and categorize content
    const categorizedContent = this.analyzeContent(driveData.files);

    // Create static content entries in Supabase
    for (const category of Object.keys(categorizedContent)) {
      const files = categorizedContent[category];

      for (const file of files) {
        await this.createStaticContentEntry(file, category);
      }
    }

    console.log('Migration completed successfully');
  }

  private analyzeContent(files: DriveFile[]) {
    // Implementation similar to existing categorization
    const categories = {
      'Training Plans': [],
      'Floorball Drills': [],
      'Tactics & Strategy': [],
      'Video Resources': [],
      'Diagrams & Images': [],
      Documents: [],
    };

    files.forEach(file => {
      const category = this.categorizeFile(file);
      categories[category].push(file);
    });

    return categories;
  }

  private async createStaticContentEntry(file: DriveFile, category: string) {
    // Create entry in Supabase with file metadata
    const contentEntry = {
      title: this.cleanFileName(file.name),
      description: this.generateDescription(file),
      category,
      content_type: 'drive_reference',
      file_url: file.webViewLink,
      drive_file_id: file.id,
      tags: this.extractTags(file.name),
    };

    // Insert into Supabase (implementation depends on final schema)
    console.log('Creating content entry:', contentEntry.title);
  }
}

// Run migration
const migrator = new DataMigrator();
migrator.migrateToSupabase().catch(console.error);
```

---

## Testing Strategy

### Performance Testing

```typescript
// tests/performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page loads within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('[data-testid="file-browser"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('search responds within 200ms', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="search-input"]');

    const startTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'drill');
    await page.waitForSelector('[data-testid="search-results"]');

    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(200);
  });

  test('lighthouse scores meet targets', async ({ page }) => {
    await page.goto('/');

    // Run Lighthouse audit
    const audit = await page.lighthouse();

    expect(audit.performance).toBeGreaterThan(90);
    expect(audit.accessibility).toBeGreaterThan(95);
    expect(audit.bestPractices).toBeGreaterThan(90);
    expect(audit.seo).toBeGreaterThan(90);
  });
});
```

### Integration Testing

```typescript
// tests/integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('Google Drive Integration', () => {
  test('loads files from Google Drive', async ({ page }) => {
    await page.goto('/');

    // Wait for files to load
    await page.waitForSelector('[data-testid="file-list"]');

    // Verify files are displayed
    const fileCount = await page.locator('[data-testid="file-item"]').count();
    expect(fileCount).toBeGreaterThan(0);
  });

  test('preserves folder navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate to a folder
    await page.click('[data-testid="folder-chip"]:first-child');

    // Verify filtered view
    const breadcrumb = page.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
  });
});
```

---

## Monitoring and Analytics

### Performance Monitoring Setup

```typescript
// src/utils/monitoring.ts
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();

  init() {
    // Core Web Vitals
    getCLS(this.handleMetric.bind(this));
    getFCP(this.handleMetric.bind(this));
    getFID(this.handleMetric.bind(this));
    getLCP(this.handleMetric.bind(this));
    getTTFB(this.handleMetric.bind(this));

    // Custom metrics
    this.trackCustomMetrics();
  }

  private handleMetric(metric: any) {
    this.metrics.set(metric.name, metric.value);

    // Send to analytics (replace with your analytics service)
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(
          metric.name === 'CLS' ? metric.value * 1000 : metric.value
        ),
        non_interaction: true,
      });
    }
  }

  private trackCustomMetrics() {
    // Track search performance
    const searchInput = document.querySelector('[data-testid="search-input"]');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const startTime = performance.now();

        // Measure search response time
        const observer = new MutationObserver(() => {
          const endTime = performance.now();
          this.metrics.set('search_response_time', endTime - startTime);
          observer.disconnect();
        });

        observer.observe(
          document.querySelector('[data-testid="search-results"]'),
          {
            childList: true,
          }
        );
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

---

This technical migration guide provides the detailed implementation specifications needed to execute the migration plan outlined in the main roadmap. Each phase includes specific code examples, configurations, and testing strategies to ensure a successful transition to the new architecture.
