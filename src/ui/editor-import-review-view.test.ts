import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlannerAccessState } from '@/state/planner-access-state';
import { EditorDraftState } from '@/state/editor-draft-state';
import { EditorImportReviewView } from '@/ui/editor-import-review-view';

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

function createDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'import_1',
    sourceType: 'pdf' as const,
    sourceFileId: 'drive_1',
    sourceFileName: 'Breakout Drill.pdf',
    extractedTitle: 'Breakout Drill',
    extractedText: 'Players break out under pressure.',
    extractedFields: {
      title: 'Breakout Drill',
      summary: 'Imported summary',
      description: 'Imported description',
      category: 'transition',
      ageGroups: ['U14'],
    },
    confidence: 'medium' as const,
    reviewStatus: 'pending' as const,
    createdAt: '2026-02-28T09:00:00.000Z',
    updatedAt: '2026-02-28T10:00:00.000Z',
    ...overrides,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('EditorImportReviewView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('blocks import review for viewers', async () => {
    const container = document.createElement('div');
    const view = new EditorImportReviewView(container, {
      accessState: new PlannerAccessState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('viewer'),
          permissions: createPermissions('viewer'),
        })),
      } as never,
    });

    await view.mount();

    expect(container.textContent).toContain('Ei oikeutta tarkistaa importteja');
    expect(container.querySelector('[data-import-action="publish"]')).toBeNull();

    view.destroy();
  });

  it('shows queue metadata, persists manual corrections, and publishes a converted import', async () => {
    const container = document.createElement('div');
    const draft = createDraft();
    const approveDraft = vi.fn(async () => ({
      id: 'drill_9',
      slug: 'breakout-drill',
      title: 'Breakout Drill',
      summary: 'Imported summary',
      description: 'Imported description',
      category: 'transition',
      ageGroups: ['U14'],
      skillTags: [],
      equipment: [],
      coachingPoints: [],
      progressionIdeas: [],
      variationIdeas: [],
      status: 'draft',
      sourceType: 'pdf-import',
      sourceFileId: 'drive_1',
      attachmentIds: [],
      createdAt: '2026-02-28T10:05:00.000Z',
      updatedAt: '2026-02-28T10:05:00.000Z',
    }));
    const publishDrill = vi.fn(async () => ({
      id: 'drill_9',
      status: 'published',
    }));
    const importService = {
      listDrafts: vi.fn(async () => ({
        items: [draft],
        total: 1,
        filters: {},
      })),
      getDraft: vi.fn(async () => draft),
      reviewDraft: vi.fn(),
      rejectDraft: vi.fn(),
      approveDraft,
    };

    const view = new EditorImportReviewView(container, {
      accessState: new PlannerAccessState(),
      editorState: new EditorDraftState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      importService: importService as never,
      drillService: {
        publishDrill,
      } as never,
    });

    await view.mount();
    await flushPromises();

    expect(container.textContent).toContain('Keskitasoinen varmuus');
    expect(container.textContent).toContain('Odottaa');
    expect(container.textContent).toContain('Jarjestelman ehdotus');
    expect(container.textContent).toContain('Ihmisen korjaus');

    const summaryField = container.querySelector('[data-import-field="summary"]') as HTMLInputElement;
    summaryField.value = 'Korjattu yhteenveto';
    summaryField.dispatchEvent(new Event('input', { bubbles: true }));

    const notesField = container.querySelector('[data-import-field="reviewNotes"]') as HTMLTextAreaElement;
    notesField.value = 'Valmis julkaistavaksi.';
    notesField.dispatchEvent(new Event('input', { bubbles: true }));

    container.querySelector('[data-import-action="publish"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(approveDraft).toHaveBeenCalledWith('import_1', {
      reviewNotes: 'Valmis julkaistavaksi.',
      drill: expect.objectContaining({
        title: 'Breakout Drill',
        summary: 'Korjattu yhteenveto',
        category: 'transition',
      }),
    });
    expect(publishDrill).toHaveBeenCalledWith('drill_9');
    expect(container.textContent).toContain('Importti julkaistiin harjoitekatalogiin');
    expect(window.localStorage.getItem('hawks.editor.import-review.v1:import_1')).toBeNull();

    view.destroy();
  });

  it('validates required corrected fields before publish', async () => {
    const container = document.createElement('div');
    const view = new EditorImportReviewView(container, {
      accessState: new PlannerAccessState(),
      editorState: new EditorDraftState(),
      authService: {
        getCurrentPermissions: vi.fn(async () => ({
          profile: createProfile('admin'),
          permissions: createPermissions('admin'),
        })),
      } as never,
      importService: {
        listDrafts: vi.fn(async () => ({
          items: [createDraft({ extractedFields: {}, extractedText: '' })],
          total: 1,
          filters: {},
        })),
        getDraft: vi.fn(async () => createDraft({ extractedFields: {}, extractedText: '' })),
        reviewDraft: vi.fn(),
        rejectDraft: vi.fn(),
        approveDraft: vi.fn(),
      } as never,
      drillService: {
        publishDrill: vi.fn(),
      } as never,
    });

    await view.mount();
    await flushPromises();

    container.querySelector('[data-import-action="publish"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(container.textContent).toContain('Korjaa pakolliset kentat ennen julkaisua');
    expect(container.textContent).toContain('Tama kentta on pakollinen');
    expect(container.textContent).toContain('Manuaalinen tarkistus kesken');

    view.destroy();
  });
});
