const { enforceMethod } = require('../_lib/planner/http');
const { createSessionRuntime } = require('../_lib/planner/runtime');

const runtime = createSessionRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET', 'POST'])) {
    return;
  }

  if (req.method === 'GET') {
    return runtime.handlers.listSessions(req, res);
  }

  return runtime.handlers.createSession(req, res);
};
