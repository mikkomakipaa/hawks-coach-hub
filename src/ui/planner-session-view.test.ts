import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlannerSessionRecoveryStore } from '@/services/planner-session-recovery-store';
import { PlannerDraftState } from '@/state/planner-draft-state';
import { PlannerDraftView } from '@/ui/planner-draft-view';
import { PlannerSessionListView } from '@/ui/planner-session-list-view';
import { SharedSessionView } from '@/ui/shared-session-view';

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('planner session views', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
    window.location.hash = '#/';
  });

  it('lists saved sessions and exposes a local draft recovery entry point', async () => {
    const recoveryStore = new PlannerSessionRecoveryStore();
    recoveryStore.saveDraft({
      id: 'session_draft',
      name: 'Paikallinen luonnos',
      group: 'U12',
      date: '2026-03-05',
      ownerUserId: 'local-draft',
      coachLabel: 'Coach',
      targetDurationMin: 60,
      totalDurationMin: 22,
      status: 'draft',
      visibility: 'private',
      blocks: [],
      createdAt: '2026-02-28T10:00:00.000Z',
      updatedAt: '2026-02-28T10:00:00.000Z',
    });

    const container = document.createElement('div');
    const view = new PlannerSessionListView(
      container,
      {
        listSessions: vi.fn(async () => ({
          items: [
            {
              id: 'session_1',
              name: 'Game Day Prep',
              group: 'U14',
              date: '2026-03-10',
              ownerUserId: 'coach_1',
              coachLabel: 'Coach One',
              targetDurationMin: 60,
              totalDurationMin: 54,
              status: 'draft',
              visibility: 'private',
              blockCount: 3,
              createdAt: '2026-02-28T10:00:00.000Z',
              updatedAt: '2026-02-28T10:05:00.000Z',
            },
          ],
          total: 1,
        })),
      } as never,
      undefined,
      recoveryStore,
    );

    await view.mount();

    expect(container.textContent).toContain('Game Day Prep');
    expect(container.textContent).toContain('Paikallinen luonnos loytyi');
    expect(container.textContent).toContain('Viimeksi kaytetyt harjoitteet');
    expect(container.querySelector('a[href="#/plan/session_1"]')).toBeTruthy();

    view.destroy();
  });

  it('renders a useful empty state when no saved sessions exist', async () => {
    const container = document.createElement('div');
    const view = new PlannerSessionListView(
      container,
      {
        listSessions: vi.fn(async () => ({
          items: [],
          total: 0,
        })),
      } as never,
    );

    await view.mount();

    expect(container.textContent).toContain('Ei viela tallennettuja suunnitelmia');
    expect(container.textContent).toContain('Viimeksi kaytetyt harjoitteet');
    expect(container.querySelector('a[href="#/plan/new"]')).toBeTruthy();

    view.destroy();
  });

  it('saves a planner session, reuses the persisted id, and creates a share link', async () => {
    const draftState = new PlannerDraftState();
    draftState.addCustomBlock();
    draftState.updateSessionDetails({
      name: 'Treeni-ilta',
      group: 'U14',
      date: '2026-03-12',
      coachLabel: 'Coach One',
      targetDurationMin: 70,
    });

    const service = {
      createSession: vi.fn(async () => ({
        id: 'session_1',
        name: 'Treeni-ilta',
        group: 'U14',
        date: '2026-03-12',
        ownerUserId: 'coach_1',
        coachLabel: 'Coach One',
        targetDurationMin: 70,
        totalDurationMin: 10,
        status: 'draft',
        visibility: 'private',
        blocks: [
          {
            id: 'session_block_1',
            order: 1,
            type: 'custom',
            title: 'Lohko 1',
            durationMin: 10,
            notes: '',
          },
        ],
        createdAt: '2026-02-28T10:00:00.000Z',
        updatedAt: '2026-02-28T10:00:00.000Z',
      })),
      createShareLink: vi.fn(async () => ({
        sessionId: 'session_1',
        shareId: 'share_1',
        visibility: 'shared',
        shareUrl: '/session/share_1',
        updatedAt: '2026-02-28T10:05:00.000Z',
      })),
    };

    const container = document.createElement('div');
    const view = new PlannerDraftView(container, draftState, {
      service: service as never,
    });

    window.location.hash = '#/plan/new';
    await view.mount();

    container.querySelector('[data-planner-action="save"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(service.createSession).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/plan/session_1');

    container.querySelector('[data-planner-action="share"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(service.createShareLink).toHaveBeenCalledWith('session_1');
    expect(container.querySelector('a[href="#/session/share_1"]')).toBeTruthy();

    view.destroy();
  });

  it('filters the mock drill list and adds a drill into the planner draft', async () => {
    const draftState = new PlannerDraftState();
    const container = document.createElement('div');
    const view = new PlannerDraftView(container, draftState, {
      service: {
        createSession: vi.fn(),
      } as never,
    });

    await view.mount();

    const searchInput = container.querySelector<HTMLInputElement>('[data-planner-ui-field="drillQuery"]');
    expect(searchInput).toBeTruthy();

    searchInput!.value = 'kulma';
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(container.textContent).toContain('Kulmataistelu');
    expect(container.textContent).not.toContain('Kolmiosyotto paineella');

    container
      .querySelector<HTMLElement>('[data-planner-action="add-mock-drill"][data-drill-id="drill_corner-battle"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(container.textContent).toContain('Kulmataistelu lisattiin harjoitukseen');
    expect(draftState.getSnapshot()?.blocks[0]?.title).toBe('Kulmataistelu');

    view.destroy();
  });

  it('keeps planner tester notes editable without affecting block actions', async () => {
    const draftState = new PlannerDraftState();
    draftState.addCustomBlock();

    const container = document.createElement('div');
    const view = new PlannerDraftView(container, draftState);

    await view.mount();

    const testerNotes = container.querySelector<HTMLTextAreaElement>('[data-planner-ui-field="testerNotes"]');
    expect(testerNotes).toBeTruthy();

    testerNotes!.value = 'Tarkista 375px mobiili ilman vaakascrollia.';
    testerNotes!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(container.textContent).toContain('Mika on aitoa, mika mockattu');
    expect(testerNotes?.value).toContain('375px mobiili');
    expect(container.querySelector('[data-planner-action="move-down"]')).toBeTruthy();

    view.destroy();
  });

  it('keeps a recoverable draft when save fails', async () => {
    const draftState = new PlannerDraftState();
    draftState.addCustomBlock();
    draftState.updateSessionDetails({ name: 'Epaonnistuva tallennus' });

    const container = document.createElement('div');
    const view = new PlannerDraftView(container, draftState, {
      service: {
        createSession: vi.fn(async () => {
          throw new Error('Backend unavailable.');
        }),
      } as never,
      recoveryStore: new PlannerSessionRecoveryStore(),
    });

    await view.mount();
    container.querySelector('[data-planner-action="save"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(container.textContent).toContain('Tallennus epaonnistui');
    expect(window.localStorage.getItem('hawks.planner.session-recovery.v1')).toContain('Epaonnistuva tallennus');

    view.destroy();
  });

  it('renders the shared session view and opens a print window', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
    } as unknown as Window));

    const container = document.createElement('div');
    const view = new SharedSessionView(
      container,
      'share_1',
      {
        getSharedSession: vi.fn(async () => ({
          shareId: 'share_1',
          sessionId: 'session_1',
          canView: true,
          session: {
            id: 'session_1',
            name: 'Jaettu treeni',
            group: 'U14',
            date: '2026-03-10',
            ownerUserId: 'coach_1',
            coachLabel: 'Coach One',
            targetDurationMin: 60,
            totalDurationMin: 54,
            status: 'draft',
            visibility: 'shared',
            shareId: 'share_1',
            blocks: [
              {
                id: 'session_block_1',
                order: 1,
                type: 'drill',
                title: 'Syottoralli',
                durationMin: 12,
                notes: 'Pallo liikkeelle nopeasti',
              },
            ],
            createdAt: '2026-02-28T10:00:00.000Z',
            updatedAt: '2026-02-28T10:00:00.000Z',
          },
        })),
      } as never,
    );

    await view.mount();

    expect(container.textContent).toContain('Jaettu treeni');
    expect(container.textContent).toContain('Syottoralli');

    container.querySelector('[data-share-action="print"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(openSpy).toHaveBeenCalledTimes(1);

    view.destroy();
    openSpy.mockRestore();
  });
});
