const {
  ForbiddenError,
  UnauthorizedError,
} = require('../drills/errors');

const ROLE_LEVELS = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

function createPlannerAuth(options = {}) {
  const profileRepository = options.profileRepository || null;
  const allowHeaderRoleFallback = options.allowHeaderRoleFallback !== false;

  async function getActor(req, config = {}) {
    const required = config.required !== false;
    const userId = getSingleHeader(req, 'x-planner-user-id');
    const email = getSingleHeader(req, 'x-planner-email');
    const displayName = getSingleHeader(req, 'x-planner-display-name');
    const headerRole = normalizeRole(getSingleHeader(req, 'x-planner-role'));

    if (!userId && !email) {
      if (!required) {
        return null;
      }

      throw new UnauthorizedError('Planner user identity is required for this route.');
    }

    const profile = profileRepository
      ? await profileRepository.getProfile({ userId, email })
      : null;

    const role = normalizeRole(profile?.role) || (allowHeaderRoleFallback ? headerRole : null);
    if (!role) {
      throw new UnauthorizedError('Planner role is required for this route.');
    }

    const actor = {
      role,
      userId: profile?.id || userId || email,
      email: profile?.email || email || undefined,
      displayName: profile?.displayName || displayName || userId || email,
      status: profile?.status || 'active',
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt,
    };

    if (actor.status !== 'active') {
      throw new ForbiddenError('Planner profile is disabled.');
    }

    return actor;
  }

  return {
    async getOptionalActor(req) {
      try {
        return await getActor(req, { required: false });
      } catch (error) {
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
          return null;
        }
        throw error;
      }
    },

    async requirePlanner(req, minimumRole = 'viewer') {
      const actor = await getActor(req, { required: true });
      assertRole(actor.role, minimumRole);
      return actor;
    },

    async requireEditor(req) {
      return this.requirePlanner(req, 'editor');
    },

    async requireAdmin(req) {
      return this.requirePlanner(req, 'admin');
    },

    async canIncludeDrafts(req) {
      if (req.query?.includeDrafts !== 'true') {
        return false;
      }

      const actor = await this.getOptionalActor(req);
      return Boolean(actor && ROLE_LEVELS[actor.role] >= ROLE_LEVELS.editor);
    },
  };
}

function assertRole(role, minimumRole) {
  if (!(role in ROLE_LEVELS)) {
    throw new ForbiddenError();
  }

  if (ROLE_LEVELS[role] < ROLE_LEVELS[minimumRole]) {
    throw new ForbiddenError();
  }
}

function normalizeRole(role) {
  if (!role) {
    return null;
  }

  const normalized = String(role).trim().toLowerCase();
  return normalized in ROLE_LEVELS ? normalized : null;
}

function getSingleHeader(req, headerName) {
  const headerValue = req.headers?.[headerName];
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue;
}

module.exports = {
  createPlannerAuth,
};
