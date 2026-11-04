const { NotFoundError } = require('../drills/errors');

function createInMemorySessionRepository(seed = {}) {
  const sessions = new Map();
  const shares = new Map();

  for (const session of seed.sessions || []) {
    sessions.set(session.id, cloneSession(session));
    if (session.shareId) {
      shares.set(session.shareId, {
        shareId: session.shareId,
        sessionId: session.id,
        createdAt: session.updatedAt,
        updatedAt: session.updatedAt,
      });
    }
  }

  for (const share of seed.shares || []) {
    shares.set(share.shareId, { ...share });
  }

  return {
    async listSessionsByOwner(ownerUserId) {
      return Array.from(sessions.values())
        .filter((session) => session.ownerUserId === ownerUserId)
        .map(cloneSession);
    },

    async getSessionById(id) {
      const session = sessions.get(id);
      return session ? cloneSession(session) : null;
    },

    async getSessionByShareId(shareId) {
      const share = shares.get(shareId);
      if (!share) {
        return null;
      }

      const session = sessions.get(share.sessionId);
      return session ? cloneSession(session) : null;
    },

    async createSession(session) {
      sessions.set(session.id, cloneSession(session));
      return cloneSession(session);
    },

    async updateSession(session) {
      if (!sessions.has(session.id)) {
        throw new NotFoundError('Session not found.');
      }

      sessions.set(session.id, cloneSession(session));
      return cloneSession(session);
    },

    async saveSessionShare(share) {
      const session = sessions.get(share.sessionId);
      if (!session) {
        throw new NotFoundError('Session not found.');
      }

      for (const [existingShareId, existingShare] of shares.entries()) {
        if (existingShare.sessionId === share.sessionId && existingShareId !== share.shareId) {
          shares.delete(existingShareId);
        }
      }

      shares.set(share.shareId, { ...share });
      return { ...share };
    },
  };
}

function cloneSession(session) {
  return {
    ...session,
    blocks: (session.blocks || []).map((block) => ({ ...block })),
  };
}

module.exports = {
  createInMemorySessionRepository,
};
