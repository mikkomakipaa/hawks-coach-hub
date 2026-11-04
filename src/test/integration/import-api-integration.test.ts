import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { createImportRuntime } = require('../../../api/_lib/imports/runtime');
const { createInMemoryImportDraftRepository } = require('../../../api/_lib/imports/repository');
const { createInMemoryDrillRepository } = require('../../../api/_lib/drills/repository');
const { createInMemoryPlannerProfileRepository } = require('../../../api/_lib/auth/repository');

interface MockRequest {
  method: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  status: Function;
  json: Function;
  setHeader: Function;
}

describe('Import API integration', () => {
  let nextId = 1;
  let nowIndex = 0;
  let runtime: ReturnType<typeof createImportRuntime>;

  const nowValues = [
    '2026-02-28T13:00:00.000Z',
    '2026-02-28T13:05:00.000Z',
    '2026-02-28T13:10:00.000Z',
    '2026-02-28T13:15:00.000Z',
    '2026-02-28T13:20:00.000Z',
    '2026-02-28T13:25:00.000Z',
    '2026-02-28T13:30:00.000Z',
    '2026-02-28T13:35:00.000Z',
  ];

  beforeEach(() => {
    nextId = 1;
    nowIndex = 0;

    runtime = createImportRuntime({
      importRepository: createInMemoryImportDraftRepository({
        importDrafts: [
          {
            id: 'import_seed_pending',
            sourceType: 'pdf',
            sourceFileId: 'drive_file_1',
            sourceFileName: 'Breakout Drill.pdf',
            extractedTitle: 'Breakout Drill',
            extractedText: 'Players break out under pressure.',
            extractedFields: {
              summary: 'Imported summary',
              description: 'Imported description',
              category: 'transition',
              ageGroups: ['U14'],
            },
            confidence: 'medium',
            reviewStatus: 'pending',
            createdAt: '2026-02-27T13:00:00.000Z',
            updatedAt: '2026-02-27T13:00:00.000Z',
          },
        ],
      }),
      drillRepository: createInMemoryDrillRepository(),
      profileRepository: createInMemoryPlannerProfileRepository({
        profiles: [
          {
            id: 'viewer_1',
            email: 'viewer@example.com',
            role: 'viewer',
            displayName: 'Viewer',
            status: 'active',
            createdAt: '2026-02-20T09:00:00.000Z',
            updatedAt: '2026-02-20T09:00:00.000Z',
          },
          {
            id: 'editor_1',
            email: 'editor@example.com',
            role: 'editor',
            displayName: 'Editor',
            status: 'active',
            createdAt: '2026-02-20T09:00:00.000Z',
            updatedAt: '2026-02-20T09:00:00.000Z',
          },
          {
            id: 'admin_1',
            email: 'admin@example.com',
            role: 'admin',
            displayName: 'Admin',
            status: 'active',
            createdAt: '2026-02-20T09:00:00.000Z',
            updatedAt: '2026-02-20T09:00:00.000Z',
          },
        ],
      }),
      now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)],
      createId: (prefix: string) => `${prefix}_${nextId++}`,
    });
  });

  it('supports pending, reviewed, rejected, and converted import draft states', async () => {
    const created = await invoke(runtime.handlers.createImportDraft, {
      method: 'POST',
      headers: editorHeaders(),
      body: {
        sourceType: 'drive-file',
        sourceFileId: 'drive_file_2',
        sourceFileName: 'Quick Strike Notes',
        extractedTitle: 'Quick Strike',
        extractedText: 'Attack quickly after recovery.',
        extractedFields: {
          category: 'offense',
          summary: 'Fast strike',
          description: 'Detailed import text',
        },
        confidence: 'high',
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.payload).toMatchObject({
      id: 'import_draft_1',
      reviewStatus: 'pending',
    });

    const reviewed = await invoke(runtime.handlers.reviewImportDraft, {
      method: 'POST',
      query: { id: 'import_seed_pending' },
      headers: editorHeaders(),
      body: {
        reviewNotes: 'Looks usable after cleanup.',
      },
    });

    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.payload).toMatchObject({
      id: 'import_seed_pending',
      reviewStatus: 'reviewed',
      reviewedByUserId: 'editor_1',
      reviewNotes: 'Looks usable after cleanup.',
    });

    const rejected = await invoke(runtime.handlers.rejectImportDraft, {
      method: 'POST',
      query: { id: 'import_seed_pending' },
      headers: editorHeaders(),
      body: {
        reviewNotes: 'Need cleaner source extraction.',
      },
    });

    expect(rejected.statusCode).toBe(200);
    expect(rejected.payload).toMatchObject({
      id: 'import_seed_pending',
      reviewStatus: 'rejected',
      reviewNotes: 'Need cleaner source extraction.',
    });

    const reReviewed = await invoke(runtime.handlers.reviewImportDraft, {
      method: 'POST',
      query: { id: 'import_seed_pending' },
      headers: editorHeaders(),
      body: {
        reviewNotes: 'Ready for conversion.',
      },
    });

    expect(reReviewed.statusCode).toBe(200);
    expect(reReviewed.payload).toMatchObject({
      id: 'import_seed_pending',
      reviewStatus: 'reviewed',
      reviewNotes: 'Ready for conversion.',
    });

    const converted = await invoke(runtime.handlers.approveImportDraft, {
      method: 'POST',
      query: { id: 'import_seed_pending' },
      headers: adminHeaders(),
      body: {
        reviewNotes: 'Converted to canonical draft.',
        drill: {
          title: 'Breakout Drill Canonical',
        },
      },
    });

    expect(converted.statusCode).toBe(200);
    expect(converted.payload).toMatchObject({
      id: 'drill_2',
      title: 'Breakout Drill Canonical',
      status: 'draft',
      sourceType: 'pdf-import',
      sourceFileId: 'drive_file_1',
    });

    const detail = await invoke(runtime.handlers.getImportDraft, {
      method: 'GET',
      query: { id: 'import_seed_pending' },
      headers: editorHeaders(),
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.payload).toMatchObject({
      id: 'import_seed_pending',
      reviewStatus: 'converted',
      convertedDrillId: 'drill_2',
      reviewedByUserId: 'admin_1',
      reviewNotes: 'Converted to canonical draft.',
    });

    const list = await invoke(runtime.handlers.listImportDrafts, {
      method: 'GET',
      headers: editorHeaders(),
      query: { reviewStatus: 'converted' },
    });

    expect(list.statusCode).toBe(200);
    expect((list.payload as { items: Array<{ id: string }> }).items).toEqual([
      expect.objectContaining({ id: 'import_seed_pending' }),
    ]);
  });

  it('enforces editor and admin permissions for import workflows', async () => {
    const anonymous = await invoke(runtime.handlers.createImportDraft, {
      method: 'POST',
      body: {
        sourceType: 'pdf',
      },
    });

    expect(anonymous.statusCode).toBe(401);

    const viewerCreate = await invoke(runtime.handlers.createImportDraft, {
      method: 'POST',
      headers: viewerHeaders(),
      body: {
        sourceType: 'pdf',
      },
    });

    expect(viewerCreate.statusCode).toBe(403);

    const editorApprove = await invoke(runtime.handlers.approveImportDraft, {
      method: 'POST',
      query: { id: 'import_seed_pending' },
      headers: editorHeaders(),
      body: {
        drill: {
          title: 'Should Fail',
          summary: 'x',
          description: 'x',
          category: 'offense',
        },
      },
    });

    expect(editorApprove.statusCode).toBe(403);
  });
});

function viewerHeaders(): Record<string, string> {
  return {
    'x-planner-user-id': 'viewer_1',
  };
}

function editorHeaders(): Record<string, string> {
  return {
    'x-planner-user-id': 'editor_1',
  };
}

function adminHeaders(): Record<string, string> {
  return {
    'x-planner-user-id': 'admin_1',
  };
}

async function invoke(
  handler: Function,
  request: MockRequest,
) {
  const response = createMockResponse();
  await handler(
    {
      query: {},
      headers: {},
      body: undefined,
      ...request,
    },
    response,
  );

  return response;
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
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
  };
}
