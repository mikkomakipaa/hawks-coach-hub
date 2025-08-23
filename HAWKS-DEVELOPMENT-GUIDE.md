# Hawks Coach Hub - Development Guide

**Project-specific development guide for Hawks Helsinki coaching platform**

> This guide supplements the [Claude Code SDLC Playbook](./DEVELOPMENT-GUIDE.md) with Hawks-specific workflows and patterns.

## 🚀 Quick Start

### Prerequisites

```bash
# Required tools
node --version    # >= 18.0.0
npm --version     # >= 8.0.0
git --version     # >= 2.30.0

# Google Cloud setup
gcloud --version  # Optional, for service account management
```

### Initial Setup

```bash
# 1. Clone and install
git clone https://github.com/mikkomakipaa/hawks-coach-hub.git
cd hawks-coach-hub
npm install

# 2. Environment setup
cp .env.example .env
# Edit .env with your Google service account credentials

# 3. Verify setup
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## 🏒 Project Architecture

### Hawks-Specific Patterns

#### Service Account Authentication

```typescript
// No OAuth complexity - service account handles all authentication
const driveService = new ServiceAccountDriveService();
const data = await driveService.loadAllFilesAndFolders();
```

#### Finnish/English Coaching Terms

```typescript
// Priority terms for folder sorting
const priorityTerms = [
  // Finnish coaching terms
  'harjoitus',
  'taktiikka',
  'pelit',
  'treeni',
  // English coaching terms
  'training',
  'tactics',
  'drills',
  'practice',
  'session',
  'game',
];
```

#### Performance-First Loading

```typescript
// Always show loading indicators for coaching workflow
updateStatus('Ladataan harjoitusmateriaaleja...', 'loading');
showSkeletonLoading();

// Cache-first strategy for fast subsequent loads
const cached = cache.get();
if (cached) {
  console.log(`⚡ Using cached data (${cached.files.length} files)`);
  return cached;
}
```

## 🛠️ Development Workflow

### Daily Development

```bash
# 1. Start development server
npm run dev
# Opens http://localhost:8000 with hot reload

# 2. Make changes with TypeScript strict mode
npm run typecheck  # Run after each major change

# 3. Code quality checks
npm run lint:fix   # Auto-fix issues
npm run format     # Prettier formatting

# 4. Test your changes
npm run test       # Watch mode for development
npm run test:run   # Single run for CI verification
```

### Git Workflow

```bash
# 1. Conventional commits (use Commitizen)
npm run commit
# Guides you through: feat:, fix:, docs:, perf:, etc.

# 2. Pre-commit hooks automatically run:
# - TypeScript compilation
# - ESLint with auto-fix
# - Prettier formatting
# - Basic tests

# 3. Push triggers CI pipeline:
# - Full test suite
# - Security scanning
# - Build verification
```

## 📁 Code Organization

### Hawks-Specific File Structure

```
src/
├── main-service-account.ts     # Main app logic (service account approach)
├── services/
│   └── drive-service-account.ts # Google Drive API client
├── components/
│   ├── file-display.ts         # Hawks-themed file rendering
│   └── toast.ts               # Finnish/English notifications
├── utils/
│   ├── search.ts              # Coaching term prioritization
│   └── config.ts              # Hawks folder configuration
└── types/
    └── google-apis.ts         # Google Drive type definitions
