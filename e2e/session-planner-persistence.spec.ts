import { expect, test } from '@playwright/test';

test.describe('Session planner persistence', () => {
  test.beforeEach(async ({ page }) => {
    let savedSession = {
      id: 'session_1',
      name: 'Game Day Prep',
      group: 'U14',
      date: '2026-03-10',
      ownerUserId: 'coach_1',
      coachLabel: 'Coach One',
      targetDurationMin: 60,
      totalDurationMin: 12,
      status: 'draft',
      visibility: 'private',
      blocks: [
        {
          id: 'session_block_1',
          order: 1,
          type: 'custom',
          title: 'Lohko 1',
          durationMin: 12,
          notes: '',
        },
      ],
      createdAt: '2026-02-28T10:00:00.000Z',
      updatedAt: '2026-02-28T10:00:00.000Z',
    };

    await page.route('/api/sessions', async route => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                ...savedSession,
                blockCount: savedSession.blocks.length,
              },
            ],
            total: 1,
          }),
        });
        return;
      }

      if (method === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        const blocks = Array.isArray(body.blocks) ? body.blocks : savedSession.blocks;
        savedSession = {
          ...savedSession,
          ...body,
          id: 'session_1',
          visibility: 'private',
          blocks,
          totalDurationMin: typeof body.totalDurationMin === 'number' ? body.totalDurationMin : savedSession.totalDurationMin,
        };

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(savedSession),
        });
        return;
      }

      await route.fallback();
    });

    await page.route('/api/sessions/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path === '/api/sessions/session_1' && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedSession),
        });
        return;
      }

      if (path === '/api/sessions/session_1' && method === 'PATCH') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        const blocks = Array.isArray(body.blocks) ? body.blocks : savedSession.blocks;
        savedSession = {
          ...savedSession,
          ...body,
          blocks,
          totalDurationMin: typeof body.totalDurationMin === 'number' ? body.totalDurationMin : savedSession.totalDurationMin,
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedSession),
        });
        return;
      }

      if (path === '/api/sessions/session_1/share' && method === 'POST') {
        savedSession = {
          ...savedSession,
          visibility: 'shared',
          shareId: 'share_1',
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'session_1',
            shareId: 'share_1',
            visibility: 'shared',
            shareUrl: '/session/share_1',
            updatedAt: '2026-02-28T10:05:00.000Z',
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.route('/api/shared-sessions/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shareId: 'share_1',
          sessionId: 'session_1',
          canView: true,
          session: savedSession,
        }),
      });
    });
  });

  test('saves, reopens, and shares a session', async ({ page }) => {
    await page.goto('/#/plan/new');

    await page.getByRole('button', { name: 'Lisaa suunnitelmaan' }).first().click();
    await page.locator('[data-session-field="name"]').fill('Game Day Prep');
    await page.locator('[data-session-field="group"]').fill('U14');
    await page.getByRole('button', { name: 'Tallenna suunnitelma' }).click();

    await expect(page).toHaveURL(/#\/plan\/session_1$/);
    await expect(page.locator('.planner-inline-banner-success')).toContainText('Suunnitelma tallennettiin');

    await page.goto('/#/plan');
    await expect(page.locator('.planner-session-card')).toContainText(['Game Day Prep']);

    await page.getByRole('link', { name: 'Avaa' }).click();
    await expect(page).toHaveURL(/#\/plan\/session_1$/);
    await expect(page.locator('[data-session-field="name"]')).toHaveValue('Game Day Prep');

    await page.getByRole('button', { name: 'Jaa linkki' }).click();
    await expect(page.getByRole('link', { name: 'Avaa jaettu nakyma' })).toBeVisible();

    await page.getByRole('link', { name: 'Avaa jaettu nakyma' }).click();
    await expect(page).toHaveURL(/#\/session\/share_1$/);
    await expect(page.locator('.shared-session-view')).toContainText(['Game Day Prep', 'Kulmataistelu']);
  });

  test('preserves a recoverable draft after a failed save', async ({ page }) => {
    await page.route('/api/sessions', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Tallennus kaatui.',
            },
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/#/plan/new');
    await page.getByRole('button', { name: 'Lisaa tyhja lohko' }).click();
    await page.locator('[data-session-field="name"]').fill('Recovery Session');
    await page.getByRole('button', { name: 'Tallenna suunnitelma' }).click();

    await expect(page.locator('.planner-draft-save-strip')).toContainText('Tallennus epaonnistui');

    const recoveryValue = await page.evaluate(() => window.localStorage.getItem('hawks.planner.session-recovery.v1'));
    expect(recoveryValue).toContain('Recovery Session');
  });

  test('supports mobile-safe planner interactions with mock drill discovery', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#/plan');

    await expect(page.locator('.planner-session-list-view')).toContainText('Viimeksi kaytetyt harjoitteet');
    await page.getByRole('link', { name: 'Uusi suunnitelma' }).first().click();

    await page.locator('[data-planner-ui-field="drillQuery"]').fill('puolustus');
    await expect(page.locator('.planner-draft-drill-card')).toContainText('2v2 puolustuskaista');
    await page.getByRole('button', { name: 'Lisaa suunnitelmaan' }).click();
    await page.locator('[data-planner-ui-field="drillQuery"]').fill('kulma');
    await page.getByRole('button', { name: 'Lisaa suunnitelmaan' }).click();

    await expect(page.locator('.planner-draft-block')).toContainText('2v2 puolustuskaista');
    await page.getByRole('button', { name: 'Siirra ylos' }).nth(1).click();
    await expect(page.locator('.planner-draft-block').first()).toContainText('Kulmataistelu');

    const hasHorizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
