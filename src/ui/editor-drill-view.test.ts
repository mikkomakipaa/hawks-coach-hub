import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlannerApiError } from '@/services/planner-api-client';
import { PlannerAccessState } from '@/state/planner-access-state';
import { EditorDraftState } from '@/state/editor-draft-state';
import { EditorDrillView, validateEditorDrillForm } from '@/ui/editor-drill-view';

function createProfile(role: 'viewer' | 'editor' | 'admin') {
  return {
    id: `${role}_1`,
    email: `${role}@example.com`,
    role,
    displayName: role,
    status: 'active' as const,
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-02-28T09:00:00.000Z',
  };
}

function createPermissions(role: 'viewer' | 'editor' | 'admin') {
  return {
    role,
    canViewPlanner: true,
    canManageSessions: true,
    canEditDrills: role !== 'viewer',
    canPublishDrills: role === 'admin',
    canReviewImports: role !== 'viewer',
    canApproveImports: role === 'admin',
  };
}

function createDraftDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'drill_1',
    slug: 'syottokolmio',
    title: 'Syottokolmio',
    summary: 'Nopea syotto pienessa tilassa.',
    description: 'Kolmen pelaajan syottorytmi paineen alla.',
    category: 'Syotot',
    intensityLevel: 'medium',
    ageGroups: ['U14'],
    skillTags: ['syotto'],
    durationMin: 12,
    playerCountMin: 3,
    playerCountMax: 6,
    equipment: ['Pallot'],
    coachingPoints: ['Skannaa ennen vastaanottoa'],
    setupInstructions: 'Muodosta kolmio.',
    progressionIdeas: ['Lisaa puolustaja'],
    variationIdeas: ['Vaihtuva syottosuunta'],
    status: 'draft',
    sourceType: 'native',
    attachmentIds: [],
    attachments: [],
    createdAt: '2026-02-28T10:00:00.000Z',
    updatedAt: '2026-02-28T10:00:00.000Z',
    ...overrides,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('validateEditorDrillForm', () => {
  it('returns required field and numeric validation errors before publish', () => {
    const result = validateEditorDrillForm(
      {
        title: '',
        slug: '',
        summary: '',
        description: '',
        category: '',
        intensityLevel: '',
        ageGroups: '',
        skillTags: '',
        durationMin: 'x',
        playerCountMin: '6',
        playerCountMax: '4',
        equipment: '',
        coachingPoints: '',
        setupInstructions: '',
        progressionIdeas: '',
        variationIdeas: '',
        primaryImageUrl: '',
      },
      { forPublish: true },
    );

    expect(result.summary).toContain('julkaisua');
    expect(result.errors.title).toBeDefined();
    expect(result.errors.summary).toBeDefined();
    expect(result.errors.durationMin).toContain('kokonaislukua');
    expect(result.errors.playerCountMax).toContain('Enimmaispelaajamaara');
  });
});

