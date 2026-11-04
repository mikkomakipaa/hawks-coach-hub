const { enforceMethod } = require('../_lib/planner/http');
const { createSessionRuntime } = require('../_lib/planner/runtime');

const runtime = createSessionRuntime();

module.exports = async function handler(req, res) {
  if (!enforceMethod(req, res, ['GET'])) {
    return;
  }

  return runtime.handlers.getSharedSession(req, res);
};
