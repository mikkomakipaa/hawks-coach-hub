import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'module';

import { DrillCatalogService, EditorDrillService } from '@/services/drill-catalog-service';
import { ImportReviewService } from '@/services/import-review-service';
import { PlannerApiClient } from '@/services/planner-api-client';
import { PlannerAuthService } from '@/services/planner-auth-service';
import { SessionPlannerService } from '@/services/session-planner-service';
import { PlannerAccessState } from '@/state/planner-access-state';
import { PlannerSessionState } from '@/state/planner-session-state';

const require = createRequire(import.meta.url);

const { createDrillRuntime } = require('../../../api/_lib/drills/runtime');
const { createSessionRuntime } = require('../../../api/_lib/planner/runtime');
const { createPlannerProfileRuntime } = require('../../../api/_lib/planner/profile-runtime');
const { createImportRuntime } = require('../../../api/_lib/imports/runtime');
const { createInMemoryDrillRepository } = require('../../../api/_lib/drills/repository');
const { createInMemorySessionRepository } = require('../../../api/_lib/planner/repository');
const { createInMemoryImportDraftRepository } = require('../../../api/_lib/imports/repository');
const { createInMemoryPlannerProfileRepository } = require('../../../api/_lib/auth/repository');

describe('planner frontend services integration', () => {
  let client: PlannerApiClient;
  let fetchImpl: typeof fetch;

  beforeEach(() => {
    let nextId = 1;

    const profileRepository = createInMemoryPlannerProfileRepository({
      profiles: [
        {
          id: 'editor_1',
          email: 'editor@example.com',
          role: 'editor',
          displayName: 'Editor One',
          status: 'active',
          createdAt: '2026-02-20T09:00:00.000Z',
          updatedAt: '2026-02-20T09:00:00.000Z',
        },
        {
          id: 'admin_1',
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Admin One',
          status: 'active',
          createdAt: '2026-02-20T09:00:00.000Z',
          updatedAt: '2026-02-20T09:00:00.000Z',
        },
      ],
    });

    const drillRepository = createInMemoryDrillRepository({
      drills: [
        {
          id: 'drill_seed_1',
          slug: 'passing-circle',
          title: 'Passing Circle',
          summary: 'Quick touches under pressure',
          description: 'Players rotate around a circle.',
          category: 'passing',
          ageGroups: ['U14'],
          skillTags: ['passing'],
          equipment: ['balls'],
          coachingPoints: ['Open your body'],
          progressionIdeas: [],
          variationIdeas: [],
          status: 'published',
          sourceType: 'native',
          attachmentIds: [],
          attachments: [],
          createdAt: '2026-02-27T10:00:00.000Z',
          updatedAt: '2026-02-27T10:10:00.000Z',
        },
      ],
    });

    const sessionRepository = createInMemorySessionRepository();
    const importRepository = createInMemoryImportDraftRepository({
      importDrafts: [
        {
          id: 'import_seed_1',
          sourceType: 'pdf',
          sourceFileId: 'drive_file_1',
          sourceFileName: 'Breakout Drill.pdf',
          extractedTitle: 'Breakout Drill',
          extractedText: 'Players break out under pressure.',
          extractedFields: {
            title: 'Breakout Drill',
            summary: 'Imported summary',
            description: 'Imported description',
            category: 'transition',
          },
          confidence: 'medium',
          reviewStatus: 'pending',
          createdAt: '2026-02-27T13:00:00.000Z',
          updatedAt: '2026-02-27T13:00:00.000Z',
        },
      ],
    });

    const drillRuntime = createDrillRuntime({
      repository: drillRepository,
      profileRepository,
      createId: (prefix: string) => `${prefix}_${nextId++}`,
      now: () => '2026-02-28T10:00:00.000Z',
    });
    const sessionRuntime = createSessionRuntime({
      repository: sessionRepository,
      profileRepository,
      createId: (prefix: string) => `${prefix}_${nextId++}`,
      createShareId: () => 'share_contract_1',
      now: () => '2026-02-28T12:00:00.000Z',
    });
    const profileRuntime = createPlannerProfileRuntime({
      profileRepository,
      now: () => '2026-02-28T09:00:00.000Z',
    });
    const importRuntime = createImportRuntime({
      importRepository,
      drillRepository,
      profileRepository,
      createId: (prefix: string) => `${prefix}_${nextId++}`,
      now: () => '2026-02-28T13:00:00.000Z',
    });

    fetchImpl = async (input, init) => {
        const url = new URL(String(input), 'http://localhost');
        const method = init?.method || 'GET';
        const headers = headersToObject(init?.headers);
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;

        const response = createMockResponse();
        const req = {
          method,
          headers,
          query: Object.fromEntries(url.searchParams.entries()),
          body,
        };

        if (url.pathname === '/api/drills' && method === 'GET') {
          await drillRuntime.handlers.listDrills(req, response);
        } else if (url.pathname.startsWith('/api/drills/') && method === 'GET') {
          req.query = { ...req.query, idOrSlug: decodeURIComponent(url.pathname.split('/').pop() || '') };
          await drillRuntime.handlers.getDrill(req, response);
        } else if (url.pathname === '/api/editor/drills' && method === 'POST') {
          await drillRuntime.handlers.createDrill(req, response);
        } else if (url.pathname.startsWith('/api/editor/drills/') && url.pathname.endsWith('/publish')) {
          req.query = { id: decodeURIComponent(url.pathname.split('/')[4] || '') };
          await drillRuntime.handlers.publishDrill(req, response);
        } else if (url.pathname === '/api/sessions' && method === 'POST') {
          await sessionRuntime.handlers.createSession(req, response);
        } else if (url.pathname === '/api/sessions' && method === 'GET') {
          await sessionRuntime.handlers.listSessions(req, response);
        } else if (url.pathname.startsWith('/api/sessions/') && url.pathname.endsWith('/share')) {
          req.query = { id: decodeURIComponent(url.pathname.split('/')[3] || '') };
          await sessionRuntime.handlers.shareSession(req, response);
        } else if (url.pathname.startsWith('/api/shared-sessions/')) {
          req.query = { shareId: decodeURIComponent(url.pathname.split('/').pop() || '') };
          await sessionRuntime.handlers.getSharedSession(req, response);
        } else if (url.pathname === '/api/planner/me') {
          await profileRuntime.handlers.getMe(req, response);
        } else if (url.pathname === '/api/editor/imports' && method === 'GET') {
          await importRuntime.handlers.listImportDrafts(req, response);
        } else if (url.pathname.startsWith('/api/editor/imports/') && method === 'GET') {
          req.query = { id: decodeURIComponent(url.pathname.split('/').pop() || '') };
          await importRuntime.handlers.getImportDraft(req, response);
        } else if (url.pathname.startsWith('/api/editor/imports/') && url.pathname.endsWith('/review')) {
          req.query = { id: decodeURIComponent(url.pathname.split('/')[4] || '') };
          await importRuntime.handlers.reviewImportDraft(req, response);
        } else if (url.pathname.startsWith('/api/editor/imports/') && url.pathname.endsWith('/approve')) {
          req.query = { id: decodeURIComponent(url.pathname.split('/')[4] || '') };
          await importRuntime.handlers.approveImportDraft(req, response);
        } else {
          throw new Error(`Unhandled test route: ${method} ${url.pathname}`);
        }

        return new Response(JSON.stringify(response.payload), {
          status: response.statusCode,
          headers: response.headers,
        });
      };

    client = new PlannerApiClient({
      fetchImpl,
      getIdentityHeaders: () => ({
        userId: 'editor_1',
        email: 'editor@example.com',
        role: 'editor',
        displayName: 'Editor One',
      }),
    });
  });

  it('loads planner profile permissions and session state using canonical contracts', async () => {
    const authService = new PlannerAuthService(client);
    const sessionService = new SessionPlannerService(client);
    const accessState = new PlannerAccessState();
    const plannerState = new PlannerSessionState();

    const { profile, permissions } = await authService.getCurrentPermissions();
    accessState.completeLoad(profile, permissions);

    const created = await sessionService.createSession({
      name: 'Game Day Prep',
      group: 'U14',
      date: '2026-03-05',
    });
    plannerState.completeSessionLoad(created);

    const shared = await sessionService.createShareLink(created.id);
    plannerState.completeShare(shared);

    expect(accessState.getSnapshot().permissions?.canReviewImports).toBe(true);
    expect(plannerState.getSnapshot().currentSession?.shareId).toBe('share_contract_1');
  });

  it('keeps drill catalog and import review payloads frontend-owned', async () => {
    const drillService = new DrillCatalogService(client);
    const editorService = new EditorDrillService(client);
    const importService = new ImportReviewService(client);

    const catalog = await drillService.listDrills({ query: 'Passing' });
    const reviewed = await importService.reviewDraft('import_seed_1', {
      reviewNotes: 'Ready for editor cleanup.',
    });
    const createdDrill = await editorService.createDraft({
      title: 'Native Drill',
      summary: 'Structured summary',
      description: 'Structured description',
      category: 'shooting',
      sourceType: 'native',
    });

    expect(catalog.items[0]?.slug).toBe('passing-circle');
    expect(reviewed.reviewStatus).toBe('reviewed');
    expect(createdDrill.id.startsWith('drill_')).toBe(true);
  });

  it('publishes an approved import into the coach catalog', async () => {
    const adminClient = new PlannerApiClient({
      fetchImpl,
      getIdentityHeaders: () => ({
        userId: 'admin_1',
        email: 'admin@example.com',
        role: 'admin',
        displayName: 'Admin One',
      }),
    });
    const importService = new ImportReviewService(adminClient);
    const editorService = new EditorDrillService(adminClient);
    const drillService = new DrillCatalogService(adminClient);

    const approved = await importService.approveDraft('import_seed_1', {
      reviewNotes: 'Converted after manual cleanup.',
      drill: {
        title: 'Breakout Drill Canonical',
        summary: 'Manual summary',
        description: 'Manual description',
        category: 'transition',
      },
    });

    expect(approved.status).toBe('draft');

    await editorService.publishDrill(approved.id);
    const catalog = await drillService.listDrills({ query: 'Breakout Drill Canonical' });

    expect(catalog.items).toEqual([
      expect.objectContaining({
        id: approved.id,
        title: 'Breakout Drill Canonical',
        status: 'published',
        sourceType: 'pdf-import',
      }),
    ]);
  });
});

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    end(payload: string) {
      this.payload = payload ? JSON.parse(payload) : null;
    },
  };
}
