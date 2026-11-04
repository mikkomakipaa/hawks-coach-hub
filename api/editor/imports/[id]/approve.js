const { enforceMethod } = require('../../../_lib/imports/http');
const { createImportRuntime } = require('../../../_lib/imports/runtime');

const runtime = createImportRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['POST'])) {
    return;
  }

  return runtime.handlers.approveImportDraft(req, res);
};
