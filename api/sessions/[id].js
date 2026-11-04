const { enforceMethod } = require('../_lib/planner/http');
const { createSessionRuntime } = require('../_lib/planner/runtime');

const runtime = createSessionRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET', 'PATCH'])) {
    return;
  }

  if (req.method === 'GET') {
    return runtime.handlers.getSession(req, res);
  }

  return runtime.handlers.updateSession(req, res);
};