describe('EditorDrillView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '#/';
  });

  it('blocks write actions for viewers', async () => {
    const container = document.createElement('div');
    const accessState = new PlannerAccessState();
    const authService = {
      getCurrentPermissions: vi.fn(async () => ({
        profile: createProfile('viewer'),
        permissions: createPermissions('viewer'),
      })),
    };

    const view = new EditorDrillView(container, {
      mode: 'new',
      accessState,
      authService: authService as never,
    });

    await view.mount();

    expect(container.textContent).toContain('Ei oikeutta muokata harjoitteita');
    expect(container.querySelector('[data-editor-action="save"]')).toBeNull();

    view.destroy();
  });

  it('surfaces invalid fields before publish', async () => {
    const container = document.createElement('div');
    const view = new EditorDrillView(container, {
      mode: 'new',
      accessState: new PlannerAccessState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      drillService: {
        createDraft: vi.fn(),
        updateDraft: vi.fn(),
        publishDrill: vi.fn(),
        getDraft: vi.fn(),
      } as never,
    });

    await view.mount();

    (container.querySelector('[data-editor-field="playerCountMin"]') as HTMLInputElement).value = '8';
    container.querySelector('[data-editor-field="playerCountMin"]')?.dispatchEvent(new Event('input', { bubbles: true }));
    (container.querySelector('[data-editor-field="playerCountMax"]') as HTMLInputElement).value = '4';
    container.querySelector('[data-editor-field="playerCountMax"]')?.dispatchEvent(new Event('input', { bubbles: true }));

    container.querySelector('[data-editor-action="publish"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(container.textContent).toContain('Korjaa pakolliset kentat ennen julkaisua');
    expect(container.textContent).toContain('Tama kentta on pakollinen');
    expect(container.textContent).toContain('Enimmaispelaajamaara');
    expect(container.textContent).toContain('Julkaisuvalmius');

    view.destroy();
  });

  it('renders editor-only framing, readiness, and mocked attachment area for internal review', async () => {
    const container = document.createElement('div');
    const view = new EditorDrillView(container, {
      mode: 'edit',
      drillId: 'drill_1',
      accessState: new PlannerAccessState(),
      editorState: new EditorDraftState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      drillService: {
        createDraft: vi.fn(),
        updateDraft: vi.fn(),
        publishDrill: vi.fn(),
        getDraft: vi.fn(async () => createDraftDetail()),
      } as never,
    });

    await view.mount();

    expect(container.textContent).toContain('Editorin testiversio');
    expect(container.textContent).toContain('Valmentajille ei nay');
    expect(container.textContent).toContain('Julkaisun tarkistus');
    expect(container.textContent).toContain('Mockattu liitealue sisaiselle testille');
    expect(container.textContent).toContain('Liitteita ei ole viela kytketty');

    view.destroy();
  });

  it('creates and publishes a native drill for admins', async () => {
    const container = document.createElement('div');
    const createDraft = vi.fn(async () => createDraftDetail());
    const publishDrill = vi.fn(async () => createDraftDetail({ status: 'published' }));

    const view = new EditorDrillView(container, {
      mode: 'new',
      accessState: new PlannerAccessState(),
      editorState: new EditorDraftState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      drillService: {
        createDraft,
        updateDraft: vi.fn(),
        publishDrill,
        getDraft: vi.fn(),
      } as never,
    });

    await view.mount();

    const fieldValues: Record<string, string> = {
      title: 'Syottokolmio',
      summary: 'Nopea syotto pienessa tilassa.',
      description: 'Kolmen pelaajan syottorytmi paineen alla.',
      category: 'Syotot',
    };

    for (const [field, value] of Object.entries(fieldValues)) {
      (container.querySelector(`[data-editor-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement).value = value;
      container.querySelector(`[data-editor-field="${field}"]`)?.dispatchEvent(new Event('input', { bubbles: true }));
    }

    container.querySelector('[data-editor-action="publish"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(publishDrill).toHaveBeenCalledWith('drill_1');
    expect(window.location.hash).toBe('#/editor/drills/drill_1/edit');

    view.destroy();
  });

  it('shows unauthorized and forbidden API failures explicitly', async () => {
    const container = document.createElement('div');
    const view = new EditorDrillView(container, {
      mode: 'new',
      accessState: new PlannerAccessState(),
      editorState: new EditorDraftState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      drillService: {
        createDraft: vi.fn(async () => createDraftDetail()),
        updateDraft: vi.fn(),
        publishDrill: vi.fn(async () => {
          throw new PlannerApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
        }),
        getDraft: vi.fn(),
      } as never,
    });

    await view.mount();

    const fieldValues: Record<string, string> = {
      title: 'Syottokolmio',
      summary: 'Nopea syotto pienessa tilassa.',
      description: 'Kolmen pelaajan syottorytmi paineen alla.',
      category: 'Syotot',
    };

    for (const [field, value] of Object.entries(fieldValues)) {
      (container.querySelector(`[data-editor-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement).value = value;
      container.querySelector(`[data-editor-field="${field}"]`)?.dispatchEvent(new Event('input', { bubbles: true }));
    }

    container.querySelector('[data-editor-action="publish"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(container.textContent).toContain('Sinulla ei ole oikeutta julkaista harjoitteita');

    view.destroy();
  });
});
