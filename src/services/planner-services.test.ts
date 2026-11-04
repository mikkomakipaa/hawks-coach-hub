import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DrillCatalogService, EditorDrillService } from '@/services/drill-catalog-service';
import { ImportReviewService } from '@/services/import-review-service';
import { PlannerApiClient, PlannerApiError } from '@/services/planner-api-client';
import { PlannerAuthService } from '@/services/planner-auth-service';
import { SessionPlannerService } from '@/services/session-planner-service';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('planner services', () => {
  let client: PlannerApiClient;

  beforeEach(() => {
    vi.clearAllMocks();

    client = new PlannerApiClient({
      fetchImpl: mockFetch,
      getIdentityHeaders: () => ({
        userId: 'coach_1',
        email: 'coach@example.com',
        role: 'editor',
        displayName: 'Coach One',
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds query strings and planner identity headers for drill catalog requests', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          total: 0,
          filters: {
            query: 'passing',
            category: 'transition',
            status: 'draft',
          },
        }),
        { status: 200 },
      ),
    );

    const service = new DrillCatalogService(client);
    await service.listDrills({
      query: 'passing',
      category: 'transition',
      status: 'draft',
      includeDrafts: true,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/api/drills?category=transition&query=passing&status=draft&includeDrafts=true');
    expect((mockFetch.mock.calls[0]?.[1] as RequestInit).headers).toBeInstanceOf(Headers);

    const headers = mockFetch.mock.calls[0]?.[1] as RequestInit;
    expect((headers.headers as Headers).get('x-planner-user-id')).toBe('coach_1');
    expect((headers.headers as Headers).get('x-planner-role')).toBe('editor');
  });

  it('maps API failures into typed planner errors', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Session payload is invalid.',
            details: [{ field: 'name', message: 'Must be a non-empty string.' }],
          },
        }),
        { status: 400 },
      ),
    );

    const service = new SessionPlannerService(client);

    await expect(service.createSession({
      name: '',
      group: 'U14',
      date: '2026-03-10',
    })).rejects.toMatchObject<Partial<PlannerApiError>>({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'name', message: 'Must be a non-empty string.' }],
    });
  });

  it('creates and publishes editor drill drafts through canonical DTOs', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'drill_1',
            slug: 'passing-circle',
            title: 'Passing Circle',
            summary: 'Quick touches',
            description: 'Rotate and pass under pressure.',
            category: 'passing',
            ageGroups: [],
            skillTags: [],
            equipment: [],
            coachingPoints: [],
            progressionIdeas: [],
            variationIdeas: [],
            status: 'draft',
            sourceType: 'native',
            attachmentIds: [],
            attachments: [],
            createdAt: '2026-02-28T10:00:00.000Z',
            updatedAt: '2026-02-28T10:00:00.000Z',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'drill_1',
            slug: 'passing-circle',
            title: 'Passing Circle',
            summary: 'Quick touches',
            description: 'Rotate and pass under pressure.',
            category: 'passing',
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
          { status: 200 },
        ),
      );

    const service = new EditorDrillService(client);
    const draft = await service.createDraft({
      title: 'Passing Circle',
      summary: 'Quick touches',
      description: 'Rotate and pass under pressure.',
      category: 'passing',
      sourceType: 'native',
    });
    const published = await service.publishDrill(draft.id);

    expect(draft.status).toBe('draft');
    expect(published.status).toBe('published');
    expect(mockFetch.mock.calls[1]?.[0]).toBe('/api/editor/drills/drill_1/publish');
  });

  it('loads draft drill detail through the includeDrafts contract', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'drill_2',
          slug: 'editor-draft',
          title: 'Editor Draft',
          summary: 'Summary',
          description: 'Description',
          category: 'passing',
          ageGroups: [],
          skillTags: [],
          equipment: [],
          coachingPoints: [],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'draft',
          sourceType: 'native',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-28T10:00:00.000Z',
          updatedAt: '2026-02-28T10:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const service = new EditorDrillService(client);
    const detail = await service.getDraft('drill_2');

    expect(detail.status).toBe('draft');
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/api/drills/drill_2?includeDrafts=true');
  });

  it('handles import review and session share routes through vendor-neutral contracts', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'import_draft_1',
            sourceType: 'pdf',
            extractedFields: {},
            confidence: 'medium',
            reviewStatus: 'reviewed',
            createdAt: '2026-02-28T13:00:00.000Z',
            updatedAt: '2026-02-28T13:10:00.000Z',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sessionId: 'session_1',
            shareId: 'share_1',
            visibility: 'shared',
            shareUrl: '/session/share_1',
            updatedAt: '2026-02-28T12:10:00.000Z',
          }),
          { status: 200 },
        ),
      );

    const importService = new ImportReviewService(client);
    const sessionService = new SessionPlannerService(client);

    const reviewed = await importService.reviewDraft('import_draft_1', {
      reviewNotes: 'Looks good.',
    });
    const shared = await sessionService.createShareLink('session_1');

    expect(reviewed.reviewStatus).toBe('reviewed');
    expect(shared.shareUrl).toBe('/session/share_1');
  });

  it('approves import drafts through canonical DTOs', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'drill_44',
          slug: 'imported-breakout',
          title: 'Imported Breakout',
          summary: 'Cleaned summary',
          description: 'Cleaned description',
          category: 'transition',
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
          createdAt: '2026-02-28T13:00:00.000Z',
          updatedAt: '2026-02-28T13:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const importService = new ImportReviewService(client);
    const approved = await importService.approveDraft('import_draft_44', {
      reviewNotes: 'Ready for publish.',
      drill: {
        title: 'Imported Breakout',
        summary: 'Cleaned summary',
        description: 'Cleaned description',
        category: 'transition',
      },
    });

    expect(approved.sourceType).toBe('pdf-import');
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/api/editor/imports/import_draft_44/approve');
  });

  it('computes permission flags from planner profiles', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'admin_1',
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Admin',
          status: 'active',
          createdAt: '2026-02-20T09:00:00.000Z',
          updatedAt: '2026-02-20T09:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const service = new PlannerAuthService(client);
    const result = await service.getCurrentPermissions();

    expect(result.profile.role).toBe('admin');
    expect(result.permissions.canPublishDrills).toBe(true);
    expect(result.permissions.canApproveImports).toBe(true);
  });
});