```

### Key Components

#### File Display (`components/file-display.ts`)

```typescript
// Hawks branding and Finnish localization
export function renderFileCard(file: DriveFile): string {
  return `
    <div class="file-card">
      <div class="file-icon">${getFileIcon(file)}</div>
      <div class="file-name">${file.name}</div>
      <div class="file-actions">
        <button onclick="FileActions.addToSession('${file.id}')">
          Lisää istuntoon
        </button>
      </div>
    </div>
  `;
}
```

#### Search Functionality (`utils/search.ts`)

```typescript
// Coaching-focused search with Finnish/English support
export function filterFilesByCoachingTerms(
  files: DriveFile[],
  searchTerm: string
): DriveFile[] {
  const normalizedTerm = searchTerm.toLowerCase();

  return files.filter(file => {
    const fileName = file.name.toLowerCase();

    // Exact match gets highest priority
    if (fileName.includes(normalizedTerm)) return true;

    // Coaching term synonyms (Finnish ↔ English)
    const synonyms = getCoachingTermSynonyms(normalizedTerm);
    return synonyms.some(synonym => fileName.includes(synonym));
  });
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
GOOGLE_SERVICE_ACCOUNT_KEY="{...json content...}"
# OR
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./coach-hub-key.json"

# Optional
HAWKS_FOLDER_ID="1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb"  # Default Hawks folder
NODE_ENV="development"
```

### TypeScript Configuration

```json
// tsconfig.json - Hawks uses strict mode
{
  "compilerOptions": {
    "strict": true, // Enforced for type safety
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## 🧪 Testing Strategy

### Hawks-Specific Test Patterns

```typescript
// Test Finnish/English coaching term handling
describe('coaching term search', () => {
  it('should find drills with Finnish term "harjoitus"', () => {
    const files = [
      { name: 'Passing Harjoitus.pdf', id: '1' },
      { name: 'Strategy Session.pdf', id: '2' },
    ];

    const results = filterFilesByCoachingTerms(files, 'harjoitus');
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain('Harjoitus');
  });
});
```

### Performance Testing

```bash
# Performance benchmarks for coaching workflow
npm run test:performance

# Expected targets:
# - Initial load: <3 seconds
# - Cached load: <200ms
# - Search filtering: <100ms
# - File selection: <50ms
```

## 🚀 Deployment

### Vercel Deployment

```bash
# Production deployment
npm run build
vercel deploy --prod

# Environment variables in Vercel:
# GOOGLE_SERVICE_ACCOUNT_KEY (from Google Cloud Console)
# HAWKS_FOLDER_ID (optional, uses default)
```

### GitHub Actions CI/CD

The project includes automated workflows:

- **CI Pipeline** (`.github/workflows/ci.yml`):
  - TypeScript compilation
  - ESLint + Prettier
  - Unit tests with coverage
  - Build verification

- **Security Scanning** (`.github/workflows/security.yml`):
  - CodeQL analysis
  - Dependency vulnerability scanning
  - Weekly automated updates

- **Release Pipeline** (`.github/workflows/release.yml`):
  - Conventional commit parsing
  - Automated version bumping
  - GitHub release creation
  - Deployment to GitHub Pages

## 📊 Performance Monitoring

### Hawks Performance Metrics

```javascript
// Performance logging in development
console.log('⚡ Hawks Performance:', {
  loadTime: `${Date.now() - startTime}ms`,
  filesLoaded: files.length,
  foldersLoaded: folders.length,
  cacheHit: !!cached,
});
```

### Key Performance Targets

- **First Load**: <3 seconds (no cache)
- **Cached Load**: <200ms
- **Search Response**: <100ms
- **Bundle Size**: <25KB gzipped

## 🔒 Security Best Practices

### Hawks-Specific Security

```bash
# Service account security
# 1. Minimal permissions (Drive API read-only)
# 2. Specific folder access only
# 3. Regular credential rotation (quarterly)

# Git security (enforced by .gitignore)
coach-hub-*.json     # Service account keys
*service-account*    # Any service account files
*.key, *.pem         # Private keys
```

### Incident Response

If credentials are accidentally committed:

1. **IMMEDIATE**: Revoke service account in Google Cloud Console
2. **IMMEDIATE**: Clean git history with `git filter-repo`
3. **URGENT**: Create new service account
4. **URGENT**: Update production environment variables

## 🤝 Contributing to Hawks Coach Hub

### Code Review Checklist

- [ ] TypeScript strict mode passes (`npm run typecheck`)
- [ ] All ESLint rules pass (`npm run lint`)
- [ ] Tests updated and passing (`npm run test:run`)
- [ ] Performance impact assessed
- [ ] Finnish/English localization maintained
- [ ] Hawks branding preserved
- [ ] Service account security maintained

### Quality Standards

- **Type Safety**: Zero TypeScript errors with strict mode
- **Performance**: No regressions in load time benchmarks
- **Accessibility**: WCAG 2.1 AA compliance for coaching staff
- **Mobile**: Touch-friendly for field use
- **Offline**: Graceful degradation when network poor

---

**🏒 Built for Hawks Helsinki coaching excellence**

_For questions: Open an issue or check the main [Development Guide](./DEVELOPMENT-GUIDE.md)_
