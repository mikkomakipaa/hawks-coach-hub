const { ApiError } = require('../drills/errors');

function createImportHttpHandlers({ service, auth }) {
  return {
    listImportDrafts: async (req, res) => {
      await auth.requireEditor(req);
      const catalog = await service.listImportDrafts({
        reviewStatus: req.query?.reviewStatus,
        sourceType: req.query?.sourceType,
      });
      sendJson(res, 200, catalog);
    },

    getImportDraft: async (req, res) => {
      await auth.requireEditor(req);
      const detail = await service.getImportDraft(req.query?.id);
      sendJson(res, 200, detail);
    },

    createImportDraft: async (req, res) => {
      await auth.requireEditor(req);
      const detail = await service.createImportDraft(req.body);
      sendJson(res, 201, detail);
    },

    reviewImportDraft: async (req, res) => {
      const actor = await auth.requireEditor(req);
      const detail = await service.reviewImportDraft(req.query?.id, req.body, actor);
      sendJson(res, 200, detail);
    },

    rejectImportDraft: async (req, res) => {
      const actor = await auth.requireEditor(req);
      const detail = await service.rejectImportDraft(req.query?.id, req.body, actor);
      sendJson(res, 200, detail);
    },

    approveImportDraft: async (req, res) => {
      const actor = await auth.requireAdmin(req);
      const detail = await service.approveImportDraft(req.query?.id, req.body, actor);
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
  createImportHttpHandlers,
  enforceMethod,
  withErrorHandling,
};
