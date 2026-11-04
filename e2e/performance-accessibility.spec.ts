import { expect, test } from '@playwright/test';

test.describe('Browse and planner performance regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'hawks.planner.identity.v1',
        JSON.stringify({
          userId: 'coach_1',
          email: 'coach@example.com',
          role: 'editor',
          displayName: 'Coach One',
        }),
      );
    });

    await page.route('/api/drive*', async route => {
      const folders = [
        { id: 'folder_handbook', name: 'Valmentajan käsikirja', parents: ['root'] },
        { id: 'folder_sport', name: 'Lajiharjoittelu', parents: ['root'] },
        { id: 'folder_fitness', name: 'Fysiikkaharjoittelu', parents: ['root'] },
        { id: 'folder_game', name: 'Pelitilanneroolit', parents: ['root'] },
      ];

      const files = Array.from({ length: 24 }, (_, index) => {
        const parentId = folders[index % folders.length]?.id ?? 'folder_handbook';
        return {
          id: `file_${index + 1}`,
          name: `Harjoitus ${index + 1} ${index % 2 === 0 ? 'syotto' : 'laukaus'}.pdf`,
          parents: [parentId],
          mimeType: 'application/pdf',
          size: `${(index + 1) * 1000}`,
          modifiedTime: '2026-02-28T09:00:00.000Z',
          webViewLink: `https://drive.google.com/file/d/file_${index + 1}/view`,
        };
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files,
          folders,
          cached: false,
          loadedAt: Date.now(),
        }),
      });
    });

    const drills = [
      {
        id: 'drill_1',
        slug: 'kulmataistelu',
        title: 'Kulmataistelu',
        summary: 'Nopea 1v1 kulmasta keskustaan.',
        description: 'Kuvaus',
        category: 'Kamppailu',
        intensityLevel: 'high',
        ageGroups: ['U12', 'U14'],
        skillTags: ['1v1', 'kulmapeli'],
        durationMin: 12,
        playerCountMin: 4,
        playerCountMax: 8,
        equipment: [],
        coachingPoints: [],
        progressionIdeas: [],
        variationIdeas: [],
        status: 'published',
        sourceType: 'native',
        attachmentIds: [],
        createdAt: '2026-02-28T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      },
      {
        id: 'drill_2',
        slug: 'peruslaukaus',
        title: 'Peruslaukaus',
        summary: 'Laukaustekniikka liikkeesta.',
        description: 'Kuvaus',
        category: 'Laukaukset',
        intensityLevel: 'medium',
        ageGroups: ['U10', 'U12'],
        skillTags: ['laukaus'],
        durationMin: 10,
        playerCountMin: 3,
        playerCountMax: 6,
        equipment: [],
        coachingPoints: [],
        progressionIdeas: [],
        variationIdeas: [],
        status: 'published',
        sourceType: 'native',
        attachmentIds: [],
        createdAt: '2026-02-28T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      },
    ];

    await page.route('/api/drills*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/drills') {
        await route.fallback();
        return;
      }

      const query = (url.searchParams.get('query') ?? '').toLowerCase();
      const items = drills.filter(drill => {
        if (!query) {
          return true;
        }

        return `${drill.title} ${drill.summary} ${drill.skillTags.join(' ')}`.toLowerCase().includes(query);
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          total: items.length,
          filters: {
            query: query || undefined,
          },
        }),
      });
    });

    await page.route('/api/planner/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'coach_1',
          email: 'coach@example.com',
          role: 'editor',
          displayName: 'Coach One',
          status: 'active',
          createdAt: '2026-02-28T09:00:00.000Z',
          updatedAt: '2026-02-28T09:00:00.000Z',
        }),
      });
    });
  });

  test('keeps browse-mode startup within the documented target', async ({ page }) => {
    const startedAt = Date.now();

    await page.goto('/');
    await expect(page.locator('#allFilesList .file-item, #allFilesList [data-file-id]').first()).toBeVisible({
      timeout: 5000,
    });

    const loadDurationMs = Date.now() - startedAt;
    expect(loadDurationMs).toBeLessThan(5000);
  });

  test('keeps drill catalog search responsive within the documented debounce budget', async ({ page }) => {
    await page.goto('/#/drills');
    await expect(page.locator('[data-drill-card]')).toHaveCount(2);

    const elapsedMs = await page.evaluate(async () => {
      const input = document.querySelector('#drillCatalogSearch');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Drill catalog search input was not found.');
      }

      const start = performance.now();
      input.focus();
      input.value = 'laukaus';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      while (performance.now() - start < 2000) {
        const cards = Array.from(document.querySelectorAll('[data-drill-card]'));
        if (
          cards.length === 1 &&
          cards[0]?.textContent?.toLowerCase().includes('peruslaukaus')
        ) {
          return performance.now() - start;
        }

        await new Promise(resolve => window.setTimeout(resolve, 16));
      }

      throw new Error('Drill catalog search did not settle within 2 seconds.');
    });

    expect(elapsedMs).toBeLessThan(250);
  });

  test('keeps browse mode and drill catalog mobile-safe without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/');
    await expect(page.locator('#searchInput')).toBeVisible();
    const browseOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(browseOverflow).toBeLessThanOrEqual(1);

    await page.goto('/#/drills');
    await expect(page.locator('.drill-catalog-filters')).toBeVisible();
    const drillOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(drillOverflow).toBeLessThanOrEqual(1);
  });
});
