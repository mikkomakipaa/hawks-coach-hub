const { createOptionalAirtablePlannerProfileRepository } = require('../auth/airtable');
const { createPlannerAuth } = require('../auth/service');
const { ApiError } = require('../drills/errors');

function createPlannerProfileRuntime(options = {}) {
  const now = options.now || (() => new Date().toISOString());
  const auth = options.auth || createPlannerAuth({
    profileRepository: options.profileRepository || createOptionalAirtablePlannerProfileRepository(options.airtable || {}),
  });

  return {
    handlers: {
      getMe: withErrorHandling(async (req, res) => {
        const actor = await auth.requirePlanner(req, 'viewer');
        sendJson(res, 200, {
          id: actor.userId,
          email: actor.email || actor.userId,
          role: actor.role,
          displayName: actor.displayName,
          status: actor.status,
          createdAt: actor.createdAt || now(),
          updatedAt: actor.updatedAt || now(),
        });
      }),
    },
  };
}

function withErrorHandling(handler) {
  return async function wrappedHandler(req, res) {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        sendJson(res, error.statusCode, {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
        return;
      }

      sendJson(res, 500, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected server error.',
        },
      });
    }
  };
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }

  if (typeof res.json === 'function') {
    res.json(payload);
    return;
  }

  res.end(JSON.stringify(payload));
}

module.exports = {
  createPlannerProfileRuntime,
};
