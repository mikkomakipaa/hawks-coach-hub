const {
  ApiError,
} = require('./errors');

function createHttpHandlers({ service, auth }) {
  return {
    listDrills: async (req, res) => {
      const includeDrafts = await auth.canIncludeDrafts(req);
      const catalog = await service.listDrills({
        includeDrafts,
        query: req.query?.query,
        category: req.query?.category,
        status: includeDrafts ? req.query?.status : 'published',
      });

      sendJson(res, 200, catalog);
    },

    getDrill: async (req, res) => {
      const includeDrafts = await auth.canIncludeDrafts(req);
      const idOrSlug = req.query?.idOrSlug;
      const detail = await service.getDrill(idOrSlug, { includeDrafts });
      sendJson(res, 200, detail);
    },

    createDrill: async (req, res) => {
      const actor = await auth.requireEditor(req);
      const detail = await service.createDrill(req.body, actor);
      sendJson(res, 201, detail);
    },

    updateDrill: async (req, res) => {
      const actor = await auth.requireEditor(req);
      const detail = await service.updateDrill(req.query?.id, req.body, actor);
      sendJson(res, 200, detail);
    },

    publishDrill: async (req, res) => {
      const actor = await auth.requireAdmin(req);
      const detail = await service.publishDrill(req.query?.id, actor);
      sendJson(res, 200, detail);
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
  createHttpHandlers,
  enforceMethod,
  withErrorHandling,
};
