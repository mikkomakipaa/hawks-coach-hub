import { expect, test } from '@playwright/test';

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
  {
    id: 'drill_3',
    slug: 'syottokolmio',
    title: 'Syottokolmio',
    summary: 'Nopea syotto ja liike pienessa tilassa.',
    description: 'Kuvaus',
    category: 'Syotot',
    intensityLevel: 'low',
    ageGroups: ['U14'],
    skillTags: ['syotto'],
    durationMin: 8,
    playerCountMin: 3,
    playerCountMax: 5,
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

test.describe('Drill catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/drills*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/drills') {
        await route.fallback();
        return;
      }

      const query = url.searchParams.get('query')?.toLowerCase() ?? '';
      const category = url.searchParams.get('category') ?? '';

      const items = drills.filter(drill => {
        if (category && drill.category !== category) {
          return false;
        }

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
            category: category || undefined,
            query: query || undefined,
          },
        }),
      });
    });

    await page.route('/api/drills/*', async route => {
      const slug = decodeURIComponent(route.request().url().split('/').pop() || '');
      const drill = drills.find(item => item.slug === slug || item.id === slug);

      if (!drill) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: 'Drill not found.',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...drill,
          coachingPoints: ['Sulje tila nopeasti', 'Ajoita suunnanmuutos'],
          equipment: ['Pallot', 'Kartiot'],
          setupInstructions: 'Rakenna kaksi kulmapistetta ja yksi viimeistelyalue.',
          attachments: [
            {
              id: 'attachment_1',
              drillId: drill.id,
              type: 'pdf',
              title: `${drill.title} PDF`,
              url: 'https://example.com/drill.pdf',
              sortOrder: 1,
            },
          ],
        }),
      });
    });
  });

  test('lets coaches narrow drills quickly from the catalog route', async ({ page }) => {
    await page.goto('/#/drills');

    await expect(page.locator('[data-drill-card]')).toHaveCount(3);
    await page.locator('#drillCatalogSearch').fill('laukaus');
    await expect(page.locator('[data-drill-card]')).toHaveCount(1);
    await expect(page.locator('[data-drill-card]')).toContainText(['Peruslaukaus']);

    await page.locator('#drillCatalogSearch').clear();
    await page.locator('#drillCatalogAgeGroup').selectOption('U14');
    await expect(page.locator('[data-drill-card]')).toHaveCount(2);

    await page.locator('#drillCatalogIntensity').selectOption('high');
    await expect(page.locator('[data-drill-card]')).toHaveCount(1);
    await expect(page.locator('[data-drill-card]')).toContainText(['Kulmataistelu']);

    await page.locator('#drillCatalogIntensity').selectOption('');
    await page.locator('#drillCatalogSkillTag').selectOption('syotto');
    await expect(page.locator('[data-drill-card]')).toHaveCount(1);
    await expect(page.locator('[data-drill-card]')).toContainText(['Syottokolmio']);
  });

  test('keeps the catalog mobile-safe without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/drills');

    await expect(page.locator('.drill-catalog-filters')).toBeVisible();
    await expect(page.locator('[data-drill-card]')).toHaveCount(3);

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('opens drill detail and carries the drill into a planner draft', async ({ page }) => {
    await page.goto('/#/drills/kulmataistelu');

    await expect(page.getByRole('heading', { name: 'Kulmataistelu' })).toBeVisible();
    await expect(page.locator('.drill-detail-summary-card')).toContainText(['Valitse harjoite session rungoksi']);
    await expect(page.locator('.drill-detail-meta')).toContainText(['Kamppailu', '12 min']);
    await expect(page.locator('.drill-detail-panel-attachments')).toContainText(['Kulmataistelu PDF']);

    await page.getByRole('button', { name: 'Lisaa suunnitelmaan' }).click();

    await expect(page).toHaveURL(/#\/plan\/new$/);
    await expect(page.locator('[data-planner-block-id]')).toHaveCount(1);
    await expect(page.locator('.planner-draft-blocks')).toContainText(['Kulmataistelu']);
  });

  test('shows partial-data placeholders when media is missing', async ({ page }) => {
    await page.route('/api/drills/peruslaukaus', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...drills[1],
          description: '',
          setupInstructions: '',
          attachments: [],
        }),
      });
    });

    await page.goto('/#/drills/peruslaukaus');

    await expect(page.locator('.drill-detail-media-placeholder')).toContainText(['Visuaali tulossa']);
    await expect(page.locator('.drill-detail-layout')).toContainText(['Ei erillista asettelukuvausta']);
    await expect(page.locator('.drill-detail-panel-attachments')).toContainText(['jokainen harjoite ei viela sisalla mediaa']);
  });
});
