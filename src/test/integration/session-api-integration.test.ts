import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { createSessionRuntime } = require('../../../api/_lib/planner/runtime');
const { createInMemorySessionRepository } = require('../../../api/_lib/planner/repository');

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

describe('Session API integration', () => {
  let nextId = 1;
  let nowIndex = 0;
  let runtime: ReturnType<typeof createSessionRuntime>;

  const nowValues = [
    '2026-02-28T12:00:00.000Z',
    '2026-02-28T12:05:00.000Z',
    '2026-02-28T12:10:00.000Z',
    '2026-02-28T12:15:00.000Z',
    '2026-02-28T12:20:00.000Z',
    '2026-02-28T12:25:00.000Z',
  ];

  beforeEach(() => {
    nextId = 1;
    nowIndex = 0;

    runtime = createSessionRuntime({
      repository: createInMemorySessionRepository({
        sessions: [
          {
            id: 'session_seed_owner',
            name: 'Monday Skill Session',
            group: 'U14',
            date: '2026-03-01',
            ownerUserId: 'coach_owner',
            coachLabel: 'Coach Owner',
            targetDurationMin: 60,
            totalDurationMin: 55,
            status: 'draft',
            visibility: 'private',
            blocks: [
              {
                id: 'session_block_seed_1',
                order: 0,
                type: 'warmup',
                title: 'Warmup Circle',
                durationMin: 10,
                notes: 'Keep the pace high',
                attachmentIds: [],
              },
            ],
            createdAt: '2026-02-25T10:00:00.000Z',
            updatedAt: '2026-02-25T10:10:00.000Z',
          },
          {
            id: 'session_seed_other',
            name: 'Other Coach Session',
            group: 'U16',
            date: '2026-03-02',
            ownerUserId: 'coach_other',
            coachLabel: 'Coach Other',
            targetDurationMin: 75,
            totalDurationMin: 70,
            status: 'draft',
            visibility: 'shared',
            shareId: 'seedShareToken1234567890',
            blocks: [],
            createdAt: '2026-02-24T10:00:00.000Z',
            updatedAt: '2026-02-24T10:10:00.000Z',
          },
        ],
      }),
      now: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)],
      createId: (prefix: string) => `${prefix}_${nextId++}`,
    });
  });

  it('creates, updates, reopens, lists, and shares sessions through canonical handlers', async () => {
    const created = await invoke(runtime.handlers.createSession, {
      method: 'POST',
      headers: ownerHeaders(),
      body: {
        name: 'Game Day Prep',
        group: 'U14',
        date: '2026-03-05',
        targetDurationMin: 75,
        blocks: [
          {
            type: 'drill',
            title: '2v1 Entries',
            durationMin: 15,
            drillId: 'drill_123',
            notes: 'Focus on timing',
          },
        ],
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.payload).toMatchObject({
      id: 'session_1',
      ownerUserId: 'coach_owner',
      coachLabel: 'Coach Owner',
      visibility: 'private',
      status: 'draft',
      blocks: [
        {
          id: 'session_block_2',
          type: 'drill',
        },
      ],
    });

    const createdPayload = created.payload as Record<string, unknown>;

    const updated = await invoke(runtime.handlers.updateSession, {
      method: 'PATCH',
      query: { id: String(createdPayload.id) },
      headers: ownerHeaders(),
      body: {
        totalDurationMin: 80,
        blocks: [
          {
            id: 'session_block_2',
            order: 0,
            type: 'warmup',
            title: 'Activation',
            durationMin: 10,
            notes: 'Short touches',
          },
          {
            type: 'game',
            title: 'Small Area Game',
            durationMin: 20,
            notes: 'Compete',
          },
        ],
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.payload).toMatchObject({
      id: 'session_1',
      totalDurationMin: 80,
      blocks: [
        {
          id: 'session_block_2',
          title: 'Activation',
        },
        {
          id: 'session_block_3',
          title: 'Small Area Game',
        },
      ],
    });

    const reopened = await invoke(runtime.handlers.getSession, {
      method: 'GET',
      query: { id: 'session_1' },
      headers: ownerHeaders(),
    });

    expect(reopened.statusCode).toBe(200);
    expect(reopened.payload).toMatchObject({
      id: 'session_1',
      blocks: [
        {
          id: 'session_block_2',
        },
        {
          id: 'session_block_3',
        },
      ],
    });

    const list = await invoke(runtime.handlers.listSessions, {
      method: 'GET',
      headers: ownerHeaders(),
    });

    expect(list.statusCode).toBe(200);
    expect((list.payload as { items: Array<{ id: string }> }).items.map((item) => item.id)).toEqual([
      'session_1',
      'session_seed_owner',
    ]);

    const share = await invoke(runtime.handlers.shareSession, {
      method: 'POST',
      query: { id: 'session_1' },
      headers: ownerHeaders(),
      body: {},
    });

    expect(share.statusCode).toBe(200);
    expect(share.payload).toMatchObject({
      sessionId: 'session_1',
      visibility: 'shared',
      shareUrl: expect.stringMatching(/^\/session\//),
    });

    const sharePayload = share.payload as { shareId: string };
    expect(sharePayload.shareId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(sharePayload.shareId).not.toContain('session_1');

    const sharedRead = await invoke(runtime.handlers.getSharedSession, {
      method: 'GET',
      query: { shareId: sharePayload.shareId },
    });

    expect(sharedRead.statusCode).toBe(200);
    expect(sharedRead.payload).toMatchObject({
      shareId: sharePayload.shareId,
      sessionId: 'session_1',
      canView: true,
      session: {
        id: 'session_1',
        visibility: 'shared',
      },
    });
  });

  it('limits editable session reads to the owner or elevated roles while keeping shared reads anonymous', async () => {
    const list = await invoke(runtime.handlers.listSessions, {
      method: 'GET',
      headers: otherViewerHeaders(),
    });

    expect(list.statusCode).toBe(200);
    expect((list.payload as { items: Array<{ id: string }> }).items).toHaveLength(1);

    const forbidden = await invoke(runtime.handlers.getSession, {
      method: 'GET',
      query: { id: 'session_seed_owner' },
      headers: otherViewerHeaders(),
    });

    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.payload).toMatchObject({
      error: {
        code: 'FORBIDDEN',
      },
    });

    const sharedRead = await invoke(runtime.handlers.getSharedSession, {
      method: 'GET',
      query: { shareId: 'seedShareToken1234567890' },
    });

    expect(sharedRead.statusCode).toBe(200);
    expect(sharedRead.payload).toMatchObject({
      shareId: 'seedShareToken1234567890',
      sessionId: 'session_seed_other',
    });
  });

  it('returns predictable auth and validation failures for session persistence flows', async () => {
    const unauthorized = await invoke(runtime.handlers.listSessions, {
      method: 'GET',
    });

    expect(unauthorized.statusCode).toBe(401);

    const invalid = await invoke(runtime.handlers.createSession, {
      method: 'POST',
      headers: ownerHeaders(),
      body: {
        name: '',
        group: 'U14',
        date: '2026-03-05',
        blocks: [
          {
            type: 'drill',
            title: '',
            durationMin: -1,
          },
        ],
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.payload).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'blocks[0].title' }),
          expect.objectContaining({ field: 'blocks[0].durationMin' }),
        ]),
      },
    });
  });
});

function ownerHeaders(): Record<string, string> {
  return {
    'x-planner-role': 'viewer',
    'x-planner-user-id': 'coach_owner',
    'x-planner-display-name': 'Coach Owner',
  };
}

function otherViewerHeaders(): Record<string, string> {
  return {
    'x-planner-role': 'viewer',
    'x-planner-user-id': 'coach_other',
    'x-planner-display-name': 'Coach Other',
  };
}

async function invoke(handler: Function, request: MockRequest) {
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
