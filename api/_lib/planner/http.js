const {
  ApiError,
} = require('../drills/errors');

function createSessionHttpHandlers({ service, auth }) {
  return {
    listSessions: async (req, res) => {
      const actor = await auth.requirePlanner(req, 'viewer');
      const catalog = await service.listSessions(actor);
      sendJson(res, 200, catalog);
    },

    getSession: async (req, res) => {
      const actor = await auth.requirePlanner(req, 'viewer');
      const detail = await service.getSession(req.query?.id, actor);
      sendJson(res, 200, detail);
    },

    createSession: async (req, res) => {
      const actor = await auth.requirePlanner(req, 'viewer');
      const detail = await service.createSession(req.body, actor);
      sendJson(res, 201, detail);
    },

    updateSession: async (req, res) => {
      const actor = await auth.requirePlanner(req, 'viewer');
      const detail = await service.updateSession(req.query?.id, req.body, actor);
      sendJson(res, 200, detail);
    },

    shareSession: async (req, res) => {
      const actor = await auth.requirePlanner(req, 'viewer');
      const regenerate = req.body?.regenerate === true;
      const result = await service.shareSession(req.query?.id, actor, { regenerate });
      sendJson(res, 200, result);
    },

    getSharedSession: async (req, res) => {
      const view = await service.getSharedSession(req.query?.shareId);
      sendJson(res, 200, view);
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

function enforceMethod(req, res, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    sendJson(res, 405, {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} is not allowed.`,
      },
    });
    return false;
  }

  return true;
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
  createSessionHttpHandlers,
  enforceMethod,
  withErrorHandling,
};
