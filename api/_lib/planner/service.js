const crypto = require('crypto');

const {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../drills/errors');
const { validateSessionInput } = require('./validation');

function createSessionService({
  repository,
  now = () => new Date().toISOString(),
  createId = defaultCreateId,
  createShareId = defaultCreateShareId,
} = {}) {
  return {
    async listSessions(actor) {
      const sessions = await repository.listSessionsByOwner(actor.userId);
      const items = sessions
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(toSessionSummary);

      return {
        items,
        total: items.length,
      };
    },

    async getSession(id, actor) {
      const session = await repository.getSessionById(id);
      if (!session) {
        throw new NotFoundError('Session not found.');
      }

      assertSessionAccess(session, actor);
      return session;
    },

    async createSession(input, actor) {
      const normalized = validateSessionInput(input, 'create');
      const timestamp = now();
      const detail = buildSession({
        id: createId('session'),
        name: normalized.name,
        group: normalized.group,
        date: normalized.date,
        ownerUserId: actor.userId,
        coachLabel: normalized.coachLabel || actor.displayName || actor.userId,
        targetDurationMin: normalized.targetDurationMin,
        totalDurationMin: normalized.totalDurationMin,
        status: 'draft',
        visibility: normalized.visibility || 'private',
        shareId: undefined,
        blocks: normalized.blocks || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }, createId);

      return repository.createSession(detail);
    },

    async updateSession(id, input, actor) {
      const existing = await repository.getSessionById(id);
      if (!existing) {
        throw new NotFoundError('Session not found.');
      }

      assertSessionAccess(existing, actor);
      const normalized = validateSessionInput(input, 'update');
      const timestamp = now();

      if (normalized.visibility === 'shared' && !existing.shareId) {
        throw new ConflictError('Use the share route to create a public share link.', [
          { field: 'visibility', message: 'Set shared visibility through POST /api/sessions/:id/share.' },
        ]);
      }

      const detail = buildSession({
        ...existing,
        ...normalized,
        id: existing.id,
        ownerUserId: existing.ownerUserId,
        shareId: existing.shareId,
        visibility: normalized.visibility || existing.visibility,
        createdAt: existing.createdAt,
        updatedAt: timestamp,
      }, createId, existing.blocks);

      return repository.updateSession(detail);
    },

    async shareSession(id, actor, options = {}) {
      const existing = await repository.getSessionById(id);
      if (!existing) {
        throw new NotFoundError('Session not found.');
      }

      assertSessionAccess(existing, actor);
      const timestamp = now();
      const shareId = existing.shareId && !options.regenerate
        ? existing.shareId
        : createShareId();

      const detail = {
        ...existing,
        visibility: 'shared',
        shareId,
        updatedAt: timestamp,
      };

      await repository.updateSession(detail);
      await repository.saveSessionShare({
        shareId,
        sessionId: detail.id,
        createdAt: existing.shareId === shareId ? timestamp : timestamp,
        updatedAt: timestamp,
      });

      return {
        sessionId: detail.id,
        shareId,
        visibility: detail.visibility,
        shareUrl: `/session/${shareId}`,
        updatedAt: timestamp,
      };
    },

    async getSharedSession(shareId) {
      const session = await repository.getSessionByShareId(shareId);
      if (!session || session.visibility !== 'shared' || session.shareId !== shareId) {
        throw new NotFoundError('Shared session not found.');
      }

      return {
        shareId,
        sessionId: session.id,
        session,
        canView: true,
      };
    },
  };
}

function buildSession(fields, createId, fallbackBlocks = []) {
  const rawBlocks = fields.blocks === undefined ? fallbackBlocks : fields.blocks;
  const blocks = (rawBlocks || [])
    .map((block, index) => ({
      id: block.id || createId('session_block'),
      order: block.order ?? index,
      type: block.type,
      title: block.title,
      durationMin: block.durationMin,
      drillId: block.drillId,
      notes: block.notes || '',
      attachmentIds: block.attachmentIds || [],
    }))
    .sort((left, right) => left.order - right.order);

  return {
    id: fields.id,
    name: fields.name,
    group: fields.group,
    date: fields.date,
    ownerUserId: fields.ownerUserId,
    coachLabel: fields.coachLabel,
    targetDurationMin: fields.targetDurationMin,
    totalDurationMin: fields.totalDurationMin,
    status: fields.status,
    visibility: fields.visibility,
    shareId: fields.shareId,
    blocks,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

function assertSessionAccess(session, actor) {
  if (actor.role === 'editor' || actor.role === 'admin') {
    return;
  }

  if (session.ownerUserId !== actor.userId) {
    throw new ForbiddenError('You do not have permission to access this session.');
  }
}

function toSessionSummary(session) {
  return {
    id: session.id,
    name: session.name,
    group: session.group,
    date: session.date,
    ownerUserId: session.ownerUserId,
    coachLabel: session.coachLabel,
    targetDurationMin: session.targetDurationMin,
    totalDurationMin: session.totalDurationMin,
    status: session.status,
    visibility: session.visibility,
    shareId: session.shareId,
    blockCount: (session.blocks || []).length,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function defaultCreateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function defaultCreateShareId() {
  return crypto.randomBytes(18).toString('base64url');
}

module.exports = {
  createSessionService,
  defaultCreateShareId,
};
