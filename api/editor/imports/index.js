const { enforceMethod } = require('../../_lib/imports/http');
const { createImportRuntime } = require('../../_lib/imports/runtime');

const runtime = createImportRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET', 'POST'])) {
    return;
  }

  if (req.method === 'GET') {
    return runtime.handlers.listImportDrafts(req, res);
  }

  return runtime.handlers.createImportDraft(req, res);
};
