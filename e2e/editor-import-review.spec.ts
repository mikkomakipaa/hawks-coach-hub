import { expect, test } from '@playwright/test';

test.describe('Editor import review flow', () => {
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

    await page.route('/api/editor/imports', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'import_1',
              sourceType: 'pdf',
              sourceFileId: 'drive_1',
              sourceFileName: 'Breakout Drill.pdf',
              extractedTitle: 'Breakout Drill',
              extractedText: 'Players break out under pressure.',
              extractedFields: {
                title: 'Breakout Drill',
                summary: 'Imported summary',
                description: 'Imported description',
                category: 'Transition',
              },
              confidence: 'medium',
              reviewStatus: 'pending',
              createdAt: '2026-02-28T10:00:00.000Z',
              updatedAt: '2026-02-28T10:00:00.000Z',
            },
          ],
          total: 1,
          filters: {},
        }),
      });
    });

    await page.route('/api/editor/imports/import_1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'import_1',
          sourceType: 'pdf',
          sourceFileId: 'drive_1',
          sourceFileName: 'Breakout Drill.pdf',
          extractedTitle: 'Breakout Drill',
          extractedText: 'Players break out under pressure.',
          extractedFields: {
            title: 'Breakout Drill',
            summary: 'Imported summary',
            description: 'Imported description',
            category: 'Transition',
          },
          confidence: 'medium',
          reviewStatus: 'pending',
          createdAt: '2026-02-28T10:00:00.000Z',
          updatedAt: '2026-02-28T10:00:00.000Z',
        }),
      });
    });

    await page.route('/api/editor/imports/import_1/approve', async route => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'drill_from_import_1',
          slug: 'breakout-drill',
          title: (body.drill as Record<string, unknown>)?.title ?? 'Breakout Drill',
          summary: (body.drill as Record<string, unknown>)?.summary ?? 'Imported summary',
          description: (body.drill as Record<string, unknown>)?.description ?? 'Imported description',
          category: (body.drill as Record<string, unknown>)?.category ?? 'Transition',
          ageGroups: [],
          skillTags: [],
          equipment: [],
          coachingPoints: [],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'draft',
          sourceType: 'pdf-import',
          sourceFileId: 'drive_1',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:10:00.000Z',
          updatedAt: '2026-02-28T10:10:00.000Z',
        }),
      });
    });

    await page.route('/api/editor/drills/drill_from_import_1/publish', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'drill_from_import_1',
          slug: 'breakout-drill',
          title: 'Breakout Drill',
          summary: 'Korjattu yhteenveto',
          description: 'Imported description',
          category: 'Transition',
          ageGroups: [],
          skillTags: [],
          equipment: [],
          coachingPoints: [],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'published',
          sourceType: 'pdf-import',
          sourceFileId: 'drive_1',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:10:00.000Z',
          updatedAt: '2026-02-28T10:12:00.000Z',
        }),
      });
    });
  });

  test('lets an admin correct, publish, and reopen a converted import drill', async ({ page }) => {
    await page.goto('/#/editor/imports');

    await expect(page.locator('.editor-import-view')).toContainText('Breakout Drill.pdf');
    await expect(page.locator('.editor-import-view')).toContainText('Jarjestelman ehdotus + ihmisen korjaus');
    await expect(page.locator('.editor-import-view')).toContainText('Alla oleva lomake muodostaa julkaistavan drill-rivin');

    await page.locator('[data-import-field="summary"]').fill('Korjattu yhteenveto');
    await page.locator('[data-import-field="reviewNotes"]').fill('Valmis julkaistavaksi.');
    await page.locator('[data-import-action="publish"]').click();

    await expect(page.locator('.editor-import-view')).toContainText('Importti julkaistiin harjoitekatalogiin');
    await expect(page.getByRole('link', { name: 'Avaa harjoiteluonnos' })).toHaveAttribute(
      'href',
      '#/editor/drills/drill_from_import_1/edit',
    );
  });

  test('blocks viewers from the import review queue', async ({ page }) => {
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

    await page.goto('/#/editor/imports');

    await expect(page.locator('.drill-detail-error')).toContainText('Ei oikeutta tarkistaa importteja');
    await expect(page.locator('[data-import-action="publish"]')).toHaveCount(0);
  });
});
