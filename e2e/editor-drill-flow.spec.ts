import { expect, test } from '@playwright/test';

test.describe('Editor drill flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'hawks.planner.identity.v1',
        JSON.stringify({
          userId: 'admin_1',
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Admin',
        }),
      );
    });

    await page.route('/api/planner/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin_1',
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Admin',
          status: 'active',
          createdAt: '2026-02-28T09:00:00.000Z',
          updatedAt: '2026-02-28T09:00:00.000Z',
        }),
      });
    });

    await page.route('/api/editor/drills', async route => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'drill_editor_1',
          slug: 'syottokolmio-paineessa',
          title: body.title,
          summary: body.summary,
          description: body.description,
          category: body.category,
          intensityLevel: body.intensityLevel,
          ageGroups: body.ageGroups || [],
          skillTags: body.skillTags || [],
          durationMin: body.durationMin,
          playerCountMin: body.playerCountMin,
          playerCountMax: body.playerCountMax,
          equipment: body.equipment || [],
          coachingPoints: body.coachingPoints || [],
          setupInstructions: body.setupInstructions,
          progressionIdeas: body.progressionIdeas || [],
          variationIdeas: body.variationIdeas || [],
          status: 'draft',
          sourceType: 'native',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:00:00.000Z',
          updatedAt: '2026-02-28T10:00:00.000Z',
        }),
      });
    });

    await page.route('/api/editor/drills/drill_editor_1/publish', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'drill_editor_1',
          slug: 'syottokolmio-paineessa',
          title: 'Syottokolmio paineessa',
          summary: 'Nopea syotto ja suunnanmuutos.',
          description: 'Kolmioharjoite paineen alla.',
          category: 'Syotot',
          ageGroups: [],
          skillTags: [],
          equipment: [],
          coachingPoints: [],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'published',
          sourceType: 'native',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:00:00.000Z',
          updatedAt: '2026-02-28T10:05:00.000Z',
        }),
      });
    });

    await page.route('/api/drills/drill_editor_1*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'drill_editor_1',
          slug: 'syottokolmio-paineessa',
          title: 'Syottokolmio paineessa',
          summary: 'Nopea syotto ja suunnanmuutos.',
          description: 'Kolmioharjoite paineen alla.',
          category: 'Syotot',
          ageGroups: [],
          skillTags: [],
          equipment: [],
          coachingPoints: [],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'published',
          sourceType: 'native',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:00:00.000Z',
          updatedAt: '2026-02-28T10:05:00.000Z',
        }),
      });
    });
  });

  test('validates and publishes a native drill', async ({ page }) => {
    await page.goto('/#/editor/drills/new');

    await expect(page.locator('.editor-drill-view')).toContainText('Editorin testiversio');
    await expect(page.locator('.editor-drill-view')).toContainText('Mockattu liitealue sisaiselle testille');

    await page.getByRole('button', { name: 'Julkaise' }).click();
    await expect(page.locator('.editor-drill-view')).toContainText('Korjaa pakolliset kentat ennen julkaisua');

    await page.locator('[data-editor-field="title"]').fill('Syottokolmio paineessa');
    await page.locator('[data-editor-field="summary"]').fill('Nopea syotto ja suunnanmuutos.');
    await page.locator('[data-editor-field="description"]').fill('Kolmioharjoite paineen alla.');
    await page.locator('[data-editor-field="category"]').fill('Syotot');
    await page.locator('[data-editor-field="durationMin"]').fill('12');

    await page.getByRole('button', { name: 'Julkaise' }).click();

    await expect(page).toHaveURL(/#\/editor\/drills\/drill_editor_1\/edit$/);
    await expect(page.locator('.editor-drill-view')).toContainText('Harjoite julkaistiin');
    await expect(page.locator('.planner-draft-save-strip')).toContainText('Julkaistu');
    await expect(page.locator('.planner-draft-save-strip')).toContainText('Julkaisuvalmius');
  });

  test('shows unauthorized access without write actions', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'hawks.planner.identity.v1',
        JSON.stringify({
          userId: 'viewer_1',
          email: 'viewer@example.com',
          role: 'viewer',
          displayName: 'Viewer',
        }),
      );
    });

    await page.unroute('/api/planner/me');
    await page.route('/api/planner/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'viewer_1',
          email: 'viewer@example.com',
          role: 'viewer',
          displayName: 'Viewer',
          status: 'active',
          createdAt: '2026-02-28T09:00:00.000Z',
          updatedAt: '2026-02-28T09:00:00.000Z',
        }),
      });
    });

    await page.goto('/#/editor/drills/new');

    await expect(page.locator('.drill-detail-error')).toContainText('Ei oikeutta muokata harjoitteita');
    await expect(page.getByRole('button', { name: 'Tallenna luonnos' })).toHaveCount(0);
  });
});
