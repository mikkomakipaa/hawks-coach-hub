import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { createDrillRuntime } = require('../../../api/_lib/drills/runtime');
const { createInMemoryDrillRepository } = require('../../../api/_lib/drills/repository');

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

describe('Drill API integration', () => {
  let nextId = 1;
  let nowIndex = 0;
  let runtime: ReturnType<typeof createDrillRuntime>;

  const nowValues = [
    '2026-02-28T10:00:00.000Z',
    '2026-02-28T10:05:00.000Z',
    '2026-02-28T10:10:00.000Z',
    '2026-02-28T10:15:00.000Z',
    '2026-02-28T10:20:00.000Z',
    '2026-02-28T10:25:00.000Z',
  ];

  beforeEach(() => {
    nextId = 1;
    nowIndex = 0;

    runtime = createDrillRuntime({
      repository: createInMemoryDrillRepository({
        drills: [
          {
            id: 'drill_published',
            slug: 'published-breakout',
            title: 'Published Breakout',
            summary: 'Published drill for coaches',
            description: 'Structured breakout drill.',
            category: 'transition',
            ageGroups: ['U14'],
            skillTags: ['passing'],
            equipment: ['cones'],
            coachingPoints: ['Keep feet moving'],
            progressionIdeas: [],
            variationIdeas: [],
            status: 'published',
            sourceType: 'native',
            attachmentIds: ['attachment_seed_1'],
            publishedAt: '2026-02-20T10:00:00.000Z',
            createdAt: '2026-02-20T09:00:00.000Z',
            updatedAt: '2026-02-20T10:00:00.000Z',
            attachments: [
              {
                id: 'attachment_seed_1',
                drillId: 'drill_published',
                type: 'image',
                title: 'Setup',
                url: 'https://example.com/setup.png',
                sortOrder: 0,
                createdAt: '2026-02-20T09:00:00.000Z',
                updatedAt: '2026-02-20T10:00:00.000Z',
              },
            ],
          },
          {
            id: 'drill_draft',
            slug: 'draft-neutral-zone',
            title: 'Draft Neutral Zone',
            summary: 'Still in review',
            description: 'Draft drill',
            category: 'neutral-zone',
            ageGroups: ['U16'],
            skillTags: ['timing'],
            equipment: [],
            coachingPoints: [],
            progressionIdeas: [],
            variationIdeas: [],
            status: 'draft',
            sourceType: 'native',
            attachmentIds: [],
            createdAt: '2026-02-21T09:00:00.000Z',
            updatedAt: '2026-02-21T10:00:00.000Z',
            attachments: [],
          },
        ],
      }),
      now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)],
      createId: (prefix: string) => `${prefix}_${nextId++}`,
    });
  });

  it('creates, updates, publishes, lists, and reads drills through canonical handlers', async () => {
    const created = await invoke(runtime.handlers.createDrill, {
      method: 'POST',
      headers: editorHeaders(),
      body: {
        title: '2v1 Hyokkays',
        summary: 'Quick attack with decision making',
        description: 'Players attack with pace and read the defender.',
        category: 'offense',
        sourceType: 'native',
        ageGroups: ['U12', 'U14'],
        coachingPoints: ['Attack with speed'],
        attachments: [
          {
            type: 'pdf',
            title: 'Diagram',
            url: 'https://example.com/diagram.pdf',
          },
        ],
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.payload).toMatchObject({
      id: 'drill_1',
      slug: '2v1-hyokkays',
      status: 'draft',
      attachmentIds: ['attachment_2'],
      primaryImageUrl: undefined,
    });

    const createdPayload = created.payload as Record<string, unknown>;

    const listBeforePublish = await invoke(runtime.handlers.listDrills, {
      method: 'GET',
      query: {},
    });
    expect(listBeforePublish.statusCode).toBe(200);
    expect((listBeforePublish.payload as { items: Array<{ id: string }> }).items.map((item) => item.id)).toEqual([
      'drill_published',
    ]);

    const listWithDrafts = await invoke(runtime.handlers.listDrills, {
      method: 'GET',
      query: { includeDrafts: 'true' },
      headers: editorHeaders(),
    });
    expect((listWithDrafts.payload as { items: Array<{ id: string }> }).items.map((item) => item.id)).toContain('drill_1');

    const update = await invoke(runtime.handlers.updateDrill, {
      method: 'PATCH',
      query: { id: String(createdPayload.id) },
      headers: editorHeaders(),
      body: {
        title: '2v1 Hyokkays Updated',
        coachingPoints: ['Attack with speed', 'Support underneath'],
        attachments: [
          {
            id: 'attachment_2',
            type: 'image',
            title: 'Updated setup',
            url: 'https://example.com/setup-updated.png',
            sortOrder: 0,
          },
        ],
      },
    });

    expect(update.statusCode).toBe(200);
    expect(update.payload).toMatchObject({
      id: 'drill_1',
      title: '2v1 Hyokkays Updated',
      attachmentIds: ['attachment_2'],
      primaryImageUrl: 'https://example.com/setup-updated.png',
    });

    const publish = await invoke(runtime.handlers.publishDrill, {
      method: 'POST',
      query: { id: String(createdPayload.id) },
      headers: adminHeaders(),
    });

    expect(publish.statusCode).toBe(200);
    expect(publish.payload).toMatchObject({
      id: 'drill_1',
      status: 'published',
      publishedAt: '2026-02-28T10:10:00.000Z',
    });

    const publicRead = await invoke(runtime.handlers.getDrill, {
      method: 'GET',
      query: { idOrSlug: '2v1-hyokkays' },
    });

    expect(publicRead.statusCode).toBe(200);
    expect(publicRead.payload).toMatchObject({
      id: 'drill_1',
      status: 'published',
      attachments: [
        {
          id: 'attachment_2',
          type: 'image',
        },
      ],
    });
  });

  it('keeps drafts hidden from anonymous coach-facing reads', async () => {
    const listResponse = await invoke(runtime.handlers.listDrills, {
      method: 'GET',
      query: { includeDrafts: 'true' },
    });

    expect(listResponse.statusCode).toBe(200);
    expect((listResponse.payload as { total: number }).total).toBe(1);

    const detailResponse = await invoke(runtime.handlers.getDrill, {
      method: 'GET',
      query: { idOrSlug: 'draft-neutral-zone', includeDrafts: 'true' },
    });

    expect(detailResponse.statusCode).toBe(404);
    expect(detailResponse.payload).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    });
  });

  it('returns predictable validation failures for invalid payloads', async () => {
    const response = await invoke(runtime.handlers.createDrill, {
      method: 'POST',
      headers: editorHeaders(),
      body: {
        title: '',
        summary: 'x',
        description: 'x',
        category: 'offense',
        sourceType: 'native',
        playerCountMin: 5,
        playerCountMax: 3,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
          expect.objectContaining({ field: 'playerCountMax' }),
        ]),
      },
    });
  });

  it('rejects invalid status transitions and unauthorized writes', async () => {
    const unauthorized = await invoke(runtime.handlers.createDrill, {
      method: 'POST',
      body: {
        title: 'No auth',
        summary: 'x',
        description: 'x',
        category: 'offense',
        sourceType: 'native',
      },
    });

    expect(unauthorized.statusCode).toBe(401);

    const forbiddenPublish = await invoke(runtime.handlers.publishDrill, {
      method: 'POST',
      query: { id: 'drill_draft' },
      headers: editorHeaders(),
    });

    expect(forbiddenPublish.statusCode).toBe(403);

    const transition = await invoke(runtime.handlers.updateDrill, {
      method: 'PATCH',
      query: { id: 'drill_draft' },
      headers: editorHeaders(),
      body: {
        status: 'published',
      },
    });

    expect(transition.statusCode).toBe(409);
    expect(transition.payload).toMatchObject({
      error: {
        code: 'CONFLICT',
        details: [
          {
            field: 'status',
            message: 'Use the publish route for draft to published transitions.',
          },
        ],
      },
    });
  });
});

function editorHeaders(): Record<string, string> {
  return {
    'x-planner-role': 'editor',
    'x-planner-user-id': 'user_editor_1',
  };
}

function adminHeaders(): Record<string, string> {
  return {
    'x-planner-role': 'admin',
    'x-planner-user-id': 'user_admin_1',
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
