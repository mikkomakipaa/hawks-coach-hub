# Testing Strategy

**Project**: Hawks Coach Hub
**Last Updated**: 2026-02-28

---

## Philosophy

Focus on **critical path coverage** over 100% coverage. The app is a file browser — correctness of search, file rendering, and API integration matters most.

**Testing Pyramid**:

```
        ╱╲
       ╱  ╲       E2E Tests (Playwright)
      ╱────╲      - Load performance
     ╱      ╲     - Tab navigation
    ╱────────╲    - Search flow
   ╱          ╲   Integration Tests
  ╱────────────╲  - API proxy response
 ╱──────────────╲ - Drive service caching
╱────────────────╲ Unit Tests
──────────────────  - Search logic
                    - Folder detection
                    - DOM utilities
```

---

## Unit Tests (Vitest)

**Tool**: Vitest + jsdom
**Config**: `vitest.config.ts`
**Run**: `npm run test:run`

### What to Test

| Module                          | Test Focus                     |
| ------------------------------- | ------------------------------ |
| `src/utils/search.ts`           | Query normalization, filtering |
| `src/utils/enhanced-search.ts`  | Index building, fuzzy matching |
| `src/utils/folder-detection.ts` | Folder hierarchy parsing       |
| `src/utils/config.ts`           | Config values and defaults     |
| `src/utils/dom.ts`              | DOM helper functions           |
| `src/components/toast.ts`       | Toast creation/dismissal logic |

### Test File Location

Co-located with source: `src/utils/search.test.ts` alongside `src/utils/search.ts`

### Example

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeSearchQuery } from './search';

describe('normalizeSearchQuery', () => {
  it('lowercases input', () => {
    expect(normalizeSearchQuery('HARJOITUS')).toBe('harjoitus');
  });

  it('trims whitespace', () => {
    expect(normalizeSearchQuery('  drill  ')).toBe('drill');
  });

  it('handles empty string', () => {
    expect(normalizeSearchQuery('')).toBe('');
  });
});
```

### Coverage Target

**40% statement coverage** minimum on `src/utils/` modules.
Critical paths in search and folder logic should aim for 80%+.

---

## Integration Tests

**Tool**: Vitest with mocked fetch
**Location**: `src/test/integration/`

### What to Test

- `drive-service-account.ts`: cache behavior, API error handling
- `tab-search-service.ts`: folder-to-tab mapping, file filtering

### Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ServiceAccountDriveService } from '../services/drive-service-account';

describe('ServiceAccountDriveService', () => {
  it('caches responses for 5 minutes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [], folders: [], cached: false }),
    });
    global.fetch = mockFetch;

    const service = new ServiceAccountDriveService();
    await service.loadAllFilesAndFolders();
    await service.loadAllFilesAndFolders(); // second call

    expect(mockFetch).toHaveBeenCalledTimes(1); // served from cache
  });
});
```

---

## E2E Tests (Playwright)

**Tool**: Playwright
**Config**: `playwright.config.ts`
**Location**: `e2e/`
**Run**: `npm run test:e2e`

### Critical Paths to Cover

| Test            | Scenario            | Success Criteria               |
| --------------- | ------------------- | ------------------------------ |
| Initial load    | Open app fresh      | Files visible within 5 seconds |
| Tab navigation  | Click each tab      | Files update, no full reload   |
| Search          | Type in search box  | Results filter in <200ms       |
| File open       | Click "Avaa"        | New tab opens with Drive URL   |
| Cached load     | Reload within 5 min | Load time <500ms               |
| Mobile viewport | 375px width         | No horizontal scroll, usable   |

Structured backend integration coverage should also include:

- import-draft review status transitions (`pending` -> `reviewed` -> `rejected` -> `converted`)
- permission failures for anonymous, `viewer`, `editor`, and `admin` routes
- confirmation that anonymous browse reads remain separated from planner/editor write endpoints
- planner identity resolution from `localStorage` and `window.HAWKS_PLANNER_IDENTITY`
- drill-catalog debounce timing so planner search regressions are caught separately from browse search

### Example

```typescript
import { test, expect } from '@playwright/test';

test('loads file list within 5 seconds', async ({ page }) => {
  await page.goto('/');
  const fileCard = page.locator('.file-card').first();
  await expect(fileCard).toBeVisible({ timeout: 5000 });
});

test('search filters results', async ({ page }) => {
  await page.goto('/');
  await page.locator('.file-card').first().waitFor({ timeout: 5000 });
  await page.fill('[data-testid="search-input"]', 'harjoitus');
  const results = page.locator('.file-card');
  const count = await results.count();
  expect(count).toBeGreaterThan(0);
});
```

---

## What NOT to Test

- Google Drive API responses (external service, mock instead)
- CSS styles (visual regression testing is overkill for this project)
- Browser-specific rendering (test 1 modern browser in CI)

---

## CI Integration

Tests run on every push via GitHub Actions (`.github/workflows/ci.yml`):

1. `npm run typecheck` — TypeScript strict compilation
2. `npm run lint` — ESLint
3. `npm run test:run` — Vitest unit/integration tests
4. `npm run build` — Production build check
5. Playwright E2E — against built/preview server (if configured)

Current hardening note:

- Playwright performance coverage should stay dependency-light. Do not rely on optional accessibility packages unless they are installed in `package.json`.

---

## Running Tests Locally

```bash
# All unit tests
npm run test:run

# Watch mode
npm run test

# Coverage report
npm run test:coverage

# Single test file
npm run test -- src/utils/search.test.ts

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## Test-Version UI States

- Uusille planner-, harjoite- ja editorireiteille pidetaan oma coverage lataus-, tyhja-, virhe- ja permission denied -tiloista.
- Shared-state renderointi testataan komponenttitasolla, jotta sama markup ja retry/action-kayttaytyminen pysyy yhdenmukaisena useissa nakymissa.
- Action-feedback polut (toast + inline-banner) tarkistetaan ainakin luonnoksen tallennuksessa, julkaisussa, importin muunnossa ja harjoitteen lisaamisessa planneriin.
